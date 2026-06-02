import { Context, Effect, Layer } from "effect"
import { createClient } from "redis"
import type { RedisClientType } from "redis"
import { AppConfig } from "./config.ts"
import { RedisError } from "./errors.ts"

export class Redis extends Context.Service<Redis, {
  readonly get: (key: string) => Effect.Effect<string | null, RedisError>
  readonly set: (key: string, value: string) => Effect.Effect<void, RedisError>
  readonly del: (key: string) => Effect.Effect<void, RedisError>
  readonly keys: (pattern: string) => Effect.Effect<string[], RedisError>
}>()("app/Redis") {
  static readonly Live = Layer.effect(
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
          catch: (e) => new RedisError({ message: `Failed to connect: ${e}` }),
        }),
        () =>
          Effect.tryPromise({
            try: () => client.quit().then(() => undefined as void),
            catch: () => undefined,
          }).pipe(Effect.ignore),
      )

      const get = Effect.fn("Redis.get")(
        function*(key: string): Effect.fn.Return<string | null, RedisError> {
          return yield* Effect.tryPromise({
            try: () => client.get(key),
            catch: (e) => new RedisError({ message: `Redis get failed: ${e}` }),
          })
        },
      )

      const set = Effect.fn("Redis.set")(
        function*(key: string, value: string): Effect.fn.Return<void, RedisError> {
          return yield* Effect.tryPromise({
            try: () => client.set(key, value).then(() => undefined as void),
            catch: (e) => new RedisError({ message: `Redis set failed: ${e}` }),
          })
        },
      )

      const del = Effect.fn("Redis.del")(
        function*(key: string): Effect.fn.Return<void, RedisError> {
          return yield* Effect.tryPromise({
            try: () => client.del(key).then(() => undefined as void),
            catch: (e) => new RedisError({ message: `Redis del failed: ${e}` }),
          })
        },
      )

      const keys = Effect.fn("Redis.keys")(
        function*(pattern: string): Effect.fn.Return<string[], RedisError> {
          return yield* Effect.tryPromise({
            try: () => client.keys(pattern),
            catch: (e) => new RedisError({ message: `Redis keys failed: ${e}` }),
          })
        },
      )

      return Redis.of({ get, set, del, keys })
    }),
  )
}
