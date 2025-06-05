import { fetch } from "./cache.ts";
import { getToken } from "./auth.ts";
import type {
  ConsultJorfResponse,
  GetJorfContResponse,
  GetJosResponse,
} from "./types.ts";

const BASE_URL =
  "https://sandbox-api.piste.gouv.fr/dila/legifrance/lf-engine-app";

// --- 1. List the Last N "Journal Officiel" ---

let GLOBAL_BEARER: { token: string; expiresAt: Date } | null = null;

async function getAccessToken() {
  console.log("running getAccessToken");
  if (GLOBAL_BEARER && GLOBAL_BEARER.expiresAt > new Date()) {
    console.log("using cached BEARER");
    return GLOBAL_BEARER.token;
  }
  console.log("getting new BEARER");
  const token = await getToken();
  console.log("BEARER", token);
  GLOBAL_BEARER = {
    token: token.access_token,
    expiresAt: new Date(Date.now() + token.expires_in * 1000),
  };
  return GLOBAL_BEARER.token;
}

export async function listLastNJo(
  n: number = 5,
): Promise<GetJorfContResponse | null> {
  const BEARER = await getAccessToken();
  const endpoint = "/consult/lastNJo";
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${BEARER}`,
  };
  const payload = { nbElement: n };

  try {
    console.log("fetching last N JOs");
    const response = await globalThis.fetch(url, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(payload),
    });
    console.log("response", response);

    if (!response.ok) {
      console.error("HTTP error! status: ", response.status);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = (await response.json()) as GetJorfContResponse;
    return data;
  } catch (e) {
    console.error(`Error listing last N JOs: ${e}`);
    return null;
  }
}

// --- 2. Get Details of a Specific "Journal Officiel" (requires its Chronical ID) using /consult/jorfCont ---

export async function getJoSummary(
  textCid: string,
): Promise<GetJosResponse | null> {
  const BEARER = await getAccessToken();
  const endpoint = "/consult/jorfCont";
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${BEARER}`,
  };
  const payload = {
    id: textCid,
    pageNumber: 1,
    pageSize: 10,
    highlightActivated: "false",
  };

  try {
    console.log("fetching JO details");
    const response = await fetch(url, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(payload),
    });
    console.log("response", response);

    if (!response.ok) {
      console.error("HTTP error! status: ", response.status);
      const text = await response.text();
      console.error(text);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = (await response.json()) as GetJosResponse;
    console.log("data", data);
    return data;
  } catch (e) {
    console.error(`Error getting JO details: ${e}`);
    return null;
  }
}

// -- 3. Get the detail of a specific element of a JO --

export async function getJoDetail(
  textCid: string,
): Promise<ConsultJorfResponse | null> {
  const BEARER = await getAccessToken();
  const endpoint = "/consult/jorf";
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${BEARER}`,
  };
  const payload = {
    textCid: textCid,
  };
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(text);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = (await response.json()) as ConsultJorfResponse;
    return data;
  } catch (e) {
    console.error(`Error getting JO detail: ${e}`);
    return null;
  }
}
