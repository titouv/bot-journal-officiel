import { createClient } from "redis";
import { env } from "./env.ts";

let redis: ReturnType<typeof createClient>;

async function initRedis() {
  redis = createClient({
    url: env.REDIS_URL,
    pingInterval: 5000,
    socket: {
      keepAlive: true,
    },
  });

  redis.on("error", (err) => console.error("Redis Client Error", err));
  redis.on("reconnecting", () => console.log("Redis is reconnecting..."));

  await redis.connect();
}

try {
  await initRedis();
  console.log("Redis connected");
} catch (e) {
  console.error("Redis connection error", e);
}

export { redis };
