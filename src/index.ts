import { Effect } from "effect"
import { runApp } from "./services/layers.ts"
import { handleCron, previewOg } from "./services/program.ts"
import { deleteAllPosts } from "./services/delete.ts"
import { onRequestOgImage } from "./og.tsx"
import { redis } from "./redis.ts"

function fetchHandler(request: Request): Promise<Response> {
  const url = new URL(request.url)

  if (url.pathname === "/kv") {
    return redis.keys("*").then(
      (value) => new Response(JSON.stringify(value), {
        headers: { "Content-Type": "application/json" },
      }),
    )
  }

  if (url.pathname === "/") {
    return runApp(
      previewOg.pipe(
        Effect.map((value) =>
          new Response(JSON.stringify(value), {
            headers: { "Content-Type": "application/json" },
          })
        ),
        Effect.catch((error) =>
          Effect.succeed(
            new Response(JSON.stringify({ error: String(error) }), {
              status: 500,
              headers: { "Content-Type": "application/json" },
            }),
          )
        ),
      ),
    )
  }

  if (url.pathname === "/cron") {
    return runApp(
      handleCron.pipe(
        Effect.map((value) =>
          new Response(JSON.stringify(value), {
            headers: { "Content-Type": "application/json" },
          })
        ),
        Effect.catch((error) =>
          Effect.succeed(
            new Response(JSON.stringify({ error: String(error) }), {
              status: 500,
              headers: { "Content-Type": "application/json" },
            }),
          )
        ),
      ),
    )
  }

  if (url.pathname === "/delete") {
    return runApp(
      deleteAllPosts.pipe(
        Effect.map((value) =>
          new Response(JSON.stringify(value), {
            headers: { "Content-Type": "application/json" },
          })
        ),
        Effect.catch((error) =>
          Effect.succeed(
            new Response(JSON.stringify({ error: String(error) }), {
              status: 500,
              headers: { "Content-Type": "application/json" },
            }),
          )
        ),
      ),
    )
  }

  if (url.pathname === "/og") {
    return onRequestOgImage(request)
  }

  if (url.pathname === "/preview") {
    return runApp(
      previewOg.pipe(
        Effect.map((value) =>
          new Response(null, {
            status: 302,
            headers: { Location: value.preview },
          })
        ),
        Effect.catch((error) =>
          Effect.succeed(
            new Response(JSON.stringify({ error: String(error) }), {
              status: 500,
              headers: { "Content-Type": "application/json" },
            }),
          )
        ),
      ),
    )
  }

  return Promise.resolve(new Response("Hello World!"))
}

Deno.serve(fetchHandler)
