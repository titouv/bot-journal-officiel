import { Context, Effect, Layer } from "effect"
import { generateObject } from "ai"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import type { GoogleGenerativeAIProviderOptions } from "@ai-sdk/google"
import { wrapLanguageModel } from "ai"
import type { LanguageModelV1Middleware } from "ai"
import crypto from "node:crypto"
import { z } from "zod"
import { Redis } from "./redis.ts"
import { AppConfig } from "./config.ts"
import { AiError } from "./errors.ts"

export class Ai extends Context.Service<Ai, {
  readonly generateTweets: (
    markdown: string,
  ) => Effect.Effect<{ title: string; tweets: Array<{ content: string }> }, AiError>
}>()("app/Ai") {
  static readonly Live = Layer.effect(
    Ai,
    Effect.gen(function* () {
      const config = yield* AppConfig
      const redis = yield* Redis

      const google = createGoogleGenerativeAI({
        apiKey: config.googleAiApiKey,
      })

      const model = google("gemini-2.5-flash")

      const cacheMiddleware: LanguageModelV1Middleware = {
        wrapGenerate: async ({ doGenerate, params }) => {
          const cacheKey = hash(JSON.stringify(params))
          const cached = await Effect.runPromise(redis.get(cacheKey)).catch(
            () => null,
          )
          if (cached !== null) {
            return JSON.parse(cached)
          }
          const result = await doGenerate()
          await Effect.runPromise(
            redis.set(cacheKey, JSON.stringify(result)).pipe(Effect.ignore),
          )
          return result
        },
      }

      const cachedModel = wrapLanguageModel({
        model,
        middleware: cacheMiddleware,
      })

      const generateTweets = (
        markdown: string,
      ): Effect.Effect<
        { title: string; tweets: Array<{ content: string }> },
        AiError
      > =>
        Effect.tryPromise({
          try: () =>
            generateObject({
              model: cachedModel,
              system: systemPrompt,
              schema: aiResponseSchema,
              prompt: markdown,
              providerOptions: {
                google: {
                  thinkingConfig: { includeThoughts: true },
                } satisfies GoogleGenerativeAIProviderOptions,
              },
            }).then((r) => r.object),
          catch: (e) => new AiError({ message: `AI generation failed: ${e}` }),
        })

      return Ai.of({ generateTweets })
    }),
  )
}

const aiResponseSchema = z.object({
  title: z.string(),
  tweets: z.array(
    z.object({
      content: z.string(),
    }),
  ),
})

const systemPrompt = [
  "Crée des tweets informatifs à partir du Journal officiel ci-dessous. Format de sortie attendu:",
  "",
  "1. Un tweet d'introduction résumant les principaux thèmes du JO, terminé par 🧵",
  "2. Entre 3 et 5 tweets détaillant les informations importantes, classées par ordre d'importance",
  "",
  "CRITÈRES DE SÉLECTION:",
  "- Impact direct sur la vie quotidienne",
  "- Changements majeurs de réglementation",
  "- Annonces gouvernementales importantes",
  "- Droits et obligations des citoyens",
  "",
  "RÈGLES DE RÉDACTION:",
  "- Ton factuel et objectif",
  "- Pas de numéros de textes",
  "- Pas de hashtags/mentions/liens",
  "- Pas de points d'exclamation",
  "- Utilisation d'emojis (avec parcimonie). 1 max par tweet.",
  "- Uniquement les nominations très importantes",
  "",
  "PROCESSUS:",
  "1. Analyse le JO pour identifier les sujets d'intérêt général",
  "2. Sélectionne les 3-5 informations les plus impactantes",
  "3. Rédige le tweet d'introduction",
  "4. Rédige les tweets détaillés par ordre d'importance",
  "5. Vérifie le respect des règles de format",
  "",
  "IMPORTANT: Adapte le nombre de tweets à la quantité d'informations pertinentes du jour.",
  "",
  "REMEMBER: Format = 1 tweet intro + 3-5 tweets détaillés maximum, classés par importance.",
  "IMPORTANT: Les tweets DOIVENT faire moins de 280 caractères.",
].join("\n")

const hash = (input: string) =>
  crypto.createHash("sha256").update(input).digest("hex")
