FROM denoland/deno:latest

WORKDIR /app

COPY . .

RUN deno cache src/cron.ts

CMD ["sleep", "infinity"]
