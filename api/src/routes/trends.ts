import type { FastifyInstance } from "fastify";
import { fetchTrends, LOCATIONS } from "../adapters/trends.js";
import { cacheGet, cacheSet } from "../lib/redis.js";

export async function trendsRoutes(app: FastifyInstance) {
  app.get<{
    Querystring: { location?: string };
  }>("/api/trends", {
    schema: {
      querystring: {
        type: "object",
        properties: {
          location: { type: "string", enum: Object.keys(LOCATIONS) },
        },
      },
    },
  }, async (_request, reply) => {
    const location = _request.query.location ?? "worldwide";
    const woeid = LOCATIONS[location] ?? 1;
    const cacheKey = `trends:${woeid}`;

    // Trends update every ~5 minutes on Twitter's side
    const cached = await cacheGet<{ trends: unknown[]; location: string; asOf: string }>(cacheKey);
    if (cached && cached.age < 5 * 60 * 1000) {
      return {
        ok: true,
        ...cached.data,
        meta: { cached: true, timestamp: new Date().toISOString() },
      };
    }

    try {
      const result = await fetchTrends(woeid);
      await cacheSet(cacheKey, result, "hot");

      return {
        ok: true,
        ...result,
        meta: { cached: false, timestamp: new Date().toISOString() },
      };
    } catch (err) {
      // Serve stale if available
      if (cached) {
        return {
          ok: true,
          ...cached.data,
          meta: { cached: true, stale: true, timestamp: new Date().toISOString() },
        };
      }

      const message = err instanceof Error ? err.message : "Unknown error";
      reply.status(502);
      return { ok: false, error: message };
    }
  });

  // Available locations
  app.get("/api/trends/locations", async () => ({
    ok: true,
    locations: Object.entries(LOCATIONS).map(([name, woeid]) => ({ name, woeid })),
  }));
}
