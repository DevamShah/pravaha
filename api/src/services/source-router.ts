import { twitterGuest } from "../adapters/twitter-guest.js";
import { fixtweet } from "../adapters/fixtweet.js";
import { syndication } from "../adapters/syndication.js";
import { isSourceHealthy, recordSuccess, recordFailure, getAllSourceStates } from "../lib/circuit-breaker.js";
import { cacheGet, cacheSet } from "../lib/redis.js";
import { db, schema } from "../db/index.js";
import { eq, desc } from "drizzle-orm";
import type { DataSourceAdapter, NormalizedTweet, NormalizedUser, TimelineResult } from "../lib/types.js";

/**
 * Data Source Router
 *
 * Routes requests through available data sources in priority order,
 * respecting circuit breaker state. Falls back to stale DB cache
 * when all sources are unavailable.
 */

// Ordered by priority — twitter-guest is primary (has timelines + search)
const TIMELINE_SOURCES: DataSourceAdapter[] = [twitterGuest, fixtweet];
const TWEET_SOURCES: DataSourceAdapter[] = [twitterGuest, fixtweet, syndication];
const USER_SOURCES: DataSourceAdapter[] = [twitterGuest, fixtweet];
const SEARCH_SOURCES: DataSourceAdapter[] = [twitterGuest];

// Cache TTL thresholds (ms)
const HOT_THRESHOLD = 5 * 60 * 1000; // 5 minutes

async function trySource<T>(
  adapter: DataSourceAdapter,
  operation: (a: DataSourceAdapter) => Promise<T>
): Promise<T> {
  if (!isSourceHealthy(adapter.name)) {
    throw new Error(`Source ${adapter.name} is unhealthy (circuit open)`);
  }

  const start = Date.now();
  try {
    const result = await operation(adapter);
    recordSuccess(adapter.name, Date.now() - start);
    return result;
  } catch (err) {
    recordFailure(adapter.name);
    throw err;
  }
}

