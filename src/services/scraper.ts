import { Context, Duration, Effect, Layer } from "effect"
import { HttpClient } from "./http.ts"
import { ScraperError } from "./errors.ts"
import { AppConfig } from "./config.ts"

export interface Conteneur {
  readonly etat: string
  readonly id: string
  readonly titre: string
  readonly datePubli: number
  readonly origine: string
  readonly nature: string
  readonly cid: string
  readonly num: string
  readonly url: string
}

export interface GetJorfContResponse {
  readonly totalNbResult: number
  readonly containers: Conteneur[]
}

export interface Lien {
  readonly autorite: string
  readonly etat: string
  readonly id: string
  readonly titre: string
  readonly ministere: string
  readonly emetteur: string
  readonly nature: string
}

export interface Tm {
  readonly liensTxt: Lien[]
  readonly ordre: number
  readonly tms: Tm[]
  readonly titre: string
  readonly niv: number
}

export interface GetJosResponse {
  readonly totalNbResult: number
  readonly items: GetJosResponseItem[]
}

export interface GetJosResponseItem {
  readonly joCont: JoCont
}

export interface JoCont {
  readonly structure: Structure
  readonly id: string
  readonly titre: string
}

export interface Structure {
  readonly liens: Lien[]
  readonly tms: Tm[]
}

export interface ConsultJorfResponse {
  readonly id: string
  readonly title: string
  readonly nor: string
  readonly articles: ConsultArticle[]
  readonly nature: string
}

export interface ConsultArticle {
  readonly content: string
  readonly num: string
}

export interface Scraper {
  readonly listLastNJo: (n: number) => Effect.Effect<GetJorfContResponse | null, ScraperError>
  readonly getJoSummary: (textCid: string) => Effect.Effect<GetJosResponse | null, ScraperError>
  readonly getJoDetail: (textCid: string) => Effect.Effect<ConsultJorfResponse | null, ScraperError>
}

export const Scraper = Context.Service<Scraper>("Scraper")

export const ScraperLive = Layer.effect(
  Scraper,
  Effect.gen(function* () {
    const http = yield* HttpClient
    const config = yield* AppConfig

    const listLastNJo = (n: number) =>
      Effect.gen(function* () {
        const data = yield* http.postJSON(
          "/consult/lastNJo",
          { nbElement: n },
        )
        return data as GetJorfContResponse | null
      }).pipe(
        Effect.catch(() => Effect.succeed(null as GetJorfContResponse | null)),
      )

    const getJoSummary = (textCid: string) =>
      Effect.gen(function* () {
        const data = yield* http.postJSON(
          "/consult/jorfCont",
          {
            id: textCid,
            pageNumber: 1,
            pageSize: 10,
            highlightActivated: "false",
          },
        )
        return data as GetJosResponse | null
      }).pipe(
        Effect.catch(() => Effect.succeed(null as GetJosResponse | null)),
      )

    const getJoDetail = (textCid: string) =>
      Effect.gen(function* () {
        const data = yield* http.postJSON("/consult/jorf", { textCid })
        return data as ConsultJorfResponse | null
      }).pipe(
        Effect.catch(() => Effect.succeed(null as ConsultJorfResponse | null)),
      )

    return {
      listLastNJo,
      getJoSummary,
      getJoDetail,
    } satisfies Scraper
  }),
)
