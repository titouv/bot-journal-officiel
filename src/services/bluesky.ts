import { Context, Effect, Layer } from "effect"
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

export interface Bluesky {
  readonly getAgent: () => Effect.Effect<AtpAgent, BlueskyError>
  readonly postThread: (tweets: Tweet[]) => Effect.Effect<void, BlueskyError>
  readonly deleteAllPosts: () => Effect.Effect<void, BlueskyError>
}

export const Bluesky = Context.Service<Bluesky>("Bluesky")

export const BlueskyLive = Layer.effect(
  Bluesky,
  Effect.gen(function* () {
    const config = yield* AppConfig

    const getAgent = () =>
      Effect.tryPromise({
        try: async () => {
          const agent = new AtpAgent({ service: "https://bsky.social" })
          await agent.login({
            identifier: config.blueskyUsername,
            password: config.blueskyPassword,
          })
          return agent
        },
        catch: (e) => new BlueskyError(`Login failed: ${e}`),
      })

    const uploadImage = (
      agent: AtpAgent,
      imageUrl: string,
    ): Effect.Effect<BlobRef, BlueskyError> =>
      Effect.tryPromise({
        try: async () => {
          const resImage = await fetch(imageUrl)
          const blob = await resImage.blob()
          const { data, success } = await agent.uploadBlob(blob)
          if (!success) throw new BlueskyError("Failed to upload blob")
          return data.blob
        },
        catch: (e) =>
          e instanceof BlueskyError
            ? e
            : new BlueskyError(`Image upload failed: ${e}`),
      })

    const post = (
      agent: AtpAgent,
      tweet: Tweet,
      threadRefs?: {
        parentRef: ComAtprotoRepoStrongRef.Main
        previousPostRef: ComAtprotoRepoStrongRef.Main
      },
    ): Effect.Effect<ComAtprotoRepoStrongRef.Main, BlueskyError> =>
      Effect.gen(function* () {
        const { text, linkDetails } = tweet

        let blobSave: BlobRef | undefined
        if (linkDetails?.imageUrl) {
          blobSave = yield* uploadImage(agent, linkDetails.imageUrl)
        }

        const adaptedText = text.length > 280 ? text.slice(0, 280) : text

        const rt = new RichText({ text: adaptedText })
        yield* Effect.tryPromise({
          try: () => rt.detectFacets(agent),
          catch: (e) => new BlueskyError(`Facet detection failed: ${e}`),
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
          catch: (e) => new BlueskyError(`Post failed: ${e}`),
        })

        return result
      })

    const postThread = (tweets: Tweet[]) =>
      Effect.gen(function* () {
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
      })

    const deleteAllPosts = () =>
      Effect.gen(function* () {
        const agent = yield* getAgent()
        const { data } = yield* Effect.tryPromise({
          try: () => agent.getProfile({ actor: config.blueskyUsername }),
          catch: (e) => new BlueskyError(`Get profile failed: ${e}`),
        })
        const { data: feed } = yield* Effect.tryPromise({
          try: () =>
            agent.getAuthorFeed({
              actor: data.did,
              filter: "posts_and_author_threads",
              limit: 30,
            }),
          catch: (e) => new BlueskyError(`Get feed failed: ${e}`),
        })
        for (const post of feed.feed) {
          yield* Effect.tryPromise({
            try: () => agent.deletePost(post.post.uri),
            catch: (e) => new BlueskyError(`Delete post failed: ${e}`),
          })
        }
      })

    return {
      getAgent,
      postThread,
      deleteAllPosts,
    } satisfies Bluesky
  }),
)
