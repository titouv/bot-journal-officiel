import { AtpAgent, ComAtprotoRepoStrongRef, RichText } from "@atproto/api";
import { BlobRef } from "@atproto/lexicon";
import { env } from "./env.ts";
import { err, ok, Result, ResultAsync } from "neverthrow";
import type { AppError } from "./errors.ts";
import { createBlueSkyError, createMediaError } from "./errors.ts";

const envBluesky = {
  identifier: env.BLUESKY_USERNAME!,
  password: env.BLUESKY_PASSWORD!,
};

export function getAgent(): ResultAsync<AtpAgent, AppError> {
  const agent = new AtpAgent({
    service: "https://bsky.social",
  });

  return ResultAsync.fromPromise(
    agent.login(envBluesky),
    (error) =>
      createBlueSkyError.loginFailed(`Failed to login to Bluesky: ${error}`),
  ).map(() => agent);
}

export type Tweet = {
  text: string;
  linkDetails?: {
    link: string;
    title: string;
    description: string;
    imageUrl?: string;
  };
};

export function deleteAllTweetsFromAccount(
  agent: AtpAgent,
): ResultAsync<any, AppError> {
  return ResultAsync.fromPromise(
    agent.getProfile({ actor: envBluesky.identifier }),
    (error) =>
      createBlueSkyError.profileError(`Failed to get profile: ${error}`),
  ).andThen(({ data }) => {
    return ResultAsync.fromPromise(
      agent.getAuthorFeed({
        actor: data.did,
        filter: "posts_and_author_threads",
        limit: 30,
      }),
      (error) =>
        createBlueSkyError.profileError(`Failed to get author feed: ${error}`),
    ).andThen(({ data: dataFeed }) => {
      const deletePromises = dataFeed.feed.map((post) =>
        ResultAsync.fromPromise(
          agent.deletePost(post.post.uri),
          (error) =>
            createBlueSkyError.postFailed(`Failed to delete post: ${error}`),
        )
      );

      return ResultAsync.combine(deletePromises).map(() => dataFeed);
    });
  });
}

export function postThread(
  agent: AtpAgent,
  tweets: Tweet[],
): ResultAsync<void, AppError> {
  let parentRef: ComAtprotoRepoStrongRef.Main | undefined;
  let previousPostRef: ComAtprotoRepoStrongRef.Main | undefined;

  const postSequentially = (index: number): ResultAsync<void, AppError> => {
    if (index >= tweets.length) {
      console.log("Done posting tweets");
      return ResultAsync.fromSafePromise(Promise.resolve());
    }

    console.log("Posting tweet", index);
    const tweet = tweets[index];
    return post(
      agent,
      tweet,
      parentRef
        ? {
          parentRef: parentRef!,
          previousPostRef: previousPostRef!,
        }
        : undefined,
    ).andThen((res) => {
      if (index === 0) {
        parentRef = res;
      }
      previousPostRef = res;
      return postSequentially(index + 1);
    });
  };

  return postSequentially(0);
}

export function post(
  agent: AtpAgent,
  tweet: Tweet,
  threadsRefs?: {
    parentRef: ComAtprotoRepoStrongRef.Main;
    previousPostRef: ComAtprotoRepoStrongRef.Main;
  },
): ResultAsync<ComAtprotoRepoStrongRef.Main, AppError> {
  console.log("POSTING", tweet, threadsRefs);

  const { text, linkDetails } = tweet;

  const uploadBlob: ResultAsync<BlobRef | undefined, AppError> =
    linkDetails && linkDetails.imageUrl
      ? ResultAsync.fromPromise(
        fetch(linkDetails.imageUrl),
        (error) =>
          createMediaError.fetchFailed(
            linkDetails.imageUrl!,
            `Failed to fetch image: ${error}`,
          ),
      ).andThen((resImage) => {
        console.log("FETCHING IMAGE RES", resImage.status);
        console.log("FETCHING IMAGE RES", resImage.statusText);
        console.log("FETCHING IMAGE RES", resImage.headers);
        console.log("FETCHING IMAGE RES", resImage.body);

        return ResultAsync.fromPromise(
          resImage.blob(),
          (error) => createMediaError.blobError(`Failed to get blob: ${error}`),
        ).andThen((blob) => {
          return ResultAsync.fromPromise(
            agent.uploadBlob(blob),
            (error) =>
              createMediaError.uploadFailed(`Failed to upload blob: ${error}`),
          ).andThen(({ data, success }) => {
            console.log("UPLOADED IMAGE", data, success);
            if (!success) {
              return err(
                createMediaError.uploadFailed("Failed to upload blob"),
              );
            }
            return ok(data.blob);
          });
        });
      })
      : ResultAsync.fromSafePromise(Promise.resolve(undefined));

  return uploadBlob.andThen((blobSave: BlobRef | undefined) => {
    const rt = new RichText({
      text: text,
    });
    console.log("rt before detectFacets", rt);

    return ResultAsync.fromPromise(
      rt.detectFacets(agent),
      (error) =>
        createBlueSkyError.facetsError(`Failed to detect facets: ${error}`),
    ).andThen(() => {
      console.log("rt after detectFacets", rt);

      const postData = {
        text: rt.text,
        facets: rt.facets,
        reply: threadsRefs
          ? {
            root: threadsRefs.parentRef,
            parent: threadsRefs.previousPostRef,
            $type: "app.bsky.feed.post#replyRef" as const,
          }
          : undefined,
        embed: linkDetails
          ? {
            $type: "app.bsky.embed.external" as const,
            external: {
              $type: "app.bsky.embed.external#external" as const,
              uri: linkDetails.link,
              title: linkDetails.title,
              description: linkDetails.description,
              ...(blobSave ? { thumb: blobSave } : {}),
            },
          }
          : undefined,
      };

      if (linkDetails && blobSave) {
        console.log("POSTING WITH LINK DETAILS", text, linkDetails);
      } else {
        console.log("POSTING WITHOUT LINK DETAILS", text);
      }

      return ResultAsync.fromPromise(
        agent.post(postData),
        (error) => createBlueSkyError.postFailed(`Failed to post: ${error}`),
      ).map((res) => {
        console.log("res after post", res);
        return res;
      });
    });
  });
}
