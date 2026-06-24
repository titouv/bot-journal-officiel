import { generateOgImageBuffer } from "./og.tsx";
import { getAgent, postThread, Tweet } from "./bluesky.ts";
import { getTweetForLastJo } from "./journal/index.ts";

export async function handleCron() {
  console.log("handleCron");
  const value = await getTweetForLastJo();
  if (!value) {
    throw new Error("No value found");
  }
  console.log("originalTweets", value);

  const originalTweets = value?.object.tweets;

  const text = value.object.title;

  const imageBuffer = await generateOgImageBuffer(text, value.date);

  const tweets: Tweet[] = originalTweets?.map((tweet, i) => ({
    text: tweet.content,
    linkDetails: i == 0
      ? {
        title: "JO " + value.date + " - " + value.object.title,
        link: value.url,
        imageBuffer,
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
