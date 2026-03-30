# Pravaha — Phase 1 Ideation Synthesis

**Product:** Pravaha (Sanskrit: "continuous stream/flow")
**Type:** Web-based public X/Twitter viewer with real-time feed and search
**Date:** 2026-03-30
**Status:** Phase 1 Complete

---

## 1. Problem Statement

X/Twitter has progressively locked down public content access:
- Login walls on x.com (inconsistent, often forces sign-up)
- Free API tier is read-useless (~1 req/15 min, no search, no timelines)
- Paid API starts at $100/month (Basic) for minimal read access
- Nitter is dying (requires real account tokens, intermittent outages, domain expires May 2026)

**User need:** View any public Twitter user's tweets and search public tweets in real-time, without creating an X account, without paying, and without depending on fragile single-point services like Nitter.

**Target users:** Researchers, journalists, OSINT analysts, privacy-conscious users, social media monitors, marketers who need Twitter intelligence without a Twitter account.

---

## 2. Market Intelligence — Competitor Analysis

### 2.1 Direct Competitors

| # | Product | Type | Pricing | Key Strength | Key Weakness |
|---|---------|------|---------|--------------|--------------|
| 1 | **Nitter/XCancel** | OSS frontend | Free | Full timeline + search | Dying — needs real account tokens, frequent outages |
| 2 | **FxTwitter/FixTweet** | OSS embed fixer | Free | Reliable for single tweets | No timelines, no search |
| 3 | **TwitterAPI.io** | Commercial API | $0.15/1K tweets | Reliable, full access | Paid service |
| 4 | **SociaVault** | Commercial API | $99/month | Full historical data | Expensive |
| 5 | **Thread Reader App** | Thread unroller | Free (ads) | Great thread UX | Only threads, no general browsing |

### 2.2 Technical Approaches in the Wild

| Approach | Viability | Reliability | Cost | Legal Risk |
|----------|-----------|-------------|------|------------|
| X Free API | NOT VIABLE | High | Free | None |
| Syndication API | Supplementary only | Low | Free | Low |
| FixTweet self-hosted | Component | Medium | ~$5/mo | Medium |
| Nitter fork self-hosted | Full-featured but fragile | Low-Medium | ~$20/mo | Medium-High |
| Playwright scraping + proxies | Full-featured | Medium | ~$100-200/mo | Medium |
| Third-party data providers | Most reliable | High | $50-200/mo | Transferred |
| Google Cache | DEAD | None | Free | Low |
| RSS Bridge | NOT VIABLE without paid API | N/A | N/A | N/A |

### 2.3 Key Legal Precedent

- **hiQ v. LinkedIn (2022):** Scraping public data does NOT violate CFAA
- **X v. Bright Data (2024):** X LOST — court ruled scraping public data is permissible
- **ToS violation:** Not criminal, but breach-of-contract risk exists
- **Bottom line:** Legally defensible in US, but X actively litigates

---

## 3. Master Feature Inventory

### 3.1 Table Stakes (Must Have — Every Competitor Has These)

| # | Feature | Source |
|---|---------|--------|
| 1 | View public user timeline | Nitter, XCancel |
| 2 | View individual tweets | All |
| 3 | View thread/conversation | Nitter, Thread Reader |
| 4 | View user profile (bio, followers, following count) | Nitter, XCancel |
| 5 | View images in tweets | All |
| 6 | View videos in tweets | Nitter, FixTweet |
| 7 | View quoted tweets | All |
| 8 | View retweets | Nitter |
| 9 | Search tweets by keyword | Nitter (when working) |
| 10 | Search users | Nitter |
| 11 | Mobile responsive | All web-based |
| 12 | No login required | All alternatives |
| 13 | View tweet metrics (likes, retweets, replies count) | All |
| 14 | Pagination / infinite scroll | Nitter |
| 15 | Direct link sharing | All |

### 3.2 Differentiators (Exceed Competitors)

