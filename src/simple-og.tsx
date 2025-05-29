/** @jsx h */
import { h } from "https://esm.sh/preact";
import { ImageResponse } from "https://deno.land/x/og_edge@0.0.4/mod.ts";

export function simpleHandler(req: Request) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 128,
          background: "lavender",
        }}
      >
        Hello OG Image!
      </div>
    ) as any
  );
}
