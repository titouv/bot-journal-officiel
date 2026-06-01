import { Effect, Layer } from "effect"
import {
  HttpRouter,
  HttpServerResponse,
  HttpServerRequest,
} from "effect/unstable/http"
import { Redis } from "./services/redis.ts"
import { handleCron, previewOg } from "./services/program.ts"
import { deleteAllPosts } from "./services/delete.ts"
import { onRequestOgImage } from "./og.tsx"

const errorHandler = (error: unknown) =>
  HttpServerResponse.json({ error: String(error) }, { status: 500 as const })

const kvHandler = Effect.gen(function* () {
  const redis = yield* Redis
  const value = yield* redis.keys("*")
  const resp = yield* HttpServerResponse.json(value)
  return resp
}).pipe(Effect.catch(errorHandler))

const rootHandler = previewOg.pipe(
  Effect.flatMap((v) => HttpServerResponse.json(v)),
  Effect.catch(errorHandler),
)

const cronHandler = handleCron.pipe(
  Effect.flatMap((v) => HttpServerResponse.json(v)),
  Effect.catch(errorHandler),
)

const deleteHandler = deleteAllPosts.pipe(
  Effect.flatMap((v) => HttpServerResponse.json(v)),
  Effect.catch(errorHandler),
)

const ogHandler = (req: HttpServerRequest.HttpServerRequest) =>
  Effect.gen(function* () {
    const webReq = yield* HttpServerRequest.toWeb(req)
    const webResp = yield* Effect.tryPromise({
      try: () => onRequestOgImage(webReq),
      catch: (e) => new Error(String(e)),
    })
    return HttpServerResponse.fromWeb(webResp)
  })

const previewHandler = previewOg.pipe(
  Effect.map((v) => HttpServerResponse.redirect(v.preview)),
  Effect.catch(errorHandler),
)

const app = Layer.mergeAll(
  HttpRouter.add("GET", "/kv", kvHandler),
  HttpRouter.add("GET", "/", rootHandler),
  HttpRouter.add("GET", "/cron", cronHandler),
  HttpRouter.add("GET", "/delete", deleteHandler),
  HttpRouter.add("GET", "/og", ogHandler),
  HttpRouter.add("GET", "/preview", previewHandler),
)

const { handler: rawHandler } = HttpRouter.toWebHandler(app)
const handler = (req: Request): Promise<Response> => (rawHandler as (req: Request) => Promise<Response>)(req)
Deno.serve(handler)