| # | Feature | Why It Differentiates |
|---|---------|----------------------|
| 16 | **Multi-source failover** — automatic switching between data sources | Nitter dies when one source fails; Pravaha keeps working |
| 17 | **Real-time auto-refresh** — WebSocket-based live feed updates | No competitor does live push updates |
| 18 | **Source health dashboard** — shows which data sources are up/down | Transparency about reliability that no competitor offers |
| 19 | **Aggressive caching** — serves near-real-time even when all sources fail | Nitter shows errors; Pravaha shows cached data |
| 20 | **Premium UI/UX** — Linear/Stripe-quality design | Nitter and XCancel look like 2015 |
| 21 | **Trending/Top feeds** — curated top content without Twitter's algorithm | Not available on any free alternative |
| 22 | **Bookmarks (local)** — save tweets locally without an account | Browser-only, no server storage needed |
| 23 | **Export tweets** — download tweet data as JSON/CSV | Research use case, not available on free alternatives |
| 24 | **Dark/light theme** with deep navy dark mode | Premium feel |
| 25 | **Keyboard navigation** — vim-style shortcuts for power users | OSINT/researcher audience loves this |

### 3.3 Blue Ocean (Nobody Does This)

| # | Feature | Innovation |
|---|---------|------------|
| 26 | **Feed builder** — combine multiple users into one custom feed | Create curated views without Twitter lists |
| 27 | **Tweet alerts** — get notified when a user tweets (via browser notifications) | Monitor accounts without an X account |
| 28 | **Sentiment overlay** — basic sentiment indicator on tweets | Quick read of tone without reading every tweet |
| 29 | **Thread auto-unroll** — automatically detect and expand threads | Better than Thread Reader because it's integrated |
| 30 | **Compare view** — side-by-side two user timelines | Journalist/research workflow |

---

## 4. Technical Feasibility Assessment

### 4.1 Recommended Architecture: Multi-Source with Failover

```
User Request → API Gateway → Cache (Redis)
                                ├─ HIT → Return immediately
                                └─ MISS → Data Source Router
                                            ├─ P1: Self-hosted FixTweet (tweets, profiles)
                                            ├─ P2: Playwright scraper pool (timelines, search)
                                            ├─ P3: Syndication API (individual tweet fallback)
                                            └─ All fail → Serve stale cache
```

### 4.2 Tech Stack Direction
- **Frontend:** Next.js 15 + Tailwind CSS + Framer Motion
- **Backend:** Node.js API with WebSocket support
- **Data sources:** Self-hosted FixTweet, Playwright pool, Syndication API
- **Cache:** Redis/Valkey (60-min TTL)
- **Database:** PostgreSQL (tweet persistence for stale-serve)
- **Deployment:** Docker Compose (dev), containerized (prod)

### 4.3 Key Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| X kills guest tokens | CRITICAL | Multi-source architecture, account pool fallback |
| Scraping breaks every 2-4 weeks | HIGH | Automated health monitoring, quick adaptation |
| Legal action from X | MEDIUM | US legal precedent favorable, only display public data |
| Residential proxy costs | MEDIUM | Aggressive caching reduces 80-90% of requests |

---

## 5. Differentiation Strategy

**Pravaha's moat is RELIABILITY through redundancy.**

Every existing free alternative is a single point of failure. Nitter dies when guest tokens change. FixTweet only does individual tweets. XCancel has intermittent outages.

Pravaha's multi-source failover architecture means:
1. If Source A fails → Source B takes over automatically
2. If all sources fail → cached data served (stale but available)
3. Health dashboard shows users exactly what's working
4. No dependency on any single upstream provider

**Secondary moat: Premium UX.** Every existing alternative looks dated. Pravaha looks like a modern SaaS tool.

---

## 6. Go/No-Go Recommendation

**GO** — with caveats:

1. The product is technically feasible with a multi-source architecture
2. Legal precedent supports scraping public data
3. Clear market demand (millions used Nitter before it degraded)
4. Strong differentiation through reliability + UX
5. **Caveat:** This is inherently a cat-and-mouse game with X. Budget for ongoing maintenance.
6. **Caveat:** "Highly available" means ~95-99% uptime with stale-serve, not 99.99%

---

*Phase 1 complete. Approved for Phase 2 (PRD) progression.*
