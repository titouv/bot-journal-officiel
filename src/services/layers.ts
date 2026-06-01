import { Layer } from "effect"
import { AppConfigLive } from "./config.ts"
import { LoggerLive } from "./logger.ts"
import { AuthLive } from "./auth.ts"
import { RedisLive } from "./redis.ts"
import { HttpClientLive, CachedHttpClientLive } from "./http.ts"
import { ScraperLive } from "./scraper.ts"
import { BlueskyLive } from "./bluesky.ts"
import { AiLive } from "./ai.ts"

export const AppLayer = Layer.mergeAll(
  AppConfigLive,
  LoggerLive,
  RedisLive,
  AuthLive,
  HttpClientLive,
  CachedHttpClientLive,
  ScraperLive,
  BlueskyLive,
  AiLive,
)
