import { Context, Duration, Effect, Layer, Ref, Schedule } from "effect"
import { AppConfig } from "./config.ts"
import { AuthError } from "./errors.ts"

export interface OAuthToken {
  readonly access_token: string
  readonly expires_in: number
}

export interface Auth {
  readonly getToken: Effect.Effect<string, AuthError>
}

export const Auth = Context.Service<Auth>("Auth")

const TOKEN_URL = "https://sandbox-oauth.piste.gouv.fr/api/oauth/token"

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
          throw new AuthError(`Token request failed: ${JSON.stringify(body)}`)
        }
        return res.json() as Promise<OAuthToken>
      }),
    catch: (e) =>
      e instanceof AuthError ? e : new AuthError(`Token fetch error: ${e}`),
  })

const isExpired = (token: OAuthToken): boolean => {
  const buffer = 30_000
  return (token.expires_in * 1000) - buffer <= 0
}

export const AuthLive = Layer.effect(
  Auth,
  Effect.gen(function* () {
    const config = yield* AppConfig
    const tokenRef = yield* Ref.make<OAuthToken | null>(null)

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
      const fresh = yield* fetchToken(config.pisteClientId, config.pisteClientSecret).pipe(
        Effect.retry(retryPolicy),
      )
      yield* Ref.set(tokenRef, fresh)
      return fresh.access_token
    })

    return { getToken } satisfies Auth
  }),
)
