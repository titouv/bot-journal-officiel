import { generateObject, generateText } from "ai";
import { getJoDetail, getJoSummary, listLastNJo } from "./scraper/index.ts";
import type {
  ConsultJorfResponse,
  GetJosResponse,
  Lien,
  Tm,
} from "./scraper/types.ts";
import { wrappedLanguageModel } from "./ai.ts";
import { z } from "zod";
import { env } from "../env.ts";
import { GoogleGenerativeAIProviderOptions } from "@ai-sdk/google";
import { getUrlForOgImage } from "../og.tsx";
import { err, ok, Result, ResultAsync } from "neverthrow";
import type { AppError } from "../errors.ts";
import { createApiError, createJournalError } from "../errors.ts";

type Test =
  | {
    titre: "LOIS";
    liensTxt: Lien[];
  }
  | {
    titre: "Décrets, arrêtés, circulaires";
    tms: (
      | {
        titre: "Textes généraux";
        tms: (
          | { titre: "Premier ministre"; liensTxt: Lien[] }
          | {
            titre:
              "Ministère de l'éducation nationale, de l'enseignement supérieur et de la recherche";
            liensTxt: Lien[];
          }
          | {
            titre:
              "Ministère du travail, de la santé, des solidarités et des familles";
            liensTxt: Lien[];
          }
          | {
            titre: "Ministère de l'intérieur";
            liensTxt: Lien[];
          }
          | { titre: "Ministère de la justice"; liensTxt: Lien[] }
        )[];
        liensTxt: Lien[];
      }
      | { titre: "Mesures nominatives"; liensTxt: Lien[] }
      | { titre: "Conventions collectives"; liensTxt: Lien[] }
    )[];
  }
  | {
    titre: "Informations parlementaires";
    tms: (
      | { titre: "Assemblée nationale"; liensTxt: Lien[] }
      | { titre: "Sénat"; liensTxt: Lien[] }
      | { titre: "Offices et délégations"; liensTxt: Lien[] }
      | { titre: "Commissions mixtes paritaires"; liensTxt: Lien[] }
    )[];
  }
  | { titre: "Annonces" };

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
  "Décrets, arrêtés, circulaires",
  "Autorité nationale des jeux",
  "Avis et communications",
  "Annonces",
  "Autorité de contrôle prudentiel et de résolution",
  "Commission nationale de l'informatique et des libertés",
] as const;

type Title = (typeof ALL_POSSIBLE_TITLES)[number];

function removeHtml(text: string): string {
  return text.replace(/<[^>]*>?/g, "");
}

function renderJoToMarkdownSubForTableOfContents(
  originalTms: Tm[] | undefined,
  date: string,
  index: number = 0,
): string {
  if (!originalTms) return "No content found. 🚫";

  const elements = originalTms.map((e) => {
    const title = `${"  ".repeat(index)}- ${e.titre}`;

    const liensTxt = e.liensTxt.map((lien) => {
      return `${"  ".repeat(index + 1)}- ${lien.titre}`;
    });

    const liensTxtJoined = liensTxt.join("");
    const tms = renderJoToMarkdownSubForTableOfContents(e.tms, date, index + 1);

    return `${title}\n${liensTxtJoined ? `${liensTxtJoined}\n` : ""}${tms}`;
  });

  return elements.join("\n");
}

function renderJoToMarkdownSub(
  originalTms: Tm[] | undefined,
  date: string,
  allLienDetails: Record<string, ConsultJorfResponse>,
  index: number = 0,
): string {
  if (!originalTms) return "No content found. 🚫";

  const elements = originalTms.map((e, mapIndex) => {
    const title = `${"#".repeat(index + 1)} ${e.titre}` +
      (index == 0 ? ` (${date})` : "");

    const liensTxt = e.liensTxt.map((lien, lienIndex) => {
      const element = allLienDetails[lien.id];
      return `${
        "#".repeat(index + 2)
      } ${lien.titre}, ${lien.ministere}, ${lien.autorite}\n\n${
        element?.articles
          .map((e) => removeHtml(e.content))
          .map((e) => `${e}\n`)
          .join("\n")
      }`;
    });

    const liensTxtJoined = liensTxt.join("\n");
    const tms = renderJoToMarkdownSub(e.tms, date, allLienDetails, index + 1);

    return `${title}\n\n${liensTxtJoined ? `${liensTxtJoined}\n` : ""}${tms}`;
  });

  return elements.join("\n\n");
}

