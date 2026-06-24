/** @jsx h */
import { h } from "https://esm.sh/preact";
import { ImageResponse } from "https://deno.land/x/og_edge@0.0.4/mod.ts";

export async function loadGoogleFont(font: string, weight: number = 400) {
  const url = `https://fonts.googleapis.com/css2?family=${font}:wght@${weight}`;
  const css = await (await fetch(url)).text();
  console.log(css);
  const resource = css.match(
    /src: url\((.+)\) format\('(opentype|truetype)'\)/
  );

  if (resource) {
    const response = await fetch(resource[1]);
    if (response.status == 200) {
      return await response.arrayBuffer();
    }
  }

  throw new Error("failed to load font data");
}

const availableFonts = [
  "Marianne-Bold.otf",
  "Marianne-BoldItalic.otf",
  "Marianne-ExtraBold.otf",
  "Marianne-ExtraBoldItalic.otf",
  "Marianne-Light.otf",
  "Marianne-LightItalic.otf",
  "Marianne-Medium.otf",
  "Marianne-MediumItalic.otf",
  "Marianne-Regular.otf",
  "Marianne-RegularItalic.otf",
  "Marianne-Thin.otf",
  "Marianne-ThinItalic.otf",
] as const;

type FontKey = (typeof availableFonts)[number];

async function downloadFont(key: FontKey) {
  const url = `https://pub-c11354e7907449afa0f29746a0992ffc.r2.dev/New/Marianne/fontes%20desktop/${key}`;
  console.log(url);
  const response = await fetch(url);
  if (response.status == 200) {
    return await response.arrayBuffer();
  }
  throw new Error("failed to download font");
}

export function getUrlForOgImage(text: string, date: string) {
  const baseUrl = "http://localhost:8000";
  const url = new URL(`${baseUrl}/og`);
  url.searchParams.set("text", text);
  url.searchParams.set("date", date);
  return url.toString();
}

const colors = {
  french_blue: "#022154",
  french_red: "#CF0B21",
};

async function renderOgImage(text: string, date: string) {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          alignItems: "center",
          background: "white",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            height: "100%",
            paddingLeft: "50px",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              height: "100%",
            }}
          >
            <span
              style={{
                fontFamily: "MarianneBold",
                fontSize: 38,
                color: "gray",
              }}
            >
              {date}
            </span>
            <span
              style={{
                fontFamily: "MarianneExtraBold",
                fontSize: 74,
                width: "800px",
                color: "black",
                lineHeight: 1,
                paddingBottom: "40px",
              }}
            >
              {text}
            </span>
            <span
              style={{
                fontFamily: "MarianneBold",
                fontSize: 34,
                color: "gray",
                letterSpacing: "-0.02em",
              }}
            >
              Journal Officiel de la République Française
            </span>
          </div>
        </div>
        <div
          style={{
            position: "absolute",
            right: 0,
            top: 0,
            display: "flex",
            backgroundColor: "red",
            width: "200px",
            height: "100%",
          }}
        >
          <div
            style={{
              width: "33.33%",
              height: "100%",
              backgroundColor: colors.french_blue,
            }}
          />
          <div
            style={{
              width: "33.33%",
              height: "100%",
              backgroundColor: "white",
            }}
          />
          <div
            style={{
              width: "33.33%",
              height: "100%",
              backgroundColor: colors.french_red,
            }}
          />
        </div>
      </div>
    ) as any,
    {
      width: 1200,
      height: 630,
      fonts: [
        {
          name: "MarianneBold",
          data: await downloadFont("Marianne-Bold.otf"),
          style: "normal",
        },
        {
          name: "MarianneExtraBold",
          data: await downloadFont("Marianne-ExtraBold.otf"),
          style: "normal",
        },
      ],
    }
  );
}

export async function generateOgImageBuffer(text: string, date: string): Promise<ArrayBuffer> {
  const response = await renderOgImage(text, date);
  return await response.arrayBuffer();
}

export const onRequestOgImage = async (req: Request) => {
  const url = new URL(req.url);
  const text = url.searchParams.get("text") || "Santé & Outre-mer, Transport médical, Agriculture & Mayotte";
  const date = url.searchParams.get("date") || "25/10";

  return renderOgImage(text, date);
};
