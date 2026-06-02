import { Effect } from "effect"
import { Bluesky } from "./bluesky.ts"

export const deleteAllPosts = Effect.gen(function* () {
  const bluesky = yield* Bluesky
  yield* bluesky.deleteAllPosts()
  return { deleted: true }
})
