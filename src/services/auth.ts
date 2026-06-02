import { Context, Duration, Effect, Layer, Ref, Schedule } from "effect"
import { AppConfig } from "./config.ts"
import { AuthError } from "./errors.ts"

export interface CachedToken {
  readonly access_token: string
  readonly expiresAt: number
}

export class Auth extends Context.Service<Auth, {
  readonly getToken: Effect.Effect<string, AuthError>
}>("app/Auth") {
  static readonly Live = Layer.effect(
    Auth,
    Effect.gen(function* () {
      const config = yield* AppConfig
      const tokenRef = yield* Ref.make<CachedToken | null>(null)

      const getToken = Effect.gen(function* () {
        const current = yield* Ref.get(tokenRef)
        if (current && !isExpired(current)) {
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
        ).pipe(
          Effect.retry(retryPolicy),
        )
        yield* Ref.set(tokenRef, fresh)
        return fresh.access_token
      })

      return Auth.of({ getToken })
    }),
  )
}

const TOKEN_URL = "https://sandbox-oauth.piste.gouv.fr/api/oauth/token"

const TOKEN_BUFFER_MS = 30_000

const fetchToken = (clientId: string, clientSecret: string) =>
  Effect.tryPromise({
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
      }).then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new AuthError({ message: `Token request failed: ${JSON.stringify(body)}` })
        }
        const data = await res.json() as { access_token: string; expires_in: number }
        return {
          access_token: data.access_token,
          expiresAt: Date.now() + data.expires_in * 1000,
        } satisfies CachedToken
      }),
    catch: (e) =>
      e instanceof AuthError ? e : new AuthError({ message: `Token fetch error: ${e}` }),
  })

const isExpired = (token: CachedToken): boolean =>
  Date.now() + TOKEN_BUFFER_MS >= token.expiresAt
