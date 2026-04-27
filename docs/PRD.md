---
tags:
  - archeon
  - forgeon
  - product
  - product-doc
  - product-pravaha
---

# Pravaha — Product Requirements Document v1.0

**Product:** Pravaha
**Etymology:** Sanskrit "प्रवाह" — continuous stream, uninterrupted flow
**Version:** 1.0.0
**Date:** 2026-03-30
**Owner:** Darshika (CPO) | Reviewed by: Tantron (CTO), Vartika (Strategy)
**Status:** AWAITING DEVAM REVIEW (Gate 2)

---

## 1. Executive Summary

Pravaha is a web-based application that lets anyone view public X/Twitter content — user timelines, individual tweets, threads, and search results — in real-time, without logging into X, without paying for API access, and without depending on Nitter or any single fragile data source.

**Core innovation:** Multi-source failover architecture that automatically switches between data providers, ensuring high availability even when individual sources break. Combined with aggressive caching and a premium UI that makes Nitter look like a relic.

**Target launch:** MVP with core timeline + search + real-time refresh.

---

## 2. Problem Analysis

### The Problem
X/Twitter has systematically locked down access to public content:
1. **Login wall:** x.com forces sign-up/login for most browsing
2. **API paywalled:** Free tier is read-useless. Basic tier is $100/month for 10K reads
3. **Nitter dying:** Requires real account tokens since 2025, intermittent outages, domain expires May 2026
4. **No reliable alternative exists** that combines timelines + search + reliability

### Who Suffers
- **Researchers/journalists** who need to monitor public discourse without a personal account
- **Privacy-conscious users** who refuse to create X accounts (data collection, algorithmic profiling)
- **OSINT analysts** who need clean, untracked access to public tweets
- **Social media managers** who monitor competitors without logging in
- **Casual users** who just want to read a tweet someone linked without signing up

### Market Evidence
- Nitter at peak: 10M+ monthly users across instances
- r/nitter subreddit: constant complaints about outages, demand for alternatives
- "view tweets without login" — consistently high search volume
- X v. Bright Data ruling (2024): legal precedent confirms public data scraping is permissible

---

## 3. Target Personas

### Persona 1: The Researcher (Primary)
- **Role:** Journalist, academic researcher, OSINT analyst
- **Need:** Monitor public figures' tweets, search specific topics, export data
- **Pain:** Can't use X without an account; doesn't want algorithmic feed; needs clean data
- **Key features:** Search, timeline view, export, feed builder

### Persona 2: The Privacy User (Primary)
- **Role:** Tech-savvy individual who avoids social media accounts
- **Need:** Read tweets people share with them, browse trending topics
- **Pain:** X forces login, Nitter is unreliable
- **Key features:** Timeline view, thread unrolling, no tracking

### Persona 3: The Monitor (Secondary)
- **Role:** Social media manager, brand monitor, competitive intelligence
- **Need:** Track what competitors/industry leaders are tweeting
- **Pain:** Doesn't want to use personal X account for work monitoring
- **Key features:** Feed builder, alerts, compare view

---

## 4. Product Architecture Overview

### 4.1 System Architecture

```
┌─────────────────────────────────────────────────────┐
│                    FRONTEND                          │
│          Next.js 15 + Tailwind + Framer Motion       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│  │ Timeline  │ │  Search  │ │  Profile │            │
│  │   View    │ │   View   │ │   View   │            │
│  └──────────┘ └──────────┘ └──────────┘            │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│  │  Thread   │ │   Feed   │ │  Compare │            │
│  │   View    │ │ Builder  │ │   View   │            │
│  └──────────┘ └──────────┘ └──────────┘            │
└─────────────────────┬───────────────────────────────┘
                      │ REST + WebSocket
┌─────────────────────▼───────────────────────────────┐
│                  API GATEWAY                         │
│         Rate Limiting · Auth (future) · CORS         │
└─────────────────────┬───────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────┐
│               CORE API SERVICE                       │
│                                                      │
│  ┌──────────────────────────────────────────┐       │
│  │         DATA SOURCE ROUTER               │       │
│  │    Circuit Breaker · Priority Queue      │       │
│  │    Request Deduplication                 │       │
│  │                                          │       │
│  │  Source 1: FixTweet (self-hosted)        │       │
│  │  Source 2: Playwright Scraper Pool       │       │
│  │  Source 3: Syndication API               │       │
│  │  Source 4: Stale Cache Fallback          │       │
│  └──────────────────────────────────────────┘       │
│                                                      │
│  ┌──────────────┐  ┌──────────────┐                 │
│  │ WebSocket Mgr │  │ Health Monitor│                │
│  │ (live refresh)│  │ (source check)│                │
│  └──────────────┘  └──────────────┘                 │
└──────────┬──────────────────┬───────────────────────┘
           │                  │
    ┌──────▼──────┐    ┌──────▼──────┐
    │    Redis     │    │ PostgreSQL  │
    │  (hot cache) │    │ (persistent │
    │  60-min TTL  │    │  tweet store)│
    └─────────────┘    └─────────────┘
```

