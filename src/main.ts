import { getUrlForOgImage } from './og';
import { getAgent, postThread, Tweet } from './bluesky';
import { getTweetForLastJo } from './journal';

export async function previewOg() {
	const value = await getTweetForLastJo();
	if (!value) {
		throw new Error('No value found');
	}
	console.log('originalTweets', value);

	const originalTweets = value?.object.tweets;

	// slice to remove the intro tweet
	const textElements = originalTweets?.map((tweet) => tweet.title).slice(1, undefined);
	const text = textElements.length > 3 ? textElements.slice(0, 3).join(', ') + '...' : textElements.join(', ');

	// const ogImageUrl =
	// 'https://cdn.bsky.app/img/feed_thumbnail/plain/did:plc:z72i7hdynmk6r22z27h6tvur/bafkreibad7a6rca56zkkskkibw4yrkih3dsxbkiyypguzx6u57no53aifu@jpeg';
	const ogImageUrl = getUrlForOgImage(text, value.date);
	const redirectTo = new URL(ogImageUrl);
	return new Response(null, {
		status: 302,
		headers: {
			Location: redirectTo.toString(),
		},
	});
}

export async function handleCron() {
	const value = await getTweetForLastJo();
	if (!value) {
		throw new Error('No value found');
	}
	console.log('originalTweets', value);

	const originalTweets = value?.object.tweets;

	// slice to remove the intro tweet
	const textElements = originalTweets?.map((tweet) => tweet.title).slice(1, undefined);
	const text = textElements.length > 3 ? textElements.slice(0, 3).join(', ') + '...' : textElements.join(', ');

	// const ogImageUrl =
	// 'https://cdn.bsky.app/img/feed_thumbnail/plain/did:plc:z72i7hdynmk6r22z27h6tvur/bafkreibad7a6rca56zkkskkibw4yrkih3dsxbkiyypguzx6u57no53aifu@jpeg';
	const ogImageUrl = getUrlForOgImage(text, value.date);

	const tweets: Tweet[] =
		originalTweets?.map((tweet, i) => ({
			text: tweet.content,
			linkDetails: i == 0 ? { title: tweet.title, link: value.url, imageUrl: ogImageUrl, description: tweet.content } : undefined,
		})) ?? [];

	const agent = await getAgent();

	await postThread(agent, tweets);

	return new Response(JSON.stringify(value), {
		headers: {
			'Content-Type': 'application/json',
		},
	});
}
