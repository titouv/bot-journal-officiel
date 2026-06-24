import { handleCron } from "./main.ts";
import { getTweetForLastJo } from "./journal/index.ts";
import { deleteAllTweetsFromAccount, getAgent } from "./bluesky.ts";
import { onRequestOgImage } from "./og.tsx";

async function fetchHandler(request: Request): Promise<Response> {
  const url = new URL(request.url);
  if (url.pathname === "/") {
    const value = await getTweetForLastJo();
    return new Response(JSON.stringify(value), {
      headers: { "Content-Type": "application/json" },
    });
  }
  if (url.pathname === "/cron") {
    return await handleCron();
  }
  if (url.pathname === "/delete") {
    const agent = await getAgent();
    return new Response(
      JSON.stringify(await deleteAllTweetsFromAccount(agent)),
      { headers: { "Content-Type": "application/json" } },
    );
  }
  if (url.pathname === "/og") {
    return onRequestOgImage(request);
  }
  return new Response("Not found", { status: 404 });
}

Deno.serve(fetchHandler);