async function routeThrough<T>(
  sources: DataSourceAdapter[],
  operation: (a: DataSourceAdapter) => Promise<T>,
  operationName: string
): Promise<T> {
  const errors: string[] = [];

  for (const source of sources) {
    try {
      return await trySource(source, operation);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[Router] ${source.name} failed for ${operationName}: ${msg}`);
      errors.push(`${source.name}: ${msg}`);
      continue;
    }
  }

  throw new Error(`All sources failed for ${operationName}: ${errors.join("; ")}`);
}

// --- Public API ---

export async function getTimeline(handle: string, cursor?: string): Promise<TimelineResult & { source: string; cached: boolean }> {
  const cacheKey = `timeline:${handle.toLowerCase()}:${cursor ?? "first"}`;

  // Check cache
  const cached = await cacheGet<TimelineResult & { source: string }>(cacheKey);
  if (cached && cached.age < HOT_THRESHOLD) {
    return { ...cached.data, cached: true };
  }

  // Try live sources
  try {
    const result = await routeThrough(
      TIMELINE_SOURCES,
      (a) => a.fetchTimeline(handle, cursor),
      `timeline:${handle}`
    );

    const enriched = { ...result, source: "live", cached: false };

    // Cache the result
    await cacheSet(cacheKey, { ...result, source: "live" }, "hot");

    // Persist to DB for stale fallback
    await persistTweets(result.tweets, "fixtweet");
    await persistUser(result.user);

    return enriched;
  } catch (err) {
    // If we had warm cache, serve it
    if (cached) {
      console.warn(`[Router] All sources failed for timeline:${handle}, serving stale cache`);
      return { ...cached.data, cached: true };
    }

    // Last resort: serve from database
    try {
      return await getTimelineFromDb(handle);
    } catch (dbErr) {
      // DB also unavailable — return user profile if we can get it
      try {
        const user = await routeThrough(USER_SOURCES, (a) => a.fetchUser(handle), `user:${handle}`);
        return { user, tweets: [], source: "profile-only", cached: false };
      } catch {
        throw err; // Re-throw original error
      }
    }
  }
}

export async function getTweet(id: string): Promise<{ tweet: NormalizedTweet; thread?: NormalizedTweet[]; source: string; cached: boolean }> {
  const cacheKey = `tweet:${id}`;

  const cached = await cacheGet<{ tweet: NormalizedTweet; thread?: NormalizedTweet[]; source: string }>(cacheKey);
  if (cached && cached.age < HOT_THRESHOLD) {
    return { ...cached.data, cached: true };
  }

  try {
    const result = await routeThrough(
      TWEET_SOURCES,
      (a) => a.fetchTweet(id),
      `tweet:${id}`
    );

    const enriched = { ...result, source: "live", cached: false };
    await cacheSet(cacheKey, { ...result, source: "live" }, "warm");
    await persistTweets([result.tweet], "fixtweet");

    return enriched;
  } catch (err) {
    if (cached) {
      return { ...cached.data, cached: true };
    }
    try {
      return await getTweetFromDb(id);
    } catch {
      throw err;
    }
  }
}

export async function getUser(handle: string): Promise<NormalizedUser & { source: string; cached: boolean }> {
  const cacheKey = `user:${handle.toLowerCase()}`;

  const cached = await cacheGet<NormalizedUser & { source: string }>(cacheKey);
  if (cached && cached.age < HOT_THRESHOLD) {
    return { ...cached.data, cached: true };
  }

  try {
    const result = await routeThrough(
      USER_SOURCES,
      (a) => a.fetchUser(handle),
      `user:${handle}`
    );

    const enriched = { ...result, source: "live", cached: false };
    await cacheSet(cacheKey, enriched, "warm");
    await persistUser(result);

    return enriched;
  } catch (err) {
    if (cached) {
      return { ...cached.data, cached: true };
    }
    try {
      return await getUserFromDb(handle);
    } catch {
      throw err;
    }
  }
}

export async function searchTweets(query: string, cursor?: string): Promise<{ tweets: NormalizedTweet[]; cursor?: string; source: string; cached: boolean }> {
  const cacheKey = `search:${query.toLowerCase()}:${cursor ?? "first"}`;

  const cached = await cacheGet<{ tweets: NormalizedTweet[]; cursor?: string; source: string }>(cacheKey);
  if (cached && cached.age < HOT_THRESHOLD) {
    return { ...cached.data, cached: true };
  }

  try {
    for (const source of SEARCH_SOURCES) {
      if (!source.searchTweets) continue;
      try {
        const result = await trySource(source, (a) => a.searchTweets!(query, cursor));
        const enriched = { ...result, source: "live", cached: false };
        await cacheSet(cacheKey, { ...result, source: "live" }, "hot");
        await persistTweets(result.tweets, source.name);
        return enriched;
      } catch {
        continue;
      }
    }
    throw new Error("No search sources available");
  } catch (err) {
    if (cached) {
      return { ...cached.data, cached: true };
    }
    throw err;
  }
}

export function getHealth() {
  return getAllSourceStates().map((s) => ({
    name: s.name,
    healthy: s.isHealthy,
    consecutiveFailures: s.consecutiveFailures,
    avgLatencyMs: s.avgLatencyMs,
    lastSuccess: s.lastSuccess?.toISOString() ?? null,
    lastFailure: s.lastFailure?.toISOString() ?? null,
    unhealthyUntil: s.unhealthyUntil?.toISOString() ?? null,
  }));
}

// --- Database Persistence (stale fallback) ---

async function persistTweets(tweets: NormalizedTweet[], source: string): Promise<void> {
  try {
    for (const t of tweets) {
      await db
        .insert(schema.tweets)
        .values({
          id: t.id,
          authorId: t.authorId,
          authorHandle: t.authorHandle,
          authorName: t.authorName,
          authorAvatarUrl: t.authorAvatarUrl,
          text: t.text,
          html: t.html,
          createdAt: t.createdAt,
          media: t.media,
          likes: t.likes,
          retweets: t.retweets,
          replies: t.replies,
          views: t.views,
          quotedTweetId: t.quotedTweetId,
          replyToId: t.replyToId,
          isRetweet: t.isRetweet,
          retweetedBy: t.retweetedBy,
          source,
          fetchedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: schema.tweets.id,
          set: {
            text: t.text,
            likes: t.likes,
            retweets: t.retweets,
            replies: t.replies,
            views: t.views,
            media: t.media,
            fetchedAt: new Date(),
          },
        });
    }
  } catch (err) {
    console.error("[Router] Failed to persist tweets:", (err as Error).message);
  }
}

async function persistUser(user: NormalizedUser): Promise<void> {
  try {
    await db
      .insert(schema.users)
      .values({
        id: user.id || user.handle,
        handle: user.handle,
        name: user.name,
        bio: user.bio,
        avatarUrl: user.avatarUrl,
        bannerUrl: user.bannerUrl,
        followersCount: user.followersCount,
        followingCount: user.followingCount,
        tweetCount: user.tweetCount,
        joinDate: user.joinDate,
        verified: user.verified,
        fetchedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: schema.users.handle,
        set: {
          name: user.name,
          bio: user.bio,
          avatarUrl: user.avatarUrl,
          bannerUrl: user.bannerUrl,
          followersCount: user.followersCount,
          followingCount: user.followingCount,
          tweetCount: user.tweetCount,
          fetchedAt: new Date(),
        },
      });
  } catch (err) {
    console.error("[Router] Failed to persist user:", (err as Error).message);
  }
}

async function getTimelineFromDb(handle: string): Promise<TimelineResult & { source: string; cached: boolean }> {
  const dbTweets = await db
    .select()
    .from(schema.tweets)
    .where(eq(schema.tweets.authorHandle, handle.toLowerCase()))
    .orderBy(desc(schema.tweets.createdAt))
    .limit(20);

  const dbUser = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.handle, handle.toLowerCase()))
    .limit(1);

  if (dbTweets.length === 0 && dbUser.length === 0) {
    throw new Error(`No data available for @${handle} — all sources failed and no cached data exists`);
  }

  const user: NormalizedUser = dbUser[0]
    ? {
        id: dbUser[0].id,
        handle: dbUser[0].handle,
        name: dbUser[0].name,
        bio: dbUser[0].bio,
        avatarUrl: dbUser[0].avatarUrl,
        bannerUrl: dbUser[0].bannerUrl,
        followersCount: dbUser[0].followersCount ?? 0,
        followingCount: dbUser[0].followingCount ?? 0,
        tweetCount: dbUser[0].tweetCount ?? 0,
        joinDate: dbUser[0].joinDate,
        verified: dbUser[0].verified ?? false,
      }
    : { id: "", handle, name: handle, bio: null, avatarUrl: null, bannerUrl: null, followersCount: 0, followingCount: 0, tweetCount: 0, joinDate: null, verified: false };

  const tweets: NormalizedTweet[] = dbTweets.map((t) => ({
    id: t.id,
    authorId: t.authorId,
    authorHandle: t.authorHandle,
    authorName: t.authorName,
    authorAvatarUrl: t.authorAvatarUrl,
    text: t.text,
    html: t.html,
    createdAt: t.createdAt,
    media: (t.media ?? []) as NormalizedTweet["media"],
    likes: t.likes ?? 0,
    retweets: t.retweets ?? 0,
    replies: t.replies ?? 0,
    views: t.views ?? 0,
    quotedTweetId: t.quotedTweetId,
    replyToId: t.replyToId,
    isRetweet: t.isRetweet ?? false,
    retweetedBy: t.retweetedBy,
  }));

  return { user, tweets, source: "database", cached: true };
}

async function getTweetFromDb(id: string): Promise<{ tweet: NormalizedTweet; source: string; cached: boolean }> {
  const rows = await db.select().from(schema.tweets).where(eq(schema.tweets.id, id)).limit(1);

  if (rows.length === 0) {
    throw new Error(`Tweet ${id} not found — all sources failed and no cached data exists`);
  }

  const t = rows[0];
  return {
    tweet: {
      id: t.id,
      authorId: t.authorId,
      authorHandle: t.authorHandle,
      authorName: t.authorName,
      authorAvatarUrl: t.authorAvatarUrl,
      text: t.text,
      html: t.html,
      createdAt: t.createdAt,
      media: (t.media ?? []) as NormalizedTweet["media"],
      likes: t.likes ?? 0,
      retweets: t.retweets ?? 0,
      replies: t.replies ?? 0,
      views: t.views ?? 0,
      quotedTweetId: t.quotedTweetId,
      replyToId: t.replyToId,
      isRetweet: t.isRetweet ?? false,
      retweetedBy: t.retweetedBy,
    },
    source: "database",
    cached: true,
  };
}

async function getUserFromDb(handle: string): Promise<NormalizedUser & { source: string; cached: boolean }> {
  const rows = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.handle, handle.toLowerCase()))
    .limit(1);

  if (rows.length === 0) {
    throw new Error(`User @${handle} not found — all sources failed and no cached data exists`);
  }

  const u = rows[0];
  return {
    id: u.id,
    handle: u.handle,
    name: u.name,
    bio: u.bio,
    avatarUrl: u.avatarUrl,
    bannerUrl: u.bannerUrl,
    followersCount: u.followersCount ?? 0,
    followingCount: u.followingCount ?? 0,
    tweetCount: u.tweetCount ?? 0,
    joinDate: u.joinDate,
    verified: u.verified ?? false,
    source: "database",
    cached: true,
  };
}