### 4.2 Data Flow: User Requests a Timeline

1. User navigates to `pravaha.app/@username`
2. Frontend sends GET `/api/timeline/:username`
3. API checks Redis cache → if HIT and fresh (<5 min), return immediately
4. If MISS or stale → Data Source Router activates:
   - Try FixTweet (fast, lightweight) — gets profile + recent tweets
   - If partial/failed → Try Playwright scraper (full timeline access)
   - If failed → Try Syndication API (individual tweets only)
   - If all fail → Serve stale cache with "data may be delayed" indicator
5. Response normalized → cached in Redis + persisted in PostgreSQL
6. WebSocket pushes update to connected clients viewing this timeline
7. Background job polls for new tweets every 2-5 minutes for active timelines

### 4.3 Data Flow: Real-Time Refresh

1. When user views a timeline, WebSocket connection established
2. Backend maintains a "watched timelines" set in Redis
3. Background worker polls watched timelines every 2-5 minutes
4. New tweets detected → pushed to all connected WebSocket clients
5. Frontend animates new tweets into view (slide down from top)
6. When last client disconnects from a timeline → removed from watch set

---

## 5. Feature Specifications

### 5.1 MVP Features (Sprint 1-3)

#### F1: User Timeline View
- Navigate to `/@username` to see a public user's tweets
- Shows: profile header (avatar, name, bio, follower/following counts)
- Infinite scroll with tweet cards (text, images, videos, quoted tweets)
- Each tweet shows: author, timestamp, text, media, metrics (likes/RT/replies)
- Real-time auto-refresh via WebSocket (new tweets slide in at top)
- Loading skeleton while fetching
- Error state with retry button if all sources fail
- "Data may be delayed" indicator when serving stale cache

#### F2: Individual Tweet View
- Navigate to `/@username/status/:id` to see a single tweet
- Full tweet with thread context (parent tweets above, replies below)
- Auto-unroll threads (detect "1/", "🧵", self-replies)
- Media viewer (images lightbox, video player)
- Share button (copies Pravaha URL)

#### F3: Search
- Search bar in header — search tweets by keyword
- Results show tweet cards with highlighted match terms
- Filter by: recent, popular (by engagement metrics)
- Filter by date range
- Pagination

#### F4: Profile View
- User profile page with: avatar, name, handle, bio, join date
- Follower/following counts
- Pinned tweet (if available)
- Tabs: Tweets, Replies, Media

#### F5: Trending/Top Feeds
- Landing page shows curated trending topics
- Top tweets by engagement in last 24h
- Category filters: Tech, News, Sports, Entertainment, etc.
- Sourced from aggregating high-engagement tweets across popular accounts

#### F6: Source Health Dashboard
- Small indicator in footer showing source status
- Green/yellow/red for each data source
- "Last updated X minutes ago" timestamp
- Expandable detail panel showing per-source latency + error rate

### 5.2 Post-MVP Features (Sprint 4+)

#### F7: Feed Builder
- Create custom feeds combining multiple users
- Name and save feeds (stored in localStorage)
- Unified chronological timeline from all users in feed
- Import/export feed configurations

#### F8: Local Bookmarks
- Bookmark tweets (stored in localStorage/IndexedDB)
- Bookmark page to review saved tweets
- Export bookmarks as JSON

#### F9: Tweet Export
- Export a user's timeline or search results as JSON/CSV
- Include metadata: tweet ID, author, timestamp, text, metrics, media URLs
- Limit: 100 tweets per export (free), unlimited (future premium)

#### F10: Tweet Alerts (Browser Notifications)
- Watch a user → get browser notification when they tweet
- Managed via WebSocket polling (backend checks watched users)
- Alert settings: all tweets, only tweets with media, only tweets with >N engagement

#### F11: Compare View
- Side-by-side view of two user timelines
- Synchronized scroll option
- Useful for journalists comparing statements

#### F12: Keyboard Navigation
- `j`/`k` — navigate between tweets
- `o` — open tweet
- `b` — bookmark
- `/` — focus search
- `?` — show shortcuts
- `t` — back to top

---

## 6. Data Model

### 6.1 Core Entities

