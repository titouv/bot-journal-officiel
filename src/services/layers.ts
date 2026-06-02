import { Layer } from "effect"
import { AppConfigLive } from "./config.ts"
import { LoggerLive } from "./logger.ts"
import { AuthLive } from "./auth.ts"
import { RedisLive } from "./redis.ts"
import { HttpClientLive, CachedHttpClientLive } from "./http.ts"
import { ScraperLive } from "./scraper.ts"
import { BlueskyLive } from "./bluesky.ts"
import { AiLive } from "./ai.ts"

// Dependency chain:
// AppConfig, Logger (root)
//   → Auth, Redis, Bluesky (depend on AppConfig)
//     → HttpClient (depends on Auth)
//       → Scraper (depends on HttpClient + AppConfig)
//       → CachedHttpClient (depends on HttpClient + Redis)
//   → Ai (depends on Redis + AppConfig)
//
// Each layer wraps its dependencies via provideMerge, building one layer at a time.

const AuthLayer = AuthLive.pipe(Layer.provide(AppConfigLive))
const RedisLayer = RedisLive.pipe(Layer.provide(AppConfigLive))
const HttpClientLayer = HttpClientLive.pipe(Layer.provide(AuthLayer))
const ScraperLayer = ScraperLive.pipe(
  Layer.provide(Layer.mergeAll(HttpClientLayer, AppConfigLive)),
)
const CachedHttpClientLayer = CachedHttpClientLive.pipe(
  Layer.provide(Layer.mergeAll(HttpClientLayer, RedisLayer)),
)
const AiLayer = AiLive.pipe(
  Layer.provide(Layer.mergeAll(RedisLayer, AppConfigLive)),
)

export const AppLayer = Layer.mergeAll(
  AppConfigLive,
  LoggerLive,
  AuthLayer,
  RedisLayer,
  BlueskyLive.pipe(Layer.provide(AppConfigLive)),
  HttpClientLayer,
  ScraperLayer,
  CachedHttpClientLayer,
  AiLayer,
)
