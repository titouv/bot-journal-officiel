import { Context, Effect, Layer } from "effect"
import { createClient } from "redis"
import type { RedisClientType } from "redis"
import { AppConfig } from "./config.ts"
import { RedisError } from "./errors.ts"

export interface Redis {
  readonly get: (key: string) => Effect.Effect<string | null, RedisError>
  readonly set: (key: string, value: string) => Effect.Effect<void, RedisError>
  readonly del: (key: string) => Effect.Effect<void, RedisError>
  readonly keys: (pattern: string) => Effect.Effect<string[], RedisError>
}

export const Redis = Context.Service<Redis>("Redis")

export const RedisLive = Layer.effect(
  Redis,
  Effect.gen(function* () {
    const config = yield* AppConfig
    const client: RedisClientType = createClient({
      url: config.redisUrl,
      pingInterval: 5000,
      socket: { keepAlive: true },
    })

    client.on("error", (err) => console.error("Redis Client Error", err))
    client.on("reconnecting", () => console.log("Redis is reconnecting..."))

    yield* Effect.acquireRelease(
      Effect.tryPromise({
        try: () => client.connect().then(() => undefined as void),
        catch: (e) => new RedisError(`Failed to connect: ${e}`),
      }),
      () =>
        Effect.tryPromise({
          try: () => client.quit().then(() => undefined as void),
          catch: () => undefined,
        }).pipe(Effect.ignore),
    )

    const safeGet = (key: string) =>
      Effect.tryPromise({
        try: () => client.get(key),
        catch: (e) => new RedisError(`Redis get failed: ${e}`),
      })

    const safeSet = (key: string, value: string) =>
      Effect.tryPromise({
        try: () => client.set(key, value).then(() => undefined as void),
        catch: (e) => new RedisError(`Redis set failed: ${e}`),
      })

    const safeDel = (key: string) =>
      Effect.tryPromise({
        try: () => client.del(key).then(() => undefined as void),
        catch: (e) => new RedisError(`Redis del failed: ${e}`),
      })

    const safeKeys = (pattern: string) =>
      Effect.tryPromise({
        try: () => client.keys(pattern),
        catch: (e) => new RedisError(`Redis keys failed: ${e}`),
      })

    return {
      get: safeGet,
      set: safeSet,
      del: safeDel,
      keys: safeKeys,
    } satisfies Redis
  }),
)