function getAllLienIdToFetch(originalTms: Tm[] | undefined): string[] {
  if (!originalTms || originalTms.length === 0) return [];
  console.log("originalTms inside", originalTms);
  const tmsForThisLevel = originalTms?.flatMap((e) => e.tms);
  const liensForTms = tmsForThisLevel
    ? getAllLienIdToFetch(tmsForThisLevel)
    : [];
  const liensTxtForThisLevel = originalTms?.flatMap((e) => e.liensTxt);
  const allLienIds = [
    ...liensForTms,
    ...(liensTxtForThisLevel?.map((e) => e.id) ?? []),
  ];
  console.log("allLienIds", allLienIds);
  return allLienIds;
}

function fetchAllLiens(
  originalTms: Tm[] | undefined,
): ResultAsync<Record<string, ConsultJorfResponse>, AppError> {
  console.log("getAllLienIdToFetch");
  const allLienIds = getAllLienIdToFetch(originalTms);
  console.log("allLienIds", allLienIds);

  const fetchSequentially = (
    index: number,
    allLienDetails: Record<string, ConsultJorfResponse>,
  ): ResultAsync<Record<string, ConsultJorfResponse>, AppError> => {
    if (index >= allLienIds.length) {
      return ResultAsync.fromSafePromise(Promise.resolve(allLienDetails));
    }

    const id = allLienIds[index];
    console.log("fetching", id);

    return getJoDetail(id).andThen((detail) => {
      allLienDetails[id] = detail;

      if (env.WAIT) {
        console.log("waiting", env.WAIT);
        return ResultAsync.fromPromise(
          new Promise((resolve) =>
            setTimeout(resolve, (Math.random() + 1) * 1000)
          ),
          () => createApiError.fetchFailed("timer", "Failed to wait"),
        ).andThen(() => fetchSequentially(index + 1, allLienDetails));
      }

      return fetchSequentially(index + 1, allLienDetails);
    });
  };

  return fetchSequentially(0, {});
}

function renderJoToMarkdown(
  joSummaryResponse: GetJosResponse,
  date: string,
): ResultAsync<string, AppError> {
  if (!joSummaryResponse?.items || joSummaryResponse.items.length === 0) {
    return ResultAsync.fromSafePromise(
      Promise.resolve("No items found in the JO summary. 🚫"),
    );
  }

  const journalOfficiel = joSummaryResponse.items[0]?.joCont?.structure.tms
    .find((e) => e.titre === 'Journal officiel "Lois et Décrets"');

  if (!journalOfficiel) {
    return ResultAsync.fromSafePromise(
      Promise.resolve("Journal officiel 'Lois et Décrets' not found. 📰🚫"),
    );
  }

  const titleToFilter: Title[] = [
    "Présidence de la République",
    "LOIS",
    "Décrets, arrêtés, circulaires",
  ];

  const tmsFiltered = journalOfficiel.tms.filter((e) =>
    titleToFilter.includes(e.titre as Title)
  );

  console.log(
    "All titles",
    journalOfficiel.tms.map((e) => e.titre),
  );

  console.log("journalOfficiel", journalOfficiel);
  const tableOfContents = renderJoToMarkdownSubForTableOfContents(
    tmsFiltered,
    date,
  );

  console.log("fetchAllLiens");
  return fetchAllLiens(tmsFiltered).map((allLienDetails) => {
    console.log("renderJoToMarkdownSub");
    const selectedElements = renderJoToMarkdownSub(
      tmsFiltered,
      date,
      allLienDetails,
    );

    return `Table of contents:\n\n${tableOfContents}\n\n\n${selectedElements}`;
  });
}

