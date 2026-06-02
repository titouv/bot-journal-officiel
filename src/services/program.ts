import { Duration, Effect } from "effect"
import { Scraper } from "./scraper.ts"
import type { Tm, ConsultJorfResponse } from "./schemas.ts"
import { Bluesky } from "./bluesky.ts"
import type { Tweet } from "./bluesky.ts"
import { Ai } from "./ai.ts"
import { AppConfig } from "./config.ts"

const ALL_POSSIBLE_TITLES = [
  "LOIS",
  "Décrets, arrêtés, circulaires",
  "Conseil constitutionnel",
  "Conseil économique, social et environnemental",
  "Autorité de régulation de la communication audiovisuelle et numérique",
  "Commission nationale des comptes de campagne et des financements politiques",
  "Naturalisations et réintégrations",
  "Informations parlementaires",
  "Présidence de la République",
  "Autorité nationale des jeux",
  "Avis et communications",
  "Annonces",
  "Autorité de contrôle prudentiel et de résolution",
  "Commission nationale de l'informatique et des libertés",
] as const

type Title = (typeof ALL_POSSIBLE_TITLES)[number]

const TITLE_TO_FILTER: Title[] = [
  "Présidence de la République",
  "LOIS",
  "Décrets, arrêtés, circulaires",
]

function removeHtml(text: string): string {
  return text.replace(/<[^>]*>?/g, "")
}

function renderJoToMarkdownSubForTableOfContents(
  originalTms: Tm[] | undefined,
  index: number = 0,
): string {
  if (!originalTms) return "No content found."
  return originalTms
    .map((e) => {
      const title = `${"  ".repeat(index)}- ${e.titre}`
      const liensTxt = e.liensTxt
        .map((lien) => `${"  ".repeat(index + 1)}- ${lien.titre}`)
        .join("")
      const tms = renderJoToMarkdownSubForTableOfContents(e.tms, index + 1)
      return `${title}\n${liensTxt ? `${liensTxt}\n` : ""}${tms}`
    })
    .join("\n")
}

function renderJoToMarkdownSub(
  originalTms: Tm[] | undefined,
  date: string,
  allLienDetails: Record<string, ConsultJorfResponse>,
  index: number = 0,
): string {
  if (!originalTms) return "No content found."
  return originalTms
    .map((e) => {
      const title = `${"#".repeat(index + 1)} ${e.titre}${
        index === 0 ? ` (${date})` : ""
      }`
      const liensTxt = e.liensTxt
        .map((lien) => {
          const element = allLienDetails[lien.id]
          return `${"#".repeat(index + 2)} ${lien.titre}, ${lien.ministere}, ${lien.autorite}\n\n${
            element?.articles
              .map((a) => removeHtml(a.content))
              .map((c) => `${c}\n`)
              .join("\n") ?? ""
          }`
        })
        .join("\n")
      const tms = renderJoToMarkdownSub(e.tms, date, allLienDetails, index + 1)
      return `${title}\n\n${liensTxt ? `${liensTxt}\n` : ""}${tms}`
    })
    .join("\n\n")
}

function getAllLienIdToFetch(originalTms: Tm[] | undefined): string[] {
  if (!originalTms || originalTms.length === 0) return []
  const tmsForThisLevel = originalTms.flatMap((e) => e.tms)
  const liensForTms = tmsForThisLevel
    ? getAllLienIdToFetch(tmsForThisLevel)
    : []
  const liensTxtForThisLevel = originalTms.flatMap((e) => e.liensTxt)
  return [
    ...liensForTms,
    ...liensTxtForThisLevel.map((e) => e.id),
  ]
}

function fetchAllLiens(
  scraper: Scraper,
  originalTms: Tm[] | undefined,
  wait: boolean,
): Effect.Effect<Record<string, ConsultJorfResponse>> {
  const allLienIds = getAllLienIdToFetch(originalTms)
  return Effect.forEach(allLienIds, (id) =>
    Effect.gen(function* () {
      const detail = yield* scraper.getJoDetail(id).pipe(
        Effect.catch(() => Effect.succeed(null)),
      )
      if (wait) yield* Effect.sleep(Duration.millis(1000 + Math.random() * 1000))
      return { id, detail }
    }),
  ).pipe(
    Effect.map((results) => {
      const acc: Record<string, ConsultJorfResponse> = {}
      for (const { id, detail } of results) {
        if (detail) acc[id] = detail
      }
      return acc
    }),
  )
}

