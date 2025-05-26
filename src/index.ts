/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.jsonc`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

import { handleCron } from './main';
import { getTweetForLastJo } from './journal';
import { deleteAllTweetsFromAccount } from './bluesky';
import { onRequestOgImage } from './og';

export default {
	async scheduled(controller, env, ctx) {
		console.log('scheduled');
		console.log('env', process.env);
		// await handleCron();
	},
	async fetch(request, env, ctx): Promise<Response> {
		const url = new URL(request.url);
		if (url.pathname === '/kv') {
			const value = await env.KV_BINDING.list();
			return new Response(JSON.stringify(value), {
				headers: {
					'Content-Type': 'application/json',
				},
			});
		}
		if (url.pathname === '/') {
			const value = await getTweetForLastJo();

			return new Response(JSON.stringify(value), {
				headers: {
					'Content-Type': 'application/json',
				},
			});
		}
		if (url.pathname === '/cron') {
			return await handleCron();
		}
		if (url.pathname === '/delete') {
			return new Response(JSON.stringify(await deleteAllTweetsFromAccount()), {
				headers: {
					'Content-Type': 'application/json',
				},
			});
		}
		if (url.pathname === '/og') {
			return onRequestOgImage(request);
		}
		return new Response('Hello World!');
	},
} satisfies ExportedHandler<Env>;