export function getTweetForLastJo(): ResultAsync<{
  url: string;
  object: {
    title: string;
    tweets: { content: string }[];
  };
  date: string;
  preview: string;
}, AppError> {
  console.log("getTweetForLastJo");
  return listLastNJo(1).andThen((lastNJoResponse) => {
    console.log("lastNJoResponse", lastNJoResponse);

    const dateToday = new Date().toISOString().split("T")[0];
    const firstContainer = lastNJoResponse?.containers[0];

    if (!firstContainer) {
      return err(
        createJournalError.noContainers("No containers found in response"),
      );
    }

    const firstContainerDate =
      new Date(firstContainer.datePubli).toISOString().split("T")[0];

    const container = firstContainer;
    console.log("container", container);

    console.log("getJoSummary", container.id);
    return getJoSummary(container.id).andThen((joSummaryResponse) => {
      console.log("joSummaryResponse", joSummaryResponse);

      console.log("renderJoToMarkdown");
      return renderJoToMarkdown(
        joSummaryResponse,
        new Date(container.datePubli).toLocaleDateString("fr-FR", {
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
      ).andThen((markdown) => {
        console.log("markdown", markdown.length);
        console.log(
          new Date(container.datePubli).toLocaleDateString("fr-FR", {
            year: "numeric",
            month: "long",
            day: "numeric",
          }),
        );
        const systemPrompt = `
Crée des tweets informatifs à partir du Journal officiel ci-dessous. Format de sortie attendu:

1. Un tweet d'introduction résumant les principaux thèmes du JO, terminé par 🧵
2. Entre 3 et 5 tweets détaillant les informations importantes, classées par ordre d'importance

CRITÈRES DE SÉLECTION:
- Impact direct sur la vie quotidienne
- Changements majeurs de réglementation
- Annonces gouvernementales importantes
- Droits et obligations des citoyens

RÈGLES DE RÉDACTION:
- Ton factuel et objectif
- Pas de numéros de textes
- Pas de hashtags/mentions/liens
- Pas de points d'exclamation
- Utilisation d'emojis (avec parcimonie). 1 max par tweet.
- Uniquement les nominations très importantes

PROCESSUS:
1. Analyse le JO pour identifier les sujets d'intérêt général
2. Sélectionne les 3-5 informations les plus impactantes
3. Rédige le tweet d'introduction
4. Rédige les tweets détaillés par ordre d'importance
5. Vérifie le respect des règles de format

IMPORTANT: Adapte le nombre de tweets à la quantité d'informations pertinentes du jour. Certains JO courts peuvent contenir beaucoup d'informations importantes, d'autres longs peuvent en avoir peu.

REMEMBER: Format = 1 tweet intro + 3-5 tweets détaillés maximum, classés par importance. Les tweets doivent faire moins de 280 caractères.
`.trim();

        return ResultAsync.fromPromise(
          generateObject({
            model: wrappedLanguageModel,
            system: systemPrompt,
            schema: z.object({
              title: z.string().describe(
                `
le titre du tweet pour l'image de une, reprend les thèmes principaux du JO, exemples:
- "Santé & Outre-mer, Transport médical, Agriculture & Mayotte"
- "Éducation nationale, Transition écologique & Protection sociale"
- "Justice, Énergies renouvelables & Formation professionnelle" 
- "Économie, Biodiversité & Sécurité"
- "Réforme des lycées, Emploi & Collectivités territoriales"
`.trim(),
              ),
              tweets: z.array(
                z.object({
                  content: z.string().describe("le contenu du tweet"),
                }),
              ),
            }),
            prompt: markdown,
            providerOptions: {
              google: {
                thinkingConfig: {
                  includeThoughts: true,
                },
              } satisfies GoogleGenerativeAIProviderOptions,
            },
          }),
          (error) =>
            createApiError.fetchFailed(
              "ai-generation",
              `Failed to generate tweets: ${error}`,
            ),
        ).map((resAi) => {
          const year = new Date(container.datePubli).getFullYear();
          const month = new Date(container.datePubli).getMonth() + 1;
          const day = new Date(container.datePubli).getDate();

          const date = `${day.toString().padStart(2, "0")}/${
            month.toString().padStart(2, "0")
          }/${year}`;

          const text = resAi.object.title;
          const ogImageUrl = getUrlForOgImage(text, date);

          return {
            url: `https://www.legifrance.gouv.fr/jorf/jo/${year}/${
              month.toString().padStart(2, "0")
            }/${day.toString().padStart(2, "0")}/${container.num}`,
            object: resAi.object,
            date: `${day.toString().padStart(2, "0")}/${
              month.toString().padStart(2, "0")
            }/${year}`,
            preview: ogImageUrl,
          };
        });
      });
    });
  });
}