function renderJoToMarkdown(
  scraper: Scraper,
  joSummaryResponse: { items: Array<{ joCont: { structure: { tms: Tm[] } } }> },
  date: string,
  wait: boolean,
): Effect.Effect<string> {
  const journalOfficiel = joSummaryResponse.items[0]?.joCont?.structure.tms
    .find((e) => e.titre === 'Journal officiel "Lois et Décrets"')

  if (!journalOfficiel) {
    return Effect.succeed("Journal officiel 'Lois et Décrets' not found.")
  }

  const tmsFiltered = journalOfficiel.tms.filter((e) =>
    TITLE_TO_FILTER.includes(e.titre as Title),
  )

  const tableOfContents = renderJoToMarkdownSubForTableOfContents(tmsFiltered)

  return Effect.gen(function* () {
    const allLienDetails = yield* fetchAllLiens(scraper, tmsFiltered, wait)
    const selectedElements = renderJoToMarkdownSub(
      tmsFiltered,
      date,
      allLienDetails,
    )
    return `Table of contents:\n\n${tableOfContents}\n\n\n${selectedElements}`
  })
}

export const handleCron = Effect.gen(function* () {
  const scraper = yield* Scraper
  const ai = yield* Ai
  const bluesky = yield* Bluesky
  const config = yield* AppConfig

  const lastNJoResponse = yield* scraper.listLastNJo(1)

  if (!lastNJoResponse) {
    return yield* Effect.fail(new Error("call to listLastNJo failed"))
  }

  const firstContainer = lastNJoResponse.containers[0]
  const containerDate = new Date(firstContainer.datePubli)

  const dateFr = containerDate.toLocaleDateString("fr-FR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  const joSummaryResponse = yield* scraper.getJoSummary(firstContainer.id)
  if (!joSummaryResponse) {
    return yield* Effect.fail(new Error("No JO summary response found"))
  }

  const markdown = yield* renderJoToMarkdown(
    scraper,
    joSummaryResponse,
    dateFr,
    config.wait,
  )

  const aiResult = yield* ai.generateTweets(markdown)

  const year = containerDate.getFullYear()
  const month = containerDate.getMonth() + 1
  const day = containerDate.getDate()
  const dateStr = `${day.toString().padStart(2, "0")}/${month.toString().padStart(2, "0")}/${year}`
  const url = `https://www.legifrance.gouv.fr/jorf/jo/${year}/${month.toString().padStart(2, "0")}/${day.toString().padStart(2, "0")}/${firstContainer.num}`

  const tweets: Tweet[] = aiResult.tweets.map((tweet, i) => ({
    text: tweet.content,
    linkDetails: i === 0
      ? {
        title: `JO ${dateStr} - ${aiResult.title}`,
        link: url,
        description: tweet.content,
      }
      : undefined,
  }))

  yield* bluesky.postThread(tweets)

  return {
    url,
    title: aiResult.title,
    tweets: aiResult.tweets,
    date: dateStr,
  }
})

export const previewOg = Effect.gen(function* () {
  const scraper = yield* Scraper

  const lastNJoResponse = yield* scraper.listLastNJo(1)
  if (!lastNJoResponse || !lastNJoResponse.containers[0]) {
    return yield* Effect.fail(new Error("No JO found"))
  }

  const firstContainer = lastNJoResponse.containers[0]
  const joSummaryResponse = yield* scraper.getJoSummary(firstContainer.id)
  if (!joSummaryResponse) {
    return yield* Effect.fail(new Error("No JO summary"))
  }

  const containerDate = new Date(firstContainer.datePubli)
  const dateFr = containerDate.toLocaleDateString("fr-FR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  const markdown = yield* renderJoToMarkdown(scraper, joSummaryResponse, dateFr, false)

  const ai = yield* Ai
  const aiResult = yield* ai.generateTweets(markdown)

  const year = containerDate.getFullYear()
  const month = containerDate.getMonth() + 1
  const day = containerDate.getDate()
  const dateStr = `${day.toString().padStart(2, "0")}/${month.toString().padStart(2, "0")}/${year}`

  const ogImageUrl =
    `http://localhost:8000/og?text=${encodeURIComponent(aiResult.title)}&date=${encodeURIComponent(dateStr)}`

  return {
    url: `https://www.legifrance.gouv.fr/jorf/jo/${year}/${month.toString().padStart(2, "0")}/${day.toString().padStart(2, "0")}/${firstContainer.num}`,
    title: aiResult.title,
    preview: ogImageUrl,
  }
})
