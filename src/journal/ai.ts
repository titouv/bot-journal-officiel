import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { wrapLanguageModel } from 'ai';
import type { LanguageModelV1Middleware } from 'ai';
// import fs from 'node:fs/promises';
// import path from 'node:path';

console.log('process.env.GOOGLE_GENERATIVE_AI_API_KEY', process.env.GOOGLE_GENERATIVE_AI_API_KEY);
const google = createGoogleGenerativeAI({
	apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

import { env } from 'cloudflare:workers';

const model = google('gemini-2.0-flash');

import crypto from 'node:crypto';

function hash(input: string): string {
	return crypto.createHash('sha256').update(input).digest('hex');
}

const yourCacheMiddleware: LanguageModelV1Middleware = {
	wrapGenerate: async ({ doGenerate, params }) => {
		const cacheKey = hash(JSON.stringify(params));
		const KV = env.KV_BINDING;

		const cachePath = `${cacheKey}.json`;

		const value = await KV.get(cachePath);
		if (value) {
			return JSON.parse(value);
		}
		const result = await doGenerate();
		// Write the result to the cache file
		await KV.put(cachePath, JSON.stringify(result), {
			expirationTtl: 60 * 60 * 24 * 30, // 30 days
		});
		return result;
	},
};

export const wrappedLanguageModel = wrapLanguageModel({
	model: model,
	middleware: yourCacheMiddleware,
});
