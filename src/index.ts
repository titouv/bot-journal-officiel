import { handleCron, previewOg } from "./main.ts";
import { getTweetForLastJo } from "./journal/index.ts";
import { deleteAllTweetsFromAccount, getAgent } from "./bluesky.ts";
import { onRequestOgImage } from "./og.tsx";
import { redis } from "./redis.ts";
import { simpleHandler } from "./simple-og.tsx";

async function fetchHandler(request: Request): Promise<Response> {
  const url = new URL(request.url);
  if (url.pathname === "/kv") {
    const value = await redis.keys("*");
    return new Response(JSON.stringify(value), {
      headers: {
        "Content-Type": "application/json",
      },
    });
  }
  if (url.pathname === "/") {
    const value = await getTweetForLastJo();

    return new Response(JSON.stringify(value), {
      headers: {
        "Content-Type": "application/json",
      },
    });
  }
  if (url.pathname === "/preview") {
    return await previewOg();
  }
  if (url.pathname === "/cron") {
    return await handleCron();
  }
  if (url.pathname === "/delete") {
    const agent = await getAgent();
    return new Response(
      JSON.stringify(await deleteAllTweetsFromAccount(agent)),
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  }
  if (url.pathname === "/og") {
    return onRequestOgImage(request);
  }
  return new Response("Hello World!");
}

// Deno.serve(simpleHandler);
Deno.serve(fetchHandler);
