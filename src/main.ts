import { getUrlForOgImage } from "./og.tsx";
import { getAgent, postThread, Tweet } from "./bluesky.ts";
import { getTweetForLastJo } from "./journal/index.ts";
import { ResultAsync } from "neverthrow";

export function previewOg(): ResultAsync<Response, string> {
  return getTweetForLastJo().map((value) => {
    const text = value.object.title;
    const ogImageUrl = getUrlForOgImage(text, value.date);
    const redirectTo = new URL(ogImageUrl);
    return new Response(null, {
      status: 302,
      headers: {
        Location: redirectTo.toString(),
      },
    });
  });
}

export function handleCron(): ResultAsync<Response, string> {
  console.log("handleCron");
  return getTweetForLastJo().andThen((value) => {
    console.log("originalTweets", value);

    const originalTweets = value?.object.tweets;
    const text = value.object.title;
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

    return getAgent().andThen((agent) => {
      console.log("agent", agent);

      return postThread(agent, tweets).map(() => {
        return new Response(JSON.stringify(value), {
          headers: {
            "Content-Type": "application/json",
          },
        });
      });
    });
  });
}
