import { handleCron } from "./main.ts";

try {
  await handleCron();
} catch (error) {
  console.error("Cron job failed:", error);
  Deno.exit(1);
}
