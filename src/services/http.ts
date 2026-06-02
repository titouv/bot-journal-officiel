import { Context, Effect, Layer } from "effect"
import { Auth } from "./auth.ts"
import { Redis } from "./redis.ts"
import { ScraperError } from "./errors.ts"

export interface HttpClient {
  readonly postJSON: (
    endpoint: string,
    body: unknown,
  ) => Effect.Effect<unknown, ScraperError>
}

export const HttpClient = Context.Service<HttpClient>("HttpClient")

const BASE_URL = "https://sandbox-api.piste.gouv.fr/dila/legifrance/lf-engine-app"

const readBodySafe = (response: Response) =>
  Effect.tryPromise({ try: () => response.text(), catch: () => "" as never }).pipe(
    Effect.catch(() => Effect.succeed("<failed to read body>")),
  )

export const HttpClientLive = Layer.effect(
  HttpClient,
  Effect.gen(function* () {
    const auth = yield* Auth

    const postJSON = (
      endpoint: string,
      body: unknown,
    ): Effect.Effect<unknown, ScraperError> =>
      Effect.gen(function* () {
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
          return yield* Effect.fail(
            new ScraperError({ status: response.status, message: `HTTP ${response.status}`, body: text }),
          )
        }

        const data = yield* Effect.tryPromise({
          try: () => response.json() as Promise<unknown>,
          catch: (e) => new ScraperError({ status: response.status, message: `Parse error: ${e}` }),
        })

        return data
      })

    return { postJSON } satisfies HttpClient
  }),
)

export const CachedHttpClient = Context.Service<HttpClient>("CachedHttpClient")

export const CachedHttpClientLive = Layer.effect(
  CachedHttpClient,
  Effect.gen(function* () {
    const inner = yield* HttpClient
    const redis = yield* Redis

    const postJSON = (
      endpoint: string,
      body: unknown,
    ): Effect.Effect<unknown, ScraperError> =>
      Effect.gen(function* () {
        const cacheKey = JSON.stringify({ endpoint, body })
        const cached = yield* redis.get(cacheKey).pipe(
          Effect.catch(() => Effect.succeed(null)),
        )
        if (cached !== null) {
          yield* Effect.log(`Cache hit: ${endpoint}`)
          return JSON.parse(cached) as unknown
        }
        yield* Effect.log(`Cache miss: ${endpoint}`)
        const data = yield* inner.postJSON(endpoint, body)
        yield* redis.set(cacheKey, JSON.stringify(data)).pipe(Effect.ignore)
        return data
      })

    return { postJSON } satisfies HttpClient
  }),
)
