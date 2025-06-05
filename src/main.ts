import { getUrlForOgImage } from "./og.tsx";
import { getAgent, postThread, Tweet } from "./bluesky.ts";
import { getTweetForLastJo } from "./journal/index.ts";

export async function previewOg() {
  const value = await getTweetForLastJo();
  if (!value) {
    throw new Error("No value found");
  }

  const text = value.object.title;

  const ogImageUrl = getUrlForOgImage(text, value.date);
  const redirectTo = new URL(ogImageUrl);
  return new Response(null, {
    status: 302,
    headers: {
      Location: redirectTo.toString(),
    },
  });
}

export async function handleCron() {
  console.log("handleCron");
  const value = await getTweetForLastJo();
  if (!value) {
    throw new Error("No value found");
  }
  console.log("originalTweets", value);

  const originalTweets = value?.object.tweets;

  const text = value.object.title;

  // const ogImageUrl =
  // 'https://cdn.bsky.app/img/feed_thumbnail/plain/did:plc:z72i7hdynmk6r22z27h6tvur/bafkreibad7a6rca56zkkskkibw4yrkih3dsxbkiyypguzx6u57no53aifu@jpeg';
  const ogImageUrl = getUrlForOgImage(text, value.date);

  const tweets: Tweet[] = originalTweets?.map((tweet, i) => ({
    text: tweet.content,
    linkDetails: i == 0
      ? {
        title: "JO " + value.date + " - " + value.object.title,
        link: value.url,
        imageUrl: ogImageUrl,
        description: tweet.content,
      }
      : undefined,
  })) ?? [];

  const agent = await getAgent();
  console.log("agent", agent);

  await postThread(agent, tweets);

  return new Response(JSON.stringify(value), {
    headers: {
      "Content-Type": "application/json",
    },
  });
}
