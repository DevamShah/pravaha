import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { redis } from "./lib/redis.js";
import { timelineRoutes } from "./routes/timeline.js";
import { tweetRoutes } from "./routes/tweet.js";
import { userRoutes } from "./routes/user.js";
import { healthRoutes } from "./routes/health.js";
import { searchRoutes } from "./routes/search.js";
import { trendsRoutes } from "./routes/trends.js";
import { discoverRoutes } from "./routes/discover.js";

const PORT = parseInt(process.env.PORT ?? "4000", 10);
const HOST = process.env.HOST ?? "0.0.0.0";

async function main() {
  const app = Fastify({
    logger: {
      level: "info",
      transport: {
        target: "pino-pretty",
        options: { colorize: true },
      },
    },
  });

  // CORS — allow frontend origin
  await app.register(cors, {
    origin: [
      "http://localhost:3000",
      "http://127.0.0.1:3000",
    ],
    methods: ["GET", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
  });

  // Rate limiting
  await app.register(rateLimit, {
    max: parseInt(process.env.RATE_LIMIT_MAX ?? "60", 10),
    timeWindow: parseInt(process.env.RATE_LIMIT_WINDOW_MS ?? "60000", 10),
  });

  // Connect Redis
  try {
    await redis.connect();
  } catch (err) {
    console.warn("[Server] Redis connection failed, running without cache:", (err as Error).message);
  }

  // Register routes
  await app.register(healthRoutes);
  await app.register(timelineRoutes);
  await app.register(tweetRoutes);
  await app.register(userRoutes);
  await app.register(searchRoutes);
  await app.register(trendsRoutes);
  await app.register(discoverRoutes);

  // Root endpoint
  app.get("/", async () => ({
    name: "Pravaha API",
    version: "1.0.0",
    description: "Multi-source Twitter/X data service",
    endpoints: {
      health: "/api/health",
      timeline: "/api/timeline/:handle",
      tweet: "/api/tweet/:id",
      user: "/api/user/:handle",
      search: "/api/search?q=",
      trends: "/api/trends?location=worldwide",
      news: "/api/discover/news?category=all",
      localSearch: "/api/discover/search?q=",
      popular: "/api/discover/popular",
    },
  }));

  // Start
  try {
    await app.listen({ port: PORT, host: HOST });
    console.log(`\n  🌊 Pravaha API running at http://${HOST}:${PORT}\n`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