```
Tweet {
  id: string (X tweet ID)
  author_id: string
  author_handle: string
  author_name: string
  author_avatar_url: string
  text: string
  html: string (rendered with links, mentions, hashtags)
  created_at: datetime
  media: Media[]
  metrics: { likes: int, retweets: int, replies: int, views: int }
  quoted_tweet_id: string | null
  reply_to_id: string | null
  thread_id: string | null
  is_retweet: boolean
  retweeted_by: string | null
  source: enum(fixtweet, playwright, syndication, cache)
  fetched_at: datetime
  cache_expires_at: datetime
}

User {
  id: string (X user ID)
  handle: string
  name: string
  bio: string
  avatar_url: string
  banner_url: string
  followers_count: int
  following_count: int
  tweet_count: int
  join_date: date
  verified: boolean
  fetched_at: datetime
}

Media {
  type: enum(image, video, gif)
  url: string
  thumbnail_url: string
  alt_text: string | null
  width: int
  height: int
  duration_ms: int | null (video only)
}
```

### 6.2 Local Storage (Client-Side)

```
Bookmark {
  tweet_id: string
  saved_at: datetime
  tweet_snapshot: Tweet (frozen at bookmark time)
}

CustomFeed {
  id: uuid
  name: string
  user_handles: string[]
  created_at: datetime
}

UserPreferences {
  theme: enum(light, dark)
  auto_refresh: boolean
  refresh_interval_sec: int (default 120)
  keyboard_nav: boolean
}
```

---

## 7. Tech Stack

| Layer | Technology | Reasoning |
|-------|-----------|-----------|
| **Frontend** | Next.js 15 (App Router) | SSR for SEO, React ecosystem, fast |
| **Styling** | Tailwind CSS 4 | Utility-first, rapid iteration, premium design |
| **Animations** | Framer Motion | Smooth micro-interactions, tweet entry animations |
| **State** | Zustand | Lightweight, no boilerplate |
| **Backend** | Node.js + Express (or Fastify) | WebSocket support, JS ecosystem alignment |
| **WebSocket** | Socket.io | Reliable WS with fallback to polling |
| **Cache** | Redis 7 / Valkey | Sub-ms reads, TTL support, pub/sub for WS |
| **Database** | PostgreSQL 16 | Reliable, JSONB for flexible tweet storage |
| **ORM** | Drizzle ORM | Type-safe, lightweight, fast |
| **Scraping** | Playwright | Headless browser automation, stealth plugins |
| **FixTweet** | Self-hosted Cloudflare Worker (or Node port) | Primary data source for tweets/profiles |
| **Containerization** | Docker + Docker Compose | Dev parity, easy deployment |
| **Monitoring** | Built-in health checks + structured logging | Source reliability tracking |

---

## 8. Non-Functional Requirements

| Requirement | Target | Notes |
|-------------|--------|-------|
| **Availability** | 99% uptime (stale-serve mode) | 95%+ for fresh data |
| **Latency (cached)** | <200ms p95 | Redis hot cache |
| **Latency (fresh fetch)** | <3s p95 | Multi-source with timeout |
| **Concurrent users** | 1000+ | Horizontal scaling via containers |
| **Cache TTL** | 5 min (hot), 60 min (warm), 24h (stale-serve) | Tiered caching |
| **Mobile responsive** | Full mobile support | Mobile-first design |
| **Accessibility** | WCAG 2.1 AA | Keyboard nav, screen reader support |
| **SEO** | SSR for tweet/profile pages | Google-indexable public content |

---

## 9. UI/UX Direction

