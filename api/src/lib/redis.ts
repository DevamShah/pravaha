import Redis from "ioredis";

const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";

export const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    if (times > 5) return null; // Stop retrying after 5 attempts
    return Math.min(times * 200, 2000);
  },
  lazyConnect: true,
});

redis.on("error", (err) => {
  console.error("[Redis] Connection error:", err.message);
});

redis.on("connect", () => {
  console.log("[Redis] Connected");
});

const HOT_TTL = parseInt(process.env.CACHE_HOT_TTL ?? "300", 10);
const WARM_TTL = parseInt(process.env.CACHE_WARM_TTL ?? "3600", 10);

export async function cacheGet<T>(key: string): Promise<{ data: T; age: number } | null> {
  try {
    const raw = await redis.get(key);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as { data: T; cachedAt: number };
    const age = Date.now() - parsed.cachedAt;
    return { data: parsed.data, age };
  } catch {
    return null;
  }
}

export async function cacheSet<T>(key: string, data: T, ttl: "hot" | "warm" = "hot"): Promise<void> {
  try {
    const seconds = ttl === "hot" ? HOT_TTL : WARM_TTL;
    const payload = JSON.stringify({ data, cachedAt: Date.now() });
    await redis.set(key, payload, "EX", seconds);
  } catch (err) {
    console.error("[Redis] Cache set error:", (err as Error).message);
  }
}

export async function cacheDel(key: string): Promise<void> {
  try {
    await redis.del(key);
  } catch {
    // Swallow — cache miss is acceptable
  }
}
