import { Config, Context, Effect, Layer } from "effect"

export class AppConfig extends Context.Service<AppConfig, {
  readonly blueskyUsername: string
  readonly blueskyPassword: string
  readonly googleAiApiKey: string
  readonly redisUrl: string
  readonly pisteClientId: string
  readonly pisteClientSecret: string
  readonly wait: boolean
}>()("app/AppConfig") {
  static readonly Live = Layer.effect(
    AppConfig,
    Effect.gen(function* () {
      const wait = yield* Config.boolean("WAIT").pipe(Config.withDefault(true))
      return AppConfig.of({
        blueskyUsername: yield* Config.string("BLUESKY_USERNAME"),
        blueskyPassword: yield* Config.string("BLUESKY_PASSWORD"),
        googleAiApiKey: yield* Config.string("GOOGLE_GENERATIVE_AI_API_KEY"),
        redisUrl: yield* Config.string("REDIS_URL"),
        pisteClientId: yield* Config.string("PISTE_CLIENT_ID"),
        pisteClientSecret: yield* Config.string("PISTE_CLIENT_SECRET"),
        wait,
      })
    }),
  )
}
