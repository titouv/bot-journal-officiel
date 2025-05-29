import "jsr:@std/dotenv/load";

const env = {
  PISTE_CLIENT_ID: Deno.env.get("PISTE_CLIENT_ID"),
  PISTE_CLIENT_SECRET: Deno.env.get("PISTE_CLIENT_SECRET"),
  BLUESKY_USERNAME: Deno.env.get("BLUESKY_USERNAME"),
  BLUESKY_PASSWORD: Deno.env.get("BLUESKY_PASSWORD"),
  GOOGLE_GENERATIVE_AI_API_KEY: Deno.env.get("GOOGLE_GENERATIVE_AI_API_KEY"),
  REDIS_URL: Deno.env.get("REDIS_URL"),
};

export { env };