### Design Philosophy
- **Reference products:** Linear (clean layout), Stripe (typography), Vercel (dark mode)
- **Deep navy dark mode** as default (Stripe-inspired, not black/grey)
- **Card-based tweet layout** with generous whitespace
- **Micro-interactions:** tweet hover effects, smooth scroll, skeleton loaders, slide-in animations for new tweets
- **Typography:** Inter or similar premium sans-serif
- **Color palette:**
  - Dark mode: Navy (#0A1628) background, slate cards (#131F38), white text, blue accents (#3B82F6)
  - Light mode: White (#FFFFFF) background, grey-50 cards, dark text, blue accents
- **No ads, no trackers, no cookie banners** — privacy is a feature

### Key Screens
1. **Landing/Home** — search bar + trending feeds + "browse @username" input
2. **Timeline** — profile header + scrollable tweet feed with live refresh indicator
3. **Tweet Detail** — full tweet + thread + replies
4. **Search Results** — filterable tweet cards
5. **Feed Builder** — manage custom multi-user feeds
6. **Settings** — theme, refresh interval, keyboard shortcuts toggle

---

## 10. Security Considerations

| Risk | Mitigation |
|------|------------|
| **XSS via tweet content** | Sanitize all HTML before rendering; use DOMPurify |
| **SSRF via media URLs** | Proxy all media through backend; validate URLs |
| **Rate limiting abuse** | Per-IP rate limiting at API gateway (60 req/min) |
| **Data source credentials** | Session tokens in environment variables, never in code |
| **Scraper account exposure** | Rotate accounts, use disposable emails, separate infra |
| **DDoS** | Cloudflare or equivalent CDN/WAF in production |
| **User privacy** | No analytics, no cookies, no user tracking. Zero PII stored. |

---

## 11. Data Source Strategy — The Reliability Engine

This is Pravaha's core differentiator. Detailed specification:

### Source Priority (Circuit Breaker Pattern)

```
Priority 1: FixTweet API (self-hosted)
  - Best for: Individual tweets, user profiles
  - Latency: ~200-500ms
  - Failure mode: 404s, empty responses when guest tokens expire
  - Circuit breaker: 3 consecutive failures → mark unhealthy for 5 min

Priority 2: Playwright Scraper Pool
  - Best for: Full timelines, search results
  - Latency: ~2-5s (browser startup + page load)
  - Failure mode: Rate limiting, CAPTCHA, login wall
  - Pool size: 3-5 browser instances
  - Circuit breaker: 3 consecutive failures → mark unhealthy for 10 min

Priority 3: Syndication API
  - Best for: Individual tweet fallback (by known ID)
  - Latency: ~100-300ms
  - Failure mode: 404s from non-datacenter IPs
  - Circuit breaker: 5 consecutive failures → mark unhealthy for 15 min

Priority 4: Stale Cache (PostgreSQL)
  - Always available
  - Serves last-known data with "data may be delayed" badge
  - No circuit breaker needed
```

### Health Monitoring

- Every 5 minutes: test request against each source
- Track: success rate (5-min rolling), avg latency, error types
- Expose via `/api/health` endpoint + WebSocket push to frontend
- Alert (structured log) when any source drops below 80% success rate

---

## 12. Roadmap

### MVP (v1.0) — Sprints 1-3
- Timeline view with real-time refresh
- Individual tweet + thread view
- Search (keywords)
- Profile view
- Source health indicator
- Dark/light theme (navy dark default)
- Mobile responsive
- Docker Compose deployment

### v1.1 — Sprints 4-5
- Feed builder (multi-user custom feeds)
- Local bookmarks
- Keyboard navigation
- Tweet export (JSON/CSV)

### v1.2 — Sprints 6-7
- Tweet alerts (browser notifications)
- Compare view
- Trending topics page
- Sentiment overlay (basic)

### v2.0 — Future
- Premium tier with enhanced features
- Public API for developers
- Self-hostable distribution (Docker image)

---

## 13. Success Metrics

| Metric | Target (3 months) | Target (6 months) |
|--------|-------------------|-------------------|
| Monthly active users | 10,000 | 100,000 |
| Data freshness | <5 min for active timelines | <2 min |
| Source availability | >95% (at least 1 source up) | >99% |
| Page load time | <2s (cached) | <1.5s |
| User retention (7-day) | >30% | >40% |

---

## 14. Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| X kills all guest token access | Medium | Critical | Account pool fallback + third-party provider as emergency layer |
| X sends cease & desist | Low | High | Legal precedent favorable (hiQ, Bright Data); consult IP attorney; operate from privacy-friendly jurisdiction |
| Scraping breaks frequently | High | Medium | Multi-source means no SPOF; health monitoring triggers fast adaptation |
| Residential proxy costs escalate | Medium | Low | Caching reduces 80-90% of requests; ISP proxies as cheaper alternative |
| Competitor launches similar product | Low | Low | First-mover + open-source community moat |

---

## 15. Open Questions for Review

1. **Proxy budget:** The "no paying money" constraint — does this apply only to X API, or also to infrastructure costs (proxies, hosting)? Residential proxies (~$100-200/mo) significantly improve scraper reliability.

2. **Account pool:** Playwright scraping works best with real X accounts (guest tokens are increasingly restricted). Are we comfortable maintaining a pool of disposable X accounts?

3. **Hosting preference:** Self-hosted (VPS) vs. cloud (Vercel + Railway/Render for backend)?

4. **Open source?** Making Pravaha open-source would build community trust and attract contributors, but also makes the scraping techniques visible to X. Preference?

5. **Scope for MVP:** Are the 6 MVP features (F1-F6) the right scope, or should we trim to just F1-F4 for a faster first release?

---

*Pravaha PRD v1.0 — Ready for Devam Shah review at Gate 2.*
