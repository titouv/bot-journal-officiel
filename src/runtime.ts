import { Cause, Effect, Exit } from "effect"

export function runEffect<A, E>(
  effect: Effect.Effect<A, E>,
): Promise<A> {
  return Effect.runPromise(effect)
}

export function renderError<E>(cause: Cause.Cause<E>): string {
  return Cause.pretty(cause)
}
