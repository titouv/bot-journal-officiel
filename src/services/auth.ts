import { Clock, Context, Duration, Effect, Layer, Ref, Schedule } from "effect"
import { AppConfig } from "./config.ts"
import { AuthError } from "./errors.ts"

export interface CachedToken {
  readonly access_token: string
  readonly expiresAt: number
}

export class Auth extends Context.Service<Auth, {
  readonly getToken: Effect.Effect<string, AuthError>
}>()("app/Auth") {
  static readonly Live = Layer.effect(
    Auth,
    Effect.gen(function* () {
      const config = yield* AppConfig
      const tokenRef = yield* Ref.make<CachedToken | null>(null)

      const getToken: Effect.Effect<string, AuthError> = Effect.fn("Auth.getToken")(
        function*(): Effect.fn.Return<string, AuthError> {
          const current = yield* Ref.get(tokenRef)
          const now = yield* Clock.currentTimeMillis
          if (current && !isExpired(current, now)) {
            yield* Effect.log("using cached token")
            return current.access_token
          }
          yield* Effect.log("fetching new token")
          const retryPolicy = Schedule.recurs(3).pipe(
            Schedule.addDelay(() => Effect.succeed(Duration.millis(200))),
          )
          const fresh = yield* fetchToken(
            config.pisteClientId,
            config.pisteClientSecret,
            now,
          ).pipe(
            Effect.retry(retryPolicy),
          )
          yield* Ref.set(tokenRef, fresh)
          return fresh.access_token
        },
      )

      return Auth.of({ getToken })
    }),
  )
}

const TOKEN_URL = "https://sandbox-oauth.piste.gouv.fr/api/oauth/token"

const TOKEN_BUFFER_MS = 30_000

const fetchToken = Effect.fn("Auth.fetchToken")(
  function*(
    clientId: string,
    clientSecret: string,
    now: number,
  ): Effect.fn.Return<CachedToken, AuthError> {
    const response = yield* Effect.tryPromise({
      try: () =>
        fetch(TOKEN_URL, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            grant_type: "client_credentials",
            client_id: clientId,
            client_secret: clientSecret,
            scope: "openid",
          }),
        }),
      catch: (e) => new AuthError({ message: `Network error: ${e}` }),
    })
    if (!response.ok) {
      const body = yield* Effect.tryPromise({
        try: () => response.json() as Promise<unknown>,
        catch: () => ({}),
      })
      return yield* new AuthError({ message: `Token request failed: ${JSON.stringify(body)}` })
    }
    const data = yield* Effect.tryPromise({
      try: () => response.json() as Promise<{ access_token: string; expires_in: number }>,
      catch: (e) => new AuthError({ message: `Parse error: ${e}` }),
    })
    return {
      access_token: data.access_token,
      expiresAt: now + data.expires_in * 1000,
    }
  },
)

const isExpired = (token: CachedToken, now: number): boolean =>
  now + TOKEN_BUFFER_MS >= token.expiresAt
