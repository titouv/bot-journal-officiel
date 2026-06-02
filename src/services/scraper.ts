import { Context, Duration, Effect, Layer, Schema } from "effect"
import { HttpClient } from "./http.ts"
import { ScraperError } from "./errors.ts"
import { AppConfig } from "./config.ts"
import {
  GetJorfContResponse,
  GetJosResponse,
  ConsultJorfResponse,
} from "./schemas.ts"

export class Scraper extends Context.Service<Scraper, {
  readonly listLastNJo: (n: number) => Effect.Effect<
    Schema.Schema.Type<typeof GetJorfContResponse> | null,
    ScraperError
  >
  readonly getJoSummary: (textCid: string) => Effect.Effect<
    Schema.Schema.Type<typeof GetJosResponse> | null,
    ScraperError
  >
  readonly getJoDetail: (textCid: string) => Effect.Effect<
    Schema.Schema.Type<typeof ConsultJorfResponse> | null,
    ScraperError
  >
}>("app/Scraper") {
  static readonly Live = Layer.effect(
    Scraper,
    Effect.gen(function* () {
      const http = yield* HttpClient
      const config = yield* AppConfig

      const listLastNJo = (n: number) =>
        http.postJSON("/consult/lastNJo", { nbElement: n }).pipe(
          Effect.flatMap((raw) =>
            Schema.decodeUnknownEffect(GetJorfContResponse)(raw)
          ),
          Effect.catchAll(() => Effect.succeed(null)),
        )

      const getJoSummary = (textCid: string) =>
        http.postJSON("/consult/jorfCont", {
          id: textCid,
          pageNumber: 1,
          pageSize: 10,
          highlightActivated: "false",
        }).pipe(
          Effect.flatMap((raw) =>
            Schema.decodeUnknownEffect(GetJosResponse)(raw)
          ),
          Effect.catchAll(() => Effect.succeed(null)),
        )

      const getJoDetail = (textCid: string) =>
        http.postJSON("/consult/jorf", { textCid }).pipe(
          Effect.flatMap((raw) =>
            Schema.decodeUnknownEffect(ConsultJorfResponse)(raw)
          ),
          Effect.catchAll(() => Effect.succeed(null)),
        )

      return Scraper.of({ listLastNJo, getJoSummary, getJoDetail })
    }),
  )
}
