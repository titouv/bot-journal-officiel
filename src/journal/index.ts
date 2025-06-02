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

async function fetchAllLiens(
  originalTms: Tm[] | undefined,
): Promise<Record<string, ConsultJorfResponse>> {
  console.log("getAllLienIdToFetch");
  const allLienIds = getAllLienIdToFetch(originalTms);
  console.log("allLienIds", allLienIds);
  const allLienDetails: Record<string, ConsultJorfResponse> = {};

  for (const id of allLienIds) {
    console.log("fetching", id);
    const detail = await getJoDetail(id);
    if (detail) {
      allLienDetails[id] = detail;
    }

    if (env.WAIT) {
      console.log("waiting", env.WAIT);
      // wait between 1000ms and 2000ms
      await new Promise((resolve) =>
        setTimeout(resolve, (Math.random() + 1) * 1000)
      );
    }
  }

  return allLienDetails;
}

async function renderJoToMarkdown(
  joSummaryResponse: GetJosResponse,
  date: string,
) {
  if (!joSummaryResponse?.items || joSummaryResponse.items.length === 0) {
    return "No items found in the JO summary. 🚫";
  }

  const journalOfficiel = joSummaryResponse.items[0]?.joCont?.structure.tms
    .find((e) => e.titre === 'Journal officiel "Lois et Décrets"');

  if (!journalOfficiel) {
    return "Journal officiel 'Lois et Décrets' not found. 📰🚫";
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
  const allLienDetails = await fetchAllLiens(tmsFiltered);

  console.log("renderJoToMarkdownSub");
  const selectedElements = renderJoToMarkdownSub(
    tmsFiltered,
    date,
    allLienDetails,
  );

  return `Table of contents:\n\n${tableOfContents}\n\n\n${selectedElements}`;
}

export async function getTweetForLastJo() {
  console.log("getTweetForLastJo");
  const lastNJoResponse = await listLastNJo(1);
  if (!lastNJoResponse) {
    throw new Error("call to listLastNJo failed");
  }
  console.log("lastNJoResponse", lastNJoResponse);

  const dateToday = new Date().toISOString().split("T")[0];
  const firstContainer = lastNJoResponse?.containers[0];
  const firstContainerDate =
    new Date(firstContainer.datePubli).toISOString().split("T")[0];

  // if (firstContainerDate !== dateToday) {
  // 	console.log('firstContainerDate', firstContainerDate);
  // 	console.log('dateToday', dateToday);
  // 	throw new Error('First container date is not today, neaning that the JO is not published yet or that there is no JO for today');
  // }

  const container = firstContainer;

  const joSummaryResponse = await getJoSummary(container.id);

  if (!joSummaryResponse) {
    throw new Error("No JO summary response found");
  }

  const markdown = await renderJoToMarkdown(
    joSummaryResponse,
    new Date(container.datePubli).toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
  );

  console.log(
    new Date(container.datePubli).toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
  );

  const systemPrompt = `
Tu es un assistant spécialisé dans la création de tweets informatifs à partir des publications du Journal officiel. Ton objectif est de proposer un maximum de 5 tweets pertinents et concis, destinés à être publiés dans un fil Twitter. Cependant, en fonction du contenu du Journal Officiel, il est possible que seulement 3 tweets soient suffisants.

Priorise les informations les plus importantes et susceptibles d'intéresser un large public. Voici des critères de pertinence à considérer :

- **Impact direct sur la vie quotidienne des citoyens :** Nouvelles lois affectant les impôts, la santé, l'éducation, etc.
- **Changements majeurs dans la réglementation :** Nouvelles normes environnementales, règles de sécurité, etc.
- **Annonces gouvernementales importantes :** Plans de relance économique, nouvelles politiques publiques, etc.
- **Informations concernant les droits et obligations des citoyens :** Nouvelles procédures administratives, droits des consommateurs, etc.

Évite de couvrir tous les éléments du Journal officiel ; concentre-toi sur ceux qui présentent un intérêt général ou une nouveauté significative. Exclus les nominations ou les sujets très spécifiques qui ne concernent qu'une petite partie de la population.

Ne pas mentionner les numéros des textes dans les tweets.

Tu dois écrire les tweets par ordre d'importance, en commençant par les plus importants.

Il faut aussi un tweet d'introduction du feed, qui résume le contenu du Journal officiel.

Utilise des emojis avec parcimonie pour dynamiser les tweets.
`.trim();

  const resAi = await generateObject({
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
          // title: z.string().describe("juste le thème"),
        }),
      ),
    }),
    prompt: markdown,
    providerOptions: {
      google: {
        thinkingConfig: {
          thinkingBudget: 0,
        },
      } satisfies GoogleGenerativeAIProviderOptions,
    },
  });

  const year = new Date(container.datePubli).getFullYear();
  const month = new Date(container.datePubli).getMonth() + 1;
  const day = new Date(container.datePubli).getDate();

  const date = `${day.toString().padStart(2, "0")}/${
    month.toString().padStart(2, "0")
  }/${year}`;

  const text = resAi.object.title;
  const ogImageUrl = getUrlForOgImage(text, date);

  return {
    // https://www.legifrance.gouv.fr/jorf/jo/2025/05/25/0122
    url: `https://www.legifrance.gouv.fr/jorf/jo/${year}/${
      month.toString().padStart(2, "0")
    }/${day.toString().padStart(2, "0")}/${container.num}`,
    object: resAi.object,
    // format DD/MM/YYYY
    date: `${day.toString().padStart(2, "0")}/${
      month.toString().padStart(2, "0")
    }/${year}`,
    preview: ogImageUrl,
  };
}
