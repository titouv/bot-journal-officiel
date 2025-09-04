import { AtpAgent, ComAtprotoRepoStrongRef, RichText } from "@atproto/api";
import { BlobRef } from "@atproto/lexicon";

import { env } from "./env.ts";
import { generateObject } from "ai";
import { wrappedLanguageModel } from "./journal/ai.ts";
import z from "zod";

const envBluesky = {
  identifier: env.BLUESKY_USERNAME!,
  password: env.BLUESKY_PASSWORD!,
};

export async function getAgent() {
  // Create a Bluesky Agent
  const agent = new AtpAgent({
    service: "https://bsky.social",
  });
  await agent.login(envBluesky);
  return agent;
}

export type Tweet = {
  text: string;
  linkDetails?: {
    link: string;
    title: string;
    description: string;
    imageUrl?: string;
  };
};

export async function deleteAllTweetsFromAccount(agent: AtpAgent) {
  const { data } = await agent.getProfile({ actor: envBluesky.identifier });

  const { data: dataFeed } = await agent.getAuthorFeed({
    actor: data.did,
    filter: "posts_and_author_threads",
    limit: 30,
  });

  for (const post of dataFeed.feed) {
    await agent.deletePost(post.post.uri);
  }

  return dataFeed;
}

export async function postThread(agent: AtpAgent, tweets: Tweet[]) {
  let parentRef: ComAtprotoRepoStrongRef.Main | undefined;
  let previousPostRef: ComAtprotoRepoStrongRef.Main | undefined;

  for (let i = 0; i < tweets.length; i++) {
    console.log("Posting tweet", i);
    const tweet = tweets[i];
    const res = await post(
      agent,
      tweet,
      parentRef
        ? {
          parentRef: parentRef!,
          previousPostRef: previousPostRef!,
        }
        : undefined,
    );
    if (i == 0) {
      parentRef = res;
    }
    previousPostRef = res;
  }
  console.log("Done posting tweets");
}

async function adaptTextLengthIfNecessary(text: string) {
  if (text.length > 280) {
    console.log("Text is too long, adapting it");
    try {
      const res = await generateObject({
        model: wrappedLanguageModel,
        system:
          `You will be give a text that is too long to be posted on Twitter. You will need to adapt it to be less than 280 characters.`,
        prompt: text,
        schema: z.object({
          text: z.string().max(280),
        }),
      });

      console.log("Adapted text", res.object.text);
      return res.object.text;
    } catch (e) {
      console.error("Error adapting text length", e);
      return text.slice(0, 280);
    }
  }
  return text;
}

export async function post(
  agent: AtpAgent,
  tweet: Tweet,
  threadsRefs?: {
    parentRef: ComAtprotoRepoStrongRef.Main;
    previousPostRef: ComAtprotoRepoStrongRef.Main;
  },
) {
  console.log("POSTING", tweet, threadsRefs);

  const { text, linkDetails } = tweet;

  let blobSave: BlobRef | undefined;

  if (linkDetails && linkDetails.imageUrl) {
    console.log("UPLOADING IMAGE", linkDetails.imageUrl);
    const resImage = await fetch(linkDetails.imageUrl);
    console.log("FETCHING IMAGE RES", resImage.status);
    console.log("FETCHING IMAGE RES", resImage.statusText);
    console.log("FETCHING IMAGE RES", resImage.headers);
    console.log("FETCHING IMAGE RES", resImage.body);
    const blob = await resImage.blob();
    const { data, success } = await agent.uploadBlob(blob);
    console.log("UPLOADED IMAGE", data, success);
    if (!success) {
      throw new Error("Failed to upload blob");
    }
    blobSave = data.blob;
  }

  const adaptedText = await adaptTextLengthIfNecessary(text);

  const rt = new RichText({
    text: adaptedText,
  });
  console.log("rt before detectFacets", rt);
  await rt.detectFacets(agent); // automatically detects mentions and links
  console.log("rt after detectFacets", rt);

  if (linkDetails && blobSave) {
    console.log("POSTING WITH LINK DETAILS", adaptedText, linkDetails);
    const res = await agent.post({
      text: rt.text,
      facets: rt.facets,
      reply: threadsRefs
        ? {
          root: threadsRefs.parentRef,
          parent: threadsRefs.previousPostRef,
          $type: "app.bsky.feed.post#replyRef",
        }
        : undefined,
      embed: {
        $type: "app.bsky.embed.external",
        external: {
          $type: "app.bsky.embed.external#external",
          uri: linkDetails.link,
          title: linkDetails.title,
          description: linkDetails.description,
          thumb: blobSave,
        },
      },
    });
    console.log("res after post", res);
    return res;
  } else {
    console.log("POSTING WITHOUT LINK DETAILS", adaptedText);
    const res = await agent.post({
      text: rt.text,
      facets: rt.facets,
      reply: threadsRefs
        ? {
          root: threadsRefs.parentRef,
          parent: threadsRefs.previousPostRef,
          $type: "app.bsky.feed.post#replyRef",
        }
        : undefined,
      embed: linkDetails
        ? {
          $type: "app.bsky.embed.external",
          external: {
            $type: "app.bsky.embed.external#external",
            uri: linkDetails.link,
            title: linkDetails.title,
            description: linkDetails.description,
          },
        }
        : undefined,
    });
    console.log("res after post", res);
    return res;
  }
}

// async function main() {
// 	console.log('Logging in...', env);

// 	const imageUrl =
// 		'https://cdn.bsky.app/img/feed_thumbnail/plain/did:plc:z72i7hdynmk6r22z27h6tvur/bafkreibad7a6rca56zkkskkibw4yrkih3dsxbkiyypguzx6u57no53aifu@jpeg';

// 	const linkDetails = {
// 		link: 'https://www.opengraph.xyz',
// 		title: "Bluesky's CEO on the Future of Social Media | SXSW LIVE",
// 		description: 'YouTube video by SXSW',
// 		imageUrl: imageUrl,
// 	};

// 	await postOnBluesky('🙂', linkDetails);
// }
