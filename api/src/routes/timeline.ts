import type { FastifyInstance } from "fastify";
import { getTimeline } from "../services/source-router.js";

export async function timelineRoutes(app: FastifyInstance) {
  app.get<{
    Params: { handle: string };
    Querystring: { cursor?: string };
  }>("/api/timeline/:handle", {
    schema: {
      params: {
        type: "object",
        required: ["handle"],
        properties: {
          handle: { type: "string", minLength: 1, maxLength: 50, pattern: "^[A-Za-z0-9_]+$" },
        },
      },
      querystring: {
        type: "object",
        properties: {
          cursor: { type: "string" },
        },
      },
    },
  }, async (request, reply) => {
    const { handle } = request.params;
    const { cursor } = request.query;

    try {
      const result = await getTimeline(handle, cursor);

      reply.header("X-Data-Source", result.source);
      reply.header("X-Cached", String(result.cached));

      return {
        ok: true,
        user: result.user,
        tweets: result.tweets,
        cursor: result.cursor ?? null,
        meta: {
          source: result.source,
          cached: result.cached,
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
