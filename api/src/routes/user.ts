import type { FastifyInstance } from "fastify";
import { getUser } from "../services/source-router.js";

export async function userRoutes(app: FastifyInstance) {
  app.get<{
    Params: { handle: string };
  }>("/api/user/:handle", {
    schema: {
      params: {
        type: "object",
        required: ["handle"],
        properties: {
          handle: { type: "string", minLength: 1, maxLength: 50, pattern: "^[A-Za-z0-9_]+$" },
        },
      },
    },
  }, async (request, reply) => {
    const { handle } = request.params;

    try {
      const result = await getUser(handle);

      reply.header("X-Data-Source", result.source);
      reply.header("X-Cached", String(result.cached));

      return {
        ok: true,
        user: result,
        meta: {
          source: result.source,
          cached: result.cached,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      reply.status(502);
      return { ok: false, error: message };
    }
  });
}
