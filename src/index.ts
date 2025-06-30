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
    const result = await getTweetForLastJo();
    if (result.isErr()) {
      return new Response(JSON.stringify({ error: result.error }), {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      });
    }

    return new Response(JSON.stringify(result.value), {
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  if (url.pathname === "/preview") {
    const result = await previewOg();
    if (result.isErr()) {
      return new Response(JSON.stringify({ error: result.error }), {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      });
    }
    return result.value;
  }

  if (url.pathname === "/cron") {
    const result = await handleCron();
    if (result.isErr()) {
      return new Response(JSON.stringify({ error: result.error }), {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      });
    }
    return result.value;
  }

  if (url.pathname === "/delete") {
    const agentResult = await getAgent();
    if (agentResult.isErr()) {
      return new Response(JSON.stringify({ error: agentResult.error }), {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      });
    }

    const deleteResult = await deleteAllTweetsFromAccount(agentResult.value);
    if (deleteResult.isErr()) {
      return new Response(JSON.stringify({ error: deleteResult.error }), {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      });
    }

    return new Response(JSON.stringify(deleteResult.value), {
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  if (url.pathname === "/og") {
    return onRequestOgImage(request);
  }

  return new Response("Hello World!");
}

Deno.serve(fetchHandler);
