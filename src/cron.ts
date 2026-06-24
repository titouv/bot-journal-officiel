import { handleCron } from "./main.ts";
import { closeRedis } from "./redis.ts";

try {
  await handleCron();
} catch (error) {
  console.error("Cron job failed:", error);
  Deno.exit(1);
} finally {
  await closeRedis();
}
