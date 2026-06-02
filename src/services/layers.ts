import { Layer } from "effect"
import { AppConfig } from "./config.ts"
import { Auth } from "./auth.ts"
import { Redis } from "./redis.ts"
import { HttpClient, CachedHttpClient } from "./http.ts"
import { Scraper } from "./scraper.ts"
import { Bluesky } from "./bluesky.ts"
import { Ai } from "./ai.ts"

// Dependency chain:
// AppConfig (root)
//   → Auth, Redis, Bluesky (depend on AppConfig)
//     → HttpClient (depends on Auth)
//       → Scraper (depends on HttpClient + AppConfig)
//       → CachedHttpClient (depends on HttpClient + Redis)
//   → Ai (depends on Redis + AppConfig)
//
// Each layer wraps its dependencies via provideMerge, building one layer at a time.

const AuthLayer = Auth.Live.pipe(Layer.provide(AppConfig.Live))
const RedisLayer = Redis.Live.pipe(Layer.provide(AppConfig.Live))
const HttpClientLayer = HttpClient.Live.pipe(Layer.provide(AuthLayer))
const ScraperLayer = Scraper.Live.pipe(
  Layer.provide(Layer.mergeAll(HttpClientLayer, AppConfig.Live)),
)
const CachedHttpClientLayer = CachedHttpClient.Live.pipe(
  Layer.provide(Layer.mergeAll(HttpClientLayer, RedisLayer)),
)
const AiLayer = Ai.Live.pipe(
  Layer.provide(Layer.mergeAll(RedisLayer, AppConfig.Live)),
)

export const AppLayer = Layer.mergeAll(
  AppConfig.Live,
  AuthLayer,
  RedisLayer,
  Bluesky.Live.pipe(Layer.provide(AppConfig.Live)),
  HttpClientLayer,
  ScraperLayer,
  CachedHttpClientLayer,
  AiLayer,
)
