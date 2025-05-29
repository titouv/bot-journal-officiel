import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { wrapLanguageModel } from "ai";
import type { LanguageModelV1Middleware } from "ai";

import { env } from "../env.ts";

const google = createGoogleGenerativeAI({
  apiKey: env.GOOGLE_GENERATIVE_AI_API_KEY,
});

const model = google("gemini-2.0-flash");

import crypto from "node:crypto";

function hash(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

const yourCacheMiddleware: LanguageModelV1Middleware = {
  wrapGenerate: async ({ doGenerate, params }) => {
    const cacheKey = hash(JSON.stringify(params));
    const kv = await Deno.openKv();

    const cachePath = `${cacheKey}.json`;

    const value = await kv.get([cachePath]);
    if (value && value.value) {
      return JSON.parse(value.value as string);
    }
    const result = await doGenerate();
    console.log("result", result);
    // Write the result to the cache file
    await kv.set([cachePath], JSON.stringify(result));
    return result;
  },
};

export const wrappedLanguageModel = wrapLanguageModel({
  model: model,
  middleware: yourCacheMiddleware,
});
