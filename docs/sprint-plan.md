---
tags:
  - archeon
  - forgeon
  - product
  - product-doc
  - product-pravaha
---

# Pravaha — Sprint Plan

**Date:** 2026-03-30
**Author:** Yojika (Sprint Planner) | Reviewed: Tantron (CTO), Darshika (CPO)

---

## Sprint 0: Foundation (Current)

**Goal:** Runnable skeleton — `docker compose up` gives you a working frontend + backend + Redis + PostgreSQL with one placeholder endpoint.

| # | Task | Owner | Acceptance Criteria |
|---|------|-------|-------------------|
| S0-1 | Initialize Next.js 15 project (App Router, Tailwind 4, TypeScript) | Nirmitya | `npm run dev` works, renders landing page |
| S0-2 | Initialize Fastify backend (TypeScript, structured project layout) | Nirmitya | `npm run dev` starts server on :4000, `/api/health` returns 200 |
| S0-3 | Docker Compose with all 4 services | Prasaron | `docker compose up` boots all services, healthchecks pass |
| S0-4 | PostgreSQL schema + Drizzle ORM setup | Nirmitya | Migrations run, tables created (tweets, users, source_health) |
| S0-5 | Redis connection + basic cache utility | Nirmitya | Can set/get/expire keys from API service |
| S0-6 | Base UI layout: shell, header, nav, theme toggle (navy dark) | Drishyon | Premium layout renders, theme switching works |

**Definition of Done:** `docker compose up` → browser at :3000 shows styled landing page, API at :4000/api/health returns source status.

---

## Sprint 1: Data Pipeline + Timeline

**Goal:** View a real public user's timeline by navigating to `/@username`.

| # | Task | Owner | Acceptance Criteria |
|---|------|-------|-------------------|
| S1-1 | Data Source Router with circuit breaker pattern | Nirmitya | Routes requests through priority sources, tracks health, auto-skips unhealthy |
| S1-2 | FixTweet adapter — fetch tweets + user profiles | Nirmitya | Returns normalized Tweet[] and User objects from FixTweet API |
| S1-3 | Syndication API adapter — fetch individual tweets | Nirmitya | Returns normalized Tweet from syndication endpoint |
| S1-4 | Playwright adapter — scrape user timeline | Nirmitya | Returns normalized Tweet[] from headless browser scrape |
| S1-5 | Redis caching integration in router | Nirmitya | Cache HIT returns in <50ms, MISS fetches + caches |
| S1-6 | PostgreSQL persistence (stale fallback) | Nirmitya | Tweets persisted, served when all sources fail |
| S1-7 | `/api/timeline/:handle` endpoint | Nirmitya | Returns paginated tweets for any public user |
| S1-8 | `/api/user/:handle` endpoint | Nirmitya | Returns user profile data |
| S1-9 | Timeline page UI (`/@handle`) | Drishyon | Profile header + tweet feed renders, infinite scroll, loading skeletons |
| S1-10 | Tweet card component | Drishyon | Shows author, text, media, metrics, timestamp, quoted tweets |

**Definition of Done:** Navigate to `/@elonmusk` → see real tweets with real-time data, premium UI.

---

## Sprint 2: Tweet Detail + Search + Real-Time

**Goal:** Full tweet views, search, and live WebSocket refresh.

| # | Task | Owner | Acceptance Criteria |
|---|------|-------|-------------------|
| S2-1 | `/api/tweet/:id` endpoint with thread detection | Nirmitya | Returns tweet + parent chain + replies |
| S2-2 | `/api/search` endpoint | Nirmitya | Returns tweets matching keyword query |
| S2-3 | WebSocket server + pub/sub for live refresh | Nirmitya | Clients subscribe to timelines, receive new tweet pushes |
| S2-4 | Background poller for watched timelines | Nirmitya | Polls active timelines every 2-5 min, publishes new tweets |
| S2-5 | Tweet detail page UI | Drishyon | Full tweet + thread + media viewer |
| S2-6 | Search page UI | Drishyon | Search bar, results with filters, highlighted matches |
| S2-7 | Live refresh UI (new tweets slide in) | Drishyon | "N new tweets" indicator, click to show, smooth animation |
| S2-8 | Source health dashboard (footer) | Drishyon | Green/yellow/red indicators per source |
| S2-9 | Landing page with trending + search entry | Drishyon | Home page with search, browse @username input, top tweets |

**Definition of Done:** Full browse/search/real-time flow works end-to-end.

---

## Sprint 3: Polish + QA

**Goal:** Production-quality UI, mobile responsive, keyboard nav, full QA pass.

| # | Task | Owner | Acceptance Criteria |
|---|------|-------|-------------------|
| S3-1 | Mobile responsive pass (all pages) | Drishyon | Every page looks premium on mobile |
| S3-2 | Keyboard navigation (j/k/o/b) | Drishyon | Navigate, open, bookmark with keyboard |
| S3-3 | Error states + empty states | Drishyon | Graceful handling everywhere |
| S3-4 | Loading performance optimization | Nirmitya | Lighthouse >90 performance score |
| S3-5 | Security hardening (CSP, sanitization, rate limiting) | Rakshon | OWASP Top 10 addressed |
| S3-6 | Full QA pass — Stage A (checklist) | Samikshon | Every feature tested against PRD |
| S3-7 | Full QA pass — Stage B (dynamic scenarios) | Parikshika | Edge cases, failure modes tested |

**Definition of Done:** Release-ready product. Gate 5 presentation.

---

## Execution Order

Sprint 0 → Sprint 1 → Sprint 2 → Sprint 3 → Gate 5

One agent at a time for frontend (per process rules). Backend can proceed in parallel with frontend where independent.

---

*Sprint plan approved. Beginning Sprint 0 execution.*
