import { env } from "../../env.ts";

const CLIENT_ID = env.PISTE_CLIENT_ID!;
const CLIENT_SECRET = env.PISTE_CLIENT_SECRET!;

export async function getToken() {
  const res = await fetch(
    "https://sandbox-oauth.piste.gouv.fr/api/oauth/token",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        scope: "openid",
      }),
    },
  );
  if (!res.ok) {
    throw new Error("Failed to get token");
  }

  const data = await res.json();

  return data as {
    access_token: string;
    token_type: string;
    expires_in: number;
    scope: string;
  };
}
