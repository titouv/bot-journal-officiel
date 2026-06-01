import { Context, Effect, Layer } from "effect"

export interface Logger {
  readonly log: (msg: string) => Effect.Effect<void>
  readonly error: (msg: string) => Effect.Effect<void>
  readonly warn: (msg: string) => Effect.Effect<void>
}

export const Logger = Context.Service<Logger>("Logger")

export const LoggerLive = Layer.succeed(Logger, {
  log: (msg) => Effect.log(msg),
  error: (msg) => Effect.logError(msg),
  warn: (msg) => Effect.logWarning(msg),
})
