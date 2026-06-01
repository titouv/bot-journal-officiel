import { Layer } from "effect"
import { AppConfigLive } from "./config.ts"
import { LoggerLive } from "./logger.ts"
import { AuthLive } from "./auth.ts"
import { RedisLive } from "./redis.ts"
import { HttpClientLive, CachedHttpClientLive } from "./http.ts"

export const RootLayer = Layer.mergeAll(
  AppConfigLive,
  LoggerLive,
  RedisLive,
  AuthLive,
  HttpClientLive,
  CachedHttpClientLive,
)
