import { Context, Duration, Effect, Layer, Schema } from "effect"
import { HttpClient } from "./http.ts"
import { ScraperError } from "./errors.ts"
import { AppConfig } from "./config.ts"
import {
  GetJorfContResponse,
  GetJosResponse,
  ConsultJorfResponse,
} from "./schemas.ts"

export interface ScraperService {
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
}

export class Scraper extends Context.Service<Scraper, ScraperService>()("app/Scraper") {
  static readonly Live = Layer.effect(
    Scraper,
    Effect.gen(function* () {
      const http = yield* HttpClient
      const config = yield* AppConfig

      const listLastNJo = Effect.fn("Scraper.listLastNJo")(
        function* (n: number): Effect.fn.Return<
          Schema.Schema.Type<typeof GetJorfContResponse> | null,
          ScraperError
        > {
          const raw = yield* http.postJSON("/consult/lastNJo", { nbElement: n })
          const result = yield* Schema.decodeUnknownEffect(GetJorfContResponse)(raw).pipe(
            Effect.catchTag("ParseError", () => Effect.succeed(null)),
          )
          return result
        },
        Effect.catchTag("ScraperError", () => Effect.succeed(null)),
        Effect.annotateLogs({ service: "scraper" }),
      )

      const getJoSummary = Effect.fn("Scraper.getJoSummary")(
        function* (textCid: string): Effect.fn.Return<
          Schema.Schema.Type<typeof GetJosResponse> | null,
          ScraperError
        > {
          const raw = yield* http.postJSON("/consult/jorfCont", {
            id: textCid,
            pageNumber: 1,
            pageSize: 10,
            highlightActivated: "false",
          })
          const result = yield* Schema.decodeUnknownEffect(GetJosResponse)(raw).pipe(
            Effect.catchTag("ParseError", () => Effect.succeed(null)),
          )
          return result
        },
        Effect.catchTag("ScraperError", () => Effect.succeed(null)),
        Effect.annotateLogs({ service: "scraper" }),
      )

      const getJoDetail = Effect.fn("Scraper.getJoDetail")(
        function* (textCid: string): Effect.fn.Return<
          Schema.Schema.Type<typeof ConsultJorfResponse> | null,
          ScraperError
        > {
          const raw = yield* http.postJSON("/consult/jorf", { textCid })
          const result = yield* Schema.decodeUnknownEffect(ConsultJorfResponse)(raw).pipe(
            Effect.catchTag("ParseError", () => Effect.succeed(null)),
          )
          return result
        },
        Effect.catchTag("ScraperError", () => Effect.succeed(null)),
        Effect.annotateLogs({ service: "scraper" }),
      )

      return Scraper.of({ listLastNJo, getJoSummary, getJoDetail })
    }),
  )
}
