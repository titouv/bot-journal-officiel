import { Effect } from "effect"
import { Bluesky } from "./bluesky.ts"
import { BlueskyError } from "./errors.ts"

export const deleteAllPosts = Effect.fn("App.deleteAllPosts")(
  function* (): Effect.fn.Return<{ deleted: boolean }, BlueskyError, Bluesky> {
    const bluesky = yield* Bluesky
    yield* bluesky.deleteAllPosts()
    return { deleted: true }
  },
  Effect.annotateLogs({ component: "delete" }),
)
