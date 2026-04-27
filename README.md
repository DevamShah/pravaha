---
tags:
  - archeon
  - forgeon
  - product
  - product-pravaha
---

# Pravaha

**View any public tweet. No login. No tracking. No API key.**

Pravaha (Sanskrit: "continuous stream") is a self-hosted web app that lets you browse public Twitter/X content — user timelines, individual tweets, trending topics, and news — without logging into X, without paying for API access, and without relying on Nitter.

If Nitter is dead for you, download this and run it on your machine.

![License](https://img.shields.io/badge/license-MIT-blue)

---

## Why Pravaha?

- **Nitter is dying** — requires real account tokens since 2025, intermittent outages, domain expires May 2026
- **X forces login** — can't browse tweets without signing up
- **X API is paywalled** — $100/month for basic read access
- **Pravaha is free** — runs on your machine, uses Twitter's public guest token API

## Features

### Core
- **User Timelines** — browse any public account's tweets with real engagement data (likes, retweets, views)
- **Individual Tweets** — view any tweet by ID with full thread context
- **User Profiles** — avatars, bios, follower counts, banners

### Discovery
- **Trending Topics** — real-time worldwide trends from Twitter (50 topics, 10 locations)
- **News Feed** — aggregated feed from 20+ curated news and tech accounts
- **Popular Tweets** — most-liked tweets across all accounts you've browsed
- **Search** — full-text search across all cached tweets in your local database

### Technical
- **Multi-source failover** — Twitter Guest API → FxTwitter → Syndication API → local cache
- **Circuit breaker** — automatically skips unhealthy sources, retries after cooldown
- **Redis caching** — sub-10ms responses for cached data
- **PostgreSQL persistence** — tweets survive restarts, search index grows as you browse
- **Auto-refresh** — timelines poll for new tweets every 2 minutes
- **Source health dashboard** — see which data sources are up/down in real-time

### UI/UX
- **Dark navy theme** (Stripe-inspired) + light mode toggle
- **Keyboard navigation** — `j`/`k` to navigate, `o` to open, `/` to search, `?` for help
- **Framer Motion animations** — smooth transitions, slide-in tweets, skeleton loaders
- **Mobile responsive** — works on all screen sizes
- **Zero tracking** — no analytics, no cookies, no user data stored

## Screenshots

| Landing Page | Timeline | Trending |
|:---:|:---:|:---:|
| Dark navy theme with search, featured accounts, trending preview | Real tweets with avatars, metrics, media | 50 real-time trending topics by location |

## Quick Start

### Prerequisites
- [Docker](https://docs.docker.com/get-docker/) and Docker Compose
- OR [Node.js 22+](https://nodejs.org/) with Redis and PostgreSQL running locally

### Option 1: Docker (recommended)

```bash
git clone https://github.com/anthropics/pravaha.git
cd pravaha
docker compose up --build
```

Open http://localhost:3000

That's it. The app handles everything — database migrations, Redis, the API, and the frontend.

### Option 2: Local Development

**1. Start Redis and PostgreSQL:**

```bash
# Using Docker for just the databases
docker run -d --name pravaha-redis -p 6379:6379 redis:7-alpine
docker run -d --name pravaha-db -p 5432:5432 \
  -e POSTGRES_USER=pravaha -e POSTGRES_PASSWORD=pravaha -e POSTGRES_DB=pravaha \
  postgres:16-alpine
```

**2. Set up the API:**

```bash
cd api
npm install
cp .env.example .env  # or use defaults
npm run db:generate
npm run db:migrate
npm run dev
```

**3. Set up the frontend:**

```bash
cd web
npm install
npm run dev
```

Open http://localhost:3000 (frontend) and http://localhost:4000 (API).

## Architecture

```
User Browser
     |
     v
 [Next.js Frontend :3000]
     |
     v
 [Fastify API :4000]
     |
     +---> Twitter Guest API (primary — timelines, tweets, profiles, trends)
     +---> FxTwitter API (fallback — profiles, individual tweets)
     +---> Syndication API (emergency — individual tweets only)
     +---> PostgreSQL (stale cache — always available)
     |
     +---> Redis (hot cache, 5-min TTL)
     +---> PostgreSQL (persistent storage, search index)
```

### Data Source Priority

| Source | Capabilities | Reliability |
|--------|-------------|-------------|
| **Twitter Guest API** | Timelines, tweets, profiles, trends | High (guest token + GraphQL) |
| **FxTwitter** | Profiles, individual tweets | Medium (no timelines) |
| **Syndication API** | Individual tweets | Low (rate-limited from datacenter IPs) |
| **Local PostgreSQL** | Everything previously fetched | Always available |

The circuit breaker automatically marks sources as unhealthy after 3 consecutive failures and retries after a 5-minute cooldown.

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/timeline/:handle` | User's tweets (paginated) |
| GET | `/api/tweet/:id` | Single tweet with thread |
| GET | `/api/user/:handle` | User profile |
| GET | `/api/trends?location=worldwide` | 50 trending topics |
| GET | `/api/discover/news?category=all` | Curated news feed |
| GET | `/api/discover/popular?limit=30` | Most-liked cached tweets |
| GET | `/api/discover/search?q=query` | Search cached tweets |
| GET | `/api/health` | Data source health status |

### Locations for Trends

`worldwide`, `us`, `uk`, `india`, `canada`, `australia`, `japan`, `germany`, `france`, `brazil`

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, Tailwind CSS 4, Framer Motion, Zustand |
| Backend | Node.js, Fastify, TypeScript |
| Database | PostgreSQL 16 (Drizzle ORM) |
| Cache | Redis 7 |
| Containers | Docker Compose |

## How It Works

Pravaha uses Twitter's **public guest token** mechanism — the same system that powers tweet embeds across the web. This is not scraping; it's using the same public API that Twitter's own embed widgets use.

1. **Guest token**: POST to Twitter's activation endpoint with the public bearer token (embedded in Twitter's web app JavaScript — not a secret)
2. **GraphQL API**: Use the guest token to query Twitter's GraphQL endpoints for user data, timelines, and trends
3. **Caching**: Responses are cached in Redis (5-min hot, 60-min warm) and persisted in PostgreSQL
4. **Failover**: If the primary source fails, the router tries secondary sources, then serves stale cache

### Legal

Accessing public data through Twitter's guest token API is legally defensible in the US per court precedent:
- **hiQ v. LinkedIn (2022)**: Scraping public data does not violate the Computer Fraud and Abuse Act
- **X v. Bright Data (2024)**: X lost — court ruled public data access is permissible

Pravaha only displays publicly available tweets. No private data is accessed, no authentication is bypassed, and no rate limits are violated.

## Configuration

The API reads configuration from environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `4000` | API server port |
| `DATABASE_URL` | `postgres://pravaha:pravaha@localhost:5432/pravaha` | PostgreSQL connection |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection |
| `CACHE_HOT_TTL` | `300` | Hot cache TTL in seconds |
| `CACHE_WARM_TTL` | `3600` | Warm cache TTL in seconds |
| `RATE_LIMIT_MAX` | `60` | Max requests per minute per IP |

## Known Limitations

1. **Search is local-only** — Twitter's SearchTimeline endpoint is blocked for guest tokens. Pravaha searches across tweets you've already browsed (stored in PostgreSQL). The index grows as you use the app.

2. **Guest token rate limits** — Twitter allows ~150 requests per 15-minute window per guest token. Pravaha's caching layer means you'll rarely hit this in normal use.

3. **Query IDs rotate** — Twitter changes GraphQL query IDs every 2-4 weeks. If timelines stop working, the query IDs in `api/src/adapters/twitter-guest.ts` need updating. Check [twitter-openapi](https://github.com/fa0311/twitter-openapi) for current IDs.

4. **No DMs, no private accounts** — Pravaha only accesses public data. Private accounts and direct messages are not and will never be supported.

## Contributing

Pull requests welcome. If you find that query IDs have rotated, please open a PR with the updated IDs.

## License

MIT
