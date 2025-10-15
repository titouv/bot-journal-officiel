# Bot Journal Officiel

Small Deno service that watches the latest Journal officiel “Lois et Décrets”, turns it into a short thread, and posts the result to Bluesky with a generated Open Graph card.

## Requirements
- Deno 1.45+
- Access to the French PISTE API, a Bluesky account, Google Generative AI, and Redis

## Instructions
- To get PISTE API access create an account on https://piste.gouv.fr/en/ , create an application and subscribe to the API `Légifrance`.
- To get Bluesky access create an account on https://bsky.app/ and create an app.
- To get Google Generative AI access create an account on https://console.cloud.google.com/ and create a project (the free tier should be enough since they have generous free rate-limits).
- Create a Redis instance and use the connection string.

## Configuration
Create a `.env` file (or set environment vars another way) with:
- `PISTE_CLIENT_ID` / `PISTE_CLIENT_SECRET`
- `BLUESKY_USERNAME` / `BLUESKY_PASSWORD`
- `GOOGLE_GENERATIVE_AI_API_KEY`
- `REDIS_URL`
- `WAIT` (optional, default `true`; adds a small delay between PISTE requests)

## Run Locally
```sh
deno task start
```

The server exposes a few helper routes:
- `/` returns the cached data for the most recent issue
- `/preview` redirects to the generated OG image
- `/cron` fetches the latest issue and pushes the Bluesky thread
- `/og` renders the OG card directly
- `/delete` removes previously posted Bluesky threads (debug)