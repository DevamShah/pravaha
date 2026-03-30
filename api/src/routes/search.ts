import type { FastifyInstance } from "fastify";
import { searchTweets } from "../services/source-router.js";

export async function searchRoutes(app: FastifyInstance) {
  app.get<{
    Querystring: { q: string; cursor?: string };
  }>("/api/search", {
    schema: {
      querystring: {
        type: "object",
        required: ["q"],
        properties: {
          q: { type: "string", minLength: 1, maxLength: 500 },
          cursor: { type: "string" },
        },
      },
    },
  }, async (request, reply) => {
    const { q, cursor } = request.query;

    try {
      const result = await searchTweets(q, cursor);

      reply.header("X-Data-Source", result.source);
      reply.header("X-Cached", String(result.cached));

      return {
        ok: true,
        query: q,
        tweets: result.tweets,
        cursor: result.cursor ?? null,
        meta: {
          source: result.source,
          cached: result.cached,
          count: result.tweets.length,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      reply.status(502);
      return {
        ok: false,
        error: message,
        meta: { timestamp: new Date().toISOString() },
      };
    }
  });
}
