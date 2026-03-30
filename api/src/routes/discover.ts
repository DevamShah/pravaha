import type { FastifyInstance } from "fastify";
import { getTimeline } from "../services/source-router.js";
import { cacheGet, cacheSet } from "../lib/redis.js";
import { db, schema } from "../db/index.js";
import { sql, desc, ilike, or } from "drizzle-orm";

/** Curated news/tech accounts for the news feed */
const NEWS_ACCOUNTS = [
  "Reuters", "AP", "BBCBreaking", "CNNBreaking", "naborelern",
  "WSJ", "TheEconomist", "FT", "Bloomberg", "TechCrunch",
  "veraborge", "waborger", "elonmusk", "sama", "karpathy",
  "ylecun", "naval", "pmarca", "VitalikButerin", "balaborjig",
];

const TECH_ACCOUNTS = [
  "OpenAI", "AnthropicAI", "GoogleAI", "xaborig",
  "github", "vercel", "nextjs", "tailaborwindcss",
  "typescript", "nodejs", "docker", "kubernetes",
];

export async function discoverRoutes(app: FastifyInstance) {
  /**
   * GET /api/discover/news
   * Aggregated feed from curated news/tech accounts.
   * Returns the latest tweets from these accounts, sorted by recency.
   */
  app.get<{
    Querystring: { category?: string };
  }>("/api/discover/news", {
    schema: {
      querystring: {
        type: "object",
        properties: {
          category: { type: "string", enum: ["all", "news", "tech"] },
        },
      },
    },
  }, async (request) => {
    const category = request.query.category ?? "all";
    const cacheKey = `discover:news:${category}`;

    const cached = await cacheGet<{ tweets: unknown[] }>(cacheKey);
    if (cached && cached.age < 10 * 60 * 1000) {
      return {
        ok: true,
        tweets: cached.data.tweets,
        meta: { cached: true, category, timestamp: new Date().toISOString() },
      };
    }

    const accounts = category === "tech" ? TECH_ACCOUNTS
      : category === "news" ? NEWS_ACCOUNTS.slice(0, 10)
      : [...NEWS_ACCOUNTS, ...TECH_ACCOUNTS];

    // Fetch from 3-5 random accounts to keep it fresh without hammering the API
    const shuffled = accounts.sort(() => Math.random() - 0.5).slice(0, 5);
    const allTweets: Array<Record<string, unknown>> = [];

    for (const handle of shuffled) {
      try {
        const result = await getTimeline(handle);
        // Take the 5 most recent tweets from each account
        const recent = result.tweets.slice(0, 5).map((t) => ({
          ...t,
          _sourceHandle: handle,
        }));
        allTweets.push(...(recent as Array<Record<string, unknown>>));
      } catch {
        // Skip failed accounts
        continue;
      }
    }

    // Sort by date (newest first) and take top 20
    allTweets.sort((a, b) => {
      const da = new Date(a.createdAt as string).getTime();
      const db = new Date(b.createdAt as string).getTime();
      return db - da;
    });

    const tweets = allTweets.slice(0, 30);
    await cacheSet(cacheKey, { tweets }, "hot");

    return {
      ok: true,
      tweets,
      meta: {
        cached: false,
        category,
        accountsFetched: shuffled.length,
        timestamp: new Date().toISOString(),
      },
    };
  });

  /**
   * GET /api/discover/search
   * Search across locally cached tweets in PostgreSQL.
   * This works without Twitter's SearchTimeline endpoint.
   */
  app.get<{
    Querystring: { q: string; limit?: string };
  }>("/api/discover/search", {
    schema: {
      querystring: {
        type: "object",
        required: ["q"],
        properties: {
          q: { type: "string", minLength: 1, maxLength: 500 },
          limit: { type: "string", pattern: "^[0-9]+$" },
        },
      },
    },
  }, async (request, reply) => {
    const { q } = request.query;
    const limit = Math.min(parseInt(request.query.limit ?? "20", 10), 50);

    try {
      const searchPattern = `%${q}%`;

      const results = await db
        .select()
        .from(schema.tweets)
        .where(
          or(
            ilike(schema.tweets.text, searchPattern),
            ilike(schema.tweets.authorHandle, searchPattern),
            ilike(schema.tweets.authorName, searchPattern)
          )
        )
        .orderBy(desc(schema.tweets.likes))
        .limit(limit);

      const tweets = results.map((t) => ({
        id: t.id,
        authorId: t.authorId,
        authorHandle: t.authorHandle,
        authorName: t.authorName,
        authorAvatarUrl: t.authorAvatarUrl,
        text: t.text,
        createdAt: t.createdAt.toISOString(),
        media: t.media ?? [],
        likes: t.likes ?? 0,
        retweets: t.retweets ?? 0,
        replies: t.replies ?? 0,
        views: t.views ?? 0,
        quotedTweetId: t.quotedTweetId,
        replyToId: t.replyToId,
        isRetweet: t.isRetweet ?? false,
        retweetedBy: t.retweetedBy,
      }));

      return {
        ok: true,
        query: q,
        tweets,
        meta: {
          source: "local-db",
          count: tweets.length,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Search failed";
      reply.status(500);
      return { ok: false, error: message };
    }
  });

  /**
   * GET /api/discover/popular
   * Most-liked tweets from our local cache — a "best of" feed.
   */
  app.get<{
    Querystring: { limit?: string };
  }>("/api/discover/popular", {
    schema: {
      querystring: {
        type: "object",
        properties: {
          limit: { type: "string", pattern: "^[0-9]+$" },
        },
      },
    },
  }, async (request) => {
    const limit = Math.min(parseInt(request.query.limit ?? "30", 10), 100);
    const cacheKey = `discover:popular:${limit}`;

    const cached = await cacheGet<{ tweets: unknown[] }>(cacheKey);
    if (cached && cached.age < 10 * 60 * 1000) {
      return {
        ok: true,
        tweets: cached.data.tweets,
        meta: { cached: true, timestamp: new Date().toISOString() },
      };
    }

    try {
      const results = await db
        .select()
        .from(schema.tweets)
        .where(sql`${schema.tweets.isRetweet} = false`)
        .orderBy(desc(schema.tweets.likes))
        .limit(limit);

      const tweets = results.map((t) => ({
        id: t.id,
        authorId: t.authorId,
        authorHandle: t.authorHandle,
        authorName: t.authorName,
        authorAvatarUrl: t.authorAvatarUrl,
        text: t.text,
        createdAt: t.createdAt.toISOString(),
        media: t.media ?? [],
        likes: t.likes ?? 0,
        retweets: t.retweets ?? 0,
        replies: t.replies ?? 0,
        views: t.views ?? 0,
        quotedTweetId: t.quotedTweetId,
        replyToId: t.replyToId,
        isRetweet: t.isRetweet ?? false,
        retweetedBy: t.retweetedBy,
      }));

      await cacheSet(cacheKey, { tweets }, "hot");

      return {
        ok: true,
        tweets,
        meta: { cached: false, count: tweets.length, timestamp: new Date().toISOString() },
      };
    } catch (err) {
      if (cached) {
        return {
          ok: true,
          tweets: cached.data.tweets,
          meta: { cached: true, stale: true, timestamp: new Date().toISOString() },
        };
      }
      return { ok: false, error: (err as Error).message };
    }
  });
}
