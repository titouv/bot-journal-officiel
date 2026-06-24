import { getTweetForLastJo } from "./journal/index.ts";
import { generateOgImageBuffer } from "./og.tsx";

const result = await getTweetForLastJo();
console.log("=== JO Data ===");
console.log("URL:", result.url);
console.log("Date:", result.date);
console.log("Title:", result.object.title);
console.log("Tweets:");
for (const tweet of result.object.tweets) {
  console.log(`  - ${tweet.content} (${tweet.content.length} chars)`);
}

console.log("\n=== Generating OG Image ===");
const imageBuffer = await generateOgImageBuffer(
  result.object.title,
  result.date,
);
console.log(`OG Image generated: ${imageBuffer.byteLength} bytes`);

await Deno.writeFile("og-output.png", new Uint8Array(imageBuffer));
console.log("OG Image saved to og-output.png");
