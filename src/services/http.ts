import { Context, Effect, Layer } from "effect"
import { Auth } from "./auth.ts"
import { Redis } from "./redis.ts"
import { ScraperError } from "./errors.ts"

export class HttpClient extends Context.Service<HttpClient, {
  readonly postJSON: (
    endpoint: string,
    body: unknown,
  ) => Effect.Effect<unknown, ScraperError>
}>()("app/HttpClient") {
  static readonly Live = Layer.effect(
    HttpClient,
    Effect.gen(function* () {
      const auth = yield* Auth

      const postJSON = Effect.fn("HttpClient.postJSON")(
        function*(endpoint: string, body: unknown): Effect.fn.Return<unknown, ScraperError> {
          const token = yield* auth.getToken.pipe(
            Effect.mapError((e) => new ScraperError({ status: 0, message: e.message })),
          )
          const response = yield* Effect.tryPromise({
            try: () =>
              fetch(`${BASE_URL}${endpoint}`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(body),
              }),
            catch: (e) =>
              new ScraperError({ status: 0, message: `Network error: ${e}` }),
          })

          if (!response.ok) {
            const text = yield* readBodySafe(response)
            return yield* new ScraperError({ status: response.status, message: `HTTP ${response.status}`, body: text })
          }

          const data = yield* Effect.tryPromise({
            try: () => response.json() as Promise<unknown>,
            catch: (e) => new ScraperError({ status: response.status, message: `Parse error: ${e}` }),
          })

          return data
        },
        Effect.annotateLogs({ service: "http", method: "postJSON" }),
      )

      return HttpClient.of({ postJSON })
    }),
  )
}

const BASE_URL = "https://sandbox-api.piste.gouv.fr/dila/legifrance/lf-engine-app"

const readBodySafe = Effect.fn("HttpClient.readBodySafe")(
  function*(response: Response): Effect.fn.Return<string> {
    return yield* Effect.tryPromise({
      try: () => response.text(),
      catch: () => "" as never,
    }).pipe(
      Effect.catch(() => Effect.succeed("<failed to read body>")),
    )
  },
  Effect.annotateLogs({ service: "http" }),
)

export class CachedHttpClient extends Context.Service<CachedHttpClient, {
  readonly postJSON: (
    endpoint: string,
    body: unknown,
  ) => Effect.Effect<unknown, ScraperError>
}>()("app/CachedHttpClient") {
  static readonly Live = Layer.effect(
    CachedHttpClient,
    Effect.gen(function* () {
      const inner = yield* HttpClient
      const redis = yield* Redis

      const postJSON = Effect.fn("CachedHttpClient.postJSON")(
        function*(endpoint: string, body: unknown): Effect.fn.Return<unknown, ScraperError> {
          const cacheKey = JSON.stringify({ endpoint, body })
          const cached = yield* redis.get(cacheKey).pipe(
            Effect.catchTag("RedisError", () => Effect.succeed(null)),
          )
          if (cached !== null) {
            yield* Effect.log(`Cache hit: ${endpoint}`)
            return JSON.parse(cached) as unknown
          }
          yield* Effect.log(`Cache miss: ${endpoint}`)
          const data = yield* inner.postJSON(endpoint, body)
          yield* redis.set(cacheKey, JSON.stringify(data)).pipe(Effect.ignore)
          return data
        },
        Effect.annotateLogs({ service: "http", method: "cachedPostJSON" }),
      )

      return CachedHttpClient.of({ postJSON })
    }),
  )
}
