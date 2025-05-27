import { AtpAgent, ComAtprotoRepoStrongRef, RichText } from '@atproto/api';
import { BlobRef } from '@atproto/lexicon';

const env = {
	identifier: process.env['BLUESKY_USERNAME']!,
	password: process.env['BLUESKY_PASSWORD']!,
};

export async function getAgent() {
	// Create a Bluesky Agent
	const agent = new AtpAgent({
		service: 'https://bsky.social',
	});
	await agent.login(env);
	return agent;
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

export async function deleteAllTweetsFromAccount(agent: AtpAgent) {
	const { data } = await agent.getProfile({ actor: env.identifier });

	const { data: dataFeed } = await agent.getAuthorFeed({
		actor: data.did,
		filter: 'posts_and_author_threads',
		limit: 30,
	});

	for (const post of dataFeed.feed) {
		await agent.deletePost(post.post.uri);
	}

	return dataFeed;
}

export async function postThread(agent: AtpAgent, tweets: Tweet[]) {
	let parentRef: ComAtprotoRepoStrongRef.Main | undefined;
	let previousPostRef: ComAtprotoRepoStrongRef.Main | undefined;

	for (let i = 0; i < tweets.length; i++) {
		console.log('Posting tweet', i);
		const tweet = tweets[i];
		const res = await post(
			agent,
			tweet,
			parentRef
				? {
						parentRef: parentRef!,
						previousPostRef: previousPostRef!,
				  }
				: undefined
		);
		if (i == 0) {
			parentRef = res;
		}
		previousPostRef = res;
	}
	console.log('Done posting tweets');
}

export async function post(
	agent: AtpAgent,
	tweet: Tweet,
	threadsRefs?: {
		parentRef: ComAtprotoRepoStrongRef.Main;
		previousPostRef: ComAtprotoRepoStrongRef.Main;
	}
) {
	console.log('POSTING', tweet, threadsRefs);

	const { text, linkDetails } = tweet;

	let blobSave: BlobRef | undefined;

	if (linkDetails && linkDetails.imageUrl) {
		console.log('UPLOADING IMAGE', linkDetails.imageUrl);
		const resImage = await fetch(linkDetails.imageUrl);
		const blob = await resImage.blob();
		const { data, success } = await agent.uploadBlob(blob);
		console.log('UPLOADED IMAGE', data, success);
		if (!success) {
			throw new Error('Failed to upload blob');
		}
		blobSave = data.blob;
	}

	const rt = new RichText({
		text: text,
	});
	console.log('rt before detectFacets', rt);
	await rt.detectFacets(agent); // automatically detects mentions and links
	console.log('rt after detectFacets', rt);

	if (linkDetails && blobSave) {
		console.log('POSTING WITH LINK DETAILS', text, linkDetails);
		const res = await agent.post({
			text: rt.text,
			facets: rt.facets,
			reply: threadsRefs
				? {
						root: threadsRefs.parentRef,
						parent: threadsRefs.previousPostRef,
						$type: 'app.bsky.feed.post#replyRef',
				  }
				: undefined,
			embed: {
				$type: 'app.bsky.embed.external',
				external: {
					$type: 'app.bsky.embed.external#external',
					uri: linkDetails.link,
					title: linkDetails.title,
					description: linkDetails.description,
					thumb: blobSave,
				},
			},
		});
		console.log('res after post', res);
		return res;
	} else {
		console.log('POSTING WITHOUT LINK DETAILS', text);
		const res = await agent.post({
			text: rt.text,
			facets: rt.facets,
			reply: threadsRefs
				? {
						root: threadsRefs.parentRef,
						parent: threadsRefs.previousPostRef,
						$type: 'app.bsky.feed.post#replyRef',
				  }
				: undefined,
			embed: linkDetails
				? {
						$type: 'app.bsky.embed.external',
						external: {
							$type: 'app.bsky.embed.external#external',
							uri: linkDetails.link,
							title: linkDetails.title,
							description: linkDetails.description,
						},
				  }
				: undefined,
		});
		console.log('res after post', res);
		return res;
	}
}

// async function main() {
// 	console.log('Logging in...', env);

// 	const imageUrl =
// 		'https://cdn.bsky.app/img/feed_thumbnail/plain/did:plc:z72i7hdynmk6r22z27h6tvur/bafkreibad7a6rca56zkkskkibw4yrkih3dsxbkiyypguzx6u57no53aifu@jpeg';

// 	const linkDetails = {
// 		link: 'https://www.opengraph.xyz',
// 		title: "Bluesky's CEO on the Future of Social Media | SXSW LIVE",
// 		description: 'YouTube video by SXSW',
// 		imageUrl: imageUrl,
// 	};

// 	await postOnBluesky('🙂', linkDetails);
// }
