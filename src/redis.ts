import { createClient } from "redis";
import { env } from "./env.ts";

let redis: ReturnType<typeof createClient>;

async function initRedis() {
  redis = createClient({
    url: env.REDIS_URL,
  });
  await redis.connect();
}

try {
  await initRedis();
  console.log("Redis connected");
} catch (e) {
  console.error("Redis connection error", e);
}

export { redis };
