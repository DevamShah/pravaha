---
tags:
  - archeon
  - forgeon
  - product
  - product-doc
  - product-pravaha
---

# Pravaha — High-Level Design v1.0

**Date:** 2026-03-30
**Author:** Rachnika (Architect) | Reviewed: Tantron (CTO)
**Status:** APPROVED (internal MCA)

---

## 1. System Overview

Pravaha is a three-tier web application with a multi-source data ingestion layer.

```
┌────────────────────────────────────────────────────────────┐
│                      TIER 1: FRONTEND                       │
│                    Next.js 15 (App Router)                   │
│              SSR + Client Components + WebSocket             │
│                    Port: 3000                                │
└────────────────────────┬───────────────────────────────────┘
                         │ HTTP + WebSocket
┌────────────────────────▼───────────────────────────────────┐
│                      TIER 2: API                            │
│                  Node.js + Fastify                           │
│         REST API + WebSocket Server + Background Jobs        │
│                    Port: 4000                                │
│                                                             │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │ Route Layer  │  │ Source Router │  │ WebSocket Manager │  │
│  │ /api/*       │  │ Circuit Break│  │ Live Refresh      │  │
│  └─────────────┘  └──────────────┘  └───────────────────┘  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              DATA SOURCE ADAPTERS                    │   │
│  │  ┌──────────┐ ┌───────────┐ ┌────────────────────┐  │   │
│  │  │ FixTweet │ │ Playwright│ │ Syndication API     │  │   │
│  │  │ Adapter  │ │ Adapter   │ │ Adapter             │  │   │
│  │  └──────────┘ └───────────┘ └────────────────────┘  │   │
│  └─────────────────────────────────────────────────────┘   │
└──────────┬──────────────────────┬──────────────────────────┘
           │                      │
┌──────────▼──────────┐  ┌───────▼────────────┐
│   TIER 3a: CACHE    │  │  TIER 3b: DATABASE  │
│   Redis 7 / Valkey  │  │   PostgreSQL 16     │
│   Port: 6379        │  │   Port: 5432        │
│   - Hot cache (5m)  │  │   - Tweet store     │
│   - Warm cache (60m)│  │   - User profiles   │
│   - Watch sets      │  │   - Source health    │
│   - Pub/Sub for WS  │  │                     │
└─────────────────────┘  └─────────────────────┘
```

## 2. Service Boundaries

| Service | Responsibility | Port | Container |
|---------|---------------|------|-----------|
| `pravaha-web` | Frontend (Next.js SSR + client) | 3000 | Node 22 Alpine |
| `pravaha-api` | REST API + WebSocket + background jobs | 4000 | Node 22 Alpine |
| `pravaha-redis` | Caching + pub/sub | 6379 | Redis 7 Alpine |
| `pravaha-db` | Persistent storage | 5432 | PostgreSQL 16 Alpine |

## 3. Data Source Router — Circuit Breaker Design

```
Request → Check Redis Cache
            ├─ HIT (fresh <5min) → Return
            ├─ HIT (warm 5-60min) → Return + trigger background refresh
            └─ MISS → Source Router
                       ├─ Source healthy? → Try source (with timeout)
                       │   ├─ Success → Cache + Return
                       │   └─ Failure → Increment failure counter
                       │       └─ 3 consecutive failures → Mark UNHEALTHY (5-15 min cooldown)
                       └─ Source unhealthy? → Skip, try next priority

                       Priority order:
                       1. FixTweet (fastest, tweets + profiles)
                       2. Playwright (fullest, timelines + search)
                       3. Syndication (fallback, individual tweets)
                       4. Stale PostgreSQL (always available)
```

## 4. Caching Strategy

| Layer | TTL | Use Case |
|-------|-----|----------|
| Redis Hot | 5 min | Active timelines being viewed |
| Redis Warm | 60 min | Recently viewed timelines |
| PostgreSQL Stale | 24h | Last resort when all sources down |
| Browser (SWR) | 30s | Client-side stale-while-revalidate |

Cache keys:
- `timeline:{handle}:{page}` → Tweet[] JSON
- `tweet:{id}` → Tweet JSON
- `user:{handle}` → User JSON
- `search:{query}:{page}` → Tweet[] JSON
- `health:{source}` → SourceHealth JSON

## 5. WebSocket Architecture

```
Client connects → /ws?channels=timeline:elonmusk,timeline:naval
Server adds client to channel sets in Redis
Background worker polls active channels every 2-5 min
New tweets found → Redis PUBLISH → WS server → Push to subscribed clients
Client disconnects → Remove from channel sets
No subscribers for channel → Remove from active poll set
```

## 6. API Design

### REST Endpoints

| Method | Path | Description | Cache |
|--------|------|-------------|-------|
| GET | `/api/timeline/:handle` | User's tweets (paginated) | 5 min |
| GET | `/api/tweet/:id` | Single tweet + thread | 60 min |
| GET | `/api/user/:handle` | User profile | 60 min |
| GET | `/api/search?q=&filter=` | Search tweets | 5 min |
| GET | `/api/trending` | Trending topics/tweets | 15 min |
| GET | `/api/health` | Source health status | 10s |

### WebSocket Events

| Event | Direction | Payload |
|-------|-----------|---------|
| `subscribe` | Client→Server | `{ channels: string[] }` |
| `unsubscribe` | Client→Server | `{ channels: string[] }` |
| `new_tweets` | Server→Client | `{ channel: string, tweets: Tweet[] }` |
| `source_health` | Server→Client | `{ sources: SourceHealth[] }` |

## 7. Failure Modes

| Scenario | Behavior |
|----------|----------|
| All data sources down | Serve stale cache + "delayed" badge |
| Redis down | Fall through to PostgreSQL for reads; bypass cache for writes |
| PostgreSQL down | Serve from Redis only; no persistence (acceptable for test) |
| Single source flapping | Circuit breaker isolates it; other sources handle load |
| High latency source | 5s timeout per source; skip slow source, try next |

## 8. Security Architecture

- **No user accounts** in MVP — no auth needed
- **Input sanitization** — DOMPurify on all tweet HTML
- **Media proxying** — all images/videos served through backend to prevent IP leaking
- **Rate limiting** — 60 req/min per IP at API gateway
- **CORS** — whitelist frontend origin only
- **CSP headers** — strict content security policy
- **No PII stored** — only public tweet data cached

## 9. Deployment Architecture (Docker Compose)

```yaml
services:
  web:      # Next.js frontend
  api:      # Fastify backend
  redis:    # Cache + pub/sub
  db:       # PostgreSQL
  # Future: playwright worker pool as separate service
```

Single `docker compose up` = fully working system.

---

*HLD approved. Proceeding to Sprint Planning.*
