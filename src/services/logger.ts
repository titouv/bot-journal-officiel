import { Context, Effect, Layer } from "effect"

export class Logger extends Context.Service<Logger, {
  readonly log: (msg: string) => Effect.Effect<void>
  readonly error: (msg: string) => Effect.Effect<void>
  readonly warn: (msg: string) => Effect.Effect<void>
}>()("app/Logger") {
  static readonly Live = Layer.succeed(Logger)({
    log: (msg) => Effect.log(msg),
    error: (msg) => Effect.logError(msg),
    warn: (msg) => Effect.logWarning(msg),
  })
}
