import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { wrapLanguageModel } from "ai";
import type { LanguageModelV1Middleware } from "ai";

import { env } from "../env.ts";

const google = createGoogleGenerativeAI({
  apiKey: env.GOOGLE_GENERATIVE_AI_API_KEY,
});

// Use the latest generally available Gemini Flash model supported by the
// v1beta generateContent API.
const model = google("gemini-2.5-flash");

import crypto from "node:crypto";

function hash(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

import { redis } from "../redis.ts";

const yourCacheMiddleware: LanguageModelV1Middleware = {
  wrapGenerate: async ({ doGenerate, params }) => {
    const cacheKey = hash(JSON.stringify(params));
    console.log("[AI CACHE] cacheKey", cacheKey);

    const value = await redis.get(cacheKey);
    if (value) {
      console.log("[AI CACHE] cache hit", cacheKey);
      return JSON.parse(value);
    }
    console.log("[AI CACHE] cache miss", cacheKey);
    const result = await doGenerate();
    console.log("[AI CACHE] result", result);
    // Write the result to the cache file
    await redis.set(cacheKey, JSON.stringify(result));
    return result;
  },
};

export const wrappedLanguageModel = wrapLanguageModel({
  model: model,
  middleware: yourCacheMiddleware,
});
