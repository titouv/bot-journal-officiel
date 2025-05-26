import { getUrlForOgImage } from './og';
import { postThread, Tweet } from './bluesky';
import { getTweetForLastJo } from './journal';

export async function handleCron() {
	const value = await getTweetForLastJo();
	if (!value) {
		throw new Error('No value found');
	}
	console.log('originalTweets', value);

	const originalTweets = value?.object.tweets;

	// const ogImageUrl =
	// 'https://cdn.bsky.app/img/feed_thumbnail/plain/did:plc:z72i7hdynmk6r22z27h6tvur/bafkreibad7a6rca56zkkskkibw4yrkih3dsxbkiyypguzx6u57no53aifu@jpeg';
	const ogImageUrl = getUrlForOgImage(value.object.topics.join(', '), value.date);

	const tweets: Tweet[] =
		originalTweets?.map((tweet, i) => ({
			text: tweet.content,
			linkDetails: i == 0 ? { title: tweet.title, link: value.url, imageUrl: ogImageUrl, description: tweet.content } : undefined,
		})) ?? [];

	await postThread(tweets);

	return new Response(JSON.stringify(value), {
		headers: {
			'Content-Type': 'application/json',
		},
	});
}
