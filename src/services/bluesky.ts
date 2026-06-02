import { Context, Effect, Layer, Ref } from "effect"
import { AtpAgent, RichText } from "@atproto/api"
import type { ComAtprotoRepoStrongRef, BlobRef } from "@atproto/api"
import { AppConfig } from "./config.ts"
import { BlueskyError } from "./errors.ts"

export interface Tweet {
  readonly text: string
  readonly linkDetails?: {
    readonly link: string
    readonly title: string
    readonly description: string
    readonly imageUrl?: string
  }
}

export class Bluesky extends Context.Service<Bluesky, {
  readonly getAgent: () => Effect.Effect<AtpAgent, BlueskyError>
  readonly postThread: (tweets: Tweet[]) => Effect.Effect<void, BlueskyError>
  readonly deleteAllPosts: () => Effect.Effect<void, BlueskyError>
}>()("app/Bluesky") {
  static readonly Live = Layer.effect(
    Bluesky,
    Effect.gen(function* () {
      const config = yield* AppConfig
      const agentRef = yield* Ref.make<AtpAgent | null>(null)

      const getAgent = Effect.fn("Bluesky.getAgent")(
        function* (): Effect.fn.Return<AtpAgent, BlueskyError> {
          const cached = yield* Ref.get(agentRef)
          if (cached) return cached
          const agent = yield* Effect.tryPromise({
            try: async () => {
              const a = new AtpAgent({ service: "https://bsky.social" })
              await a.login({
                identifier: config.blueskyUsername,
                password: config.blueskyPassword,
              })
              return a
            },
            catch: (e) => new BlueskyError({ message: `Login failed: ${e}` }),
          })
          yield* Ref.set(agentRef, agent)
          return agent
        },
        Effect.annotateLogs({ service: "bluesky" }),
      )

      const uploadImage = Effect.fn("Bluesky.uploadImage")(
        function* (agent: AtpAgent, imageUrl: string): Effect.fn.Return<BlobRef, BlueskyError> {
          return yield* Effect.tryPromise({
            try: async () => {
              const resImage = await fetch(imageUrl)
              const blob = await resImage.blob()
              const { data, success } = await agent.uploadBlob(blob)
              if (!success) throw new BlueskyError({ message: "Failed to upload blob" })
              return data.blob
            },
            catch: (e) =>
              e instanceof BlueskyError
                ? e
                : new BlueskyError({ message: `Image upload failed: ${e}` }),
          })
        },
        Effect.annotateLogs({ service: "bluesky", method: "uploadImage" }),
      )

      const post = Effect.fn("Bluesky.post")(
        function*(
          agent: AtpAgent,
          tweet: Tweet,
          threadRefs?: {
            parentRef: ComAtprotoRepoStrongRef.Main
            previousPostRef: ComAtprotoRepoStrongRef.Main
          },
        ): Effect.fn.Return<ComAtprotoRepoStrongRef.Main, BlueskyError> {
          const { text, linkDetails } = tweet

          let blobSave: BlobRef | undefined
          if (linkDetails?.imageUrl) {
            blobSave = yield* uploadImage(agent, linkDetails.imageUrl)
          }

          const adaptedText = text.length > 280 ? text.slice(0, 280) : text

          const rt = new RichText({ text: adaptedText })
          yield* Effect.tryPromise({
            try: () => rt.detectFacets(agent),
            catch: (e) => new BlueskyError({ message: `Facet detection failed: ${e}` }),
          })

          const embed = linkDetails
            ? ({
              $type: "app.bsky.embed.external",
              external: {
                $type: "app.bsky.embed.external#external",
                uri: linkDetails.link,
                title: linkDetails.title,
                description: linkDetails.description,
                ...(blobSave ? { thumb: blobSave } : {}),
              },
            } as const)
            : undefined

          const result = yield* Effect.tryPromise({
            try: () =>
              agent.post({
                text: rt.text,
                facets: rt.facets,
                reply: threadRefs
                  ? {
                    root: threadRefs.parentRef,
                    parent: threadRefs.previousPostRef,
                    $type: "app.bsky.feed.post#replyRef",
                  }
                  : undefined,
                embed,
              }),
            catch: (e) => new BlueskyError({ message: `Post failed: ${e}` }),
          })

          return result
        },
        Effect.annotateLogs({ service: "bluesky", method: "post" }),
      )

      const postThread = Effect.fn("Bluesky.postThread")(
        function*(tweets: Tweet[]): Effect.fn.Return<void, BlueskyError> {
          const agent = yield* getAgent()
          let parentRef: ComAtprotoRepoStrongRef.Main | undefined
          let previousPostRef: ComAtprotoRepoStrongRef.Main | undefined

          for (const tweet of tweets) {
            const ref = yield* post(agent, tweet, parentRef
              ? { parentRef, previousPostRef: previousPostRef! }
              : undefined,
            )
            if (!parentRef) parentRef = ref
            previousPostRef = ref
          }
        },
        Effect.annotateLogs({ service: "bluesky", method: "postThread" }),
      )

      const deleteAllPosts = Effect.fn("Bluesky.deleteAllPosts")(
        function*(): Effect.fn.Return<void, BlueskyError> {
          const agent = yield* getAgent()
          const { data } = yield* Effect.tryPromise({
            try: () => agent.getProfile({ actor: config.blueskyUsername }),
            catch: (e) => new BlueskyError({ message: `Get profile failed: ${e}` }),
          })
          const { data: feed } = yield* Effect.tryPromise({
            try: () =>
              agent.getAuthorFeed({
                actor: data.did,
                filter: "posts_and_author_threads",
                limit: 30,
              }),
            catch: (e) => new BlueskyError({ message: `Get feed failed: ${e}` }),
          })
          for (const feedPost of feed.feed) {
            yield* Effect.tryPromise({
              try: () => agent.deletePost(feedPost.post.uri),
              catch: (e) => new BlueskyError({ message: `Delete post failed: ${e}` }),
            })
          }
        },
        Effect.annotateLogs({ service: "bluesky", method: "deleteAllPosts" }),
      )

      return Bluesky.of({ getAgent, postThread, deleteAllPosts })
    }),
  )
}
