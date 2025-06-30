import { fetch } from "./cache.ts";
import { getToken } from "./auth.ts";
import type {
  ConsultJorfResponse,
  GetJorfContResponse,
  GetJosResponse,
} from "./types.ts";
import { ok, err, Result, ResultAsync } from "neverthrow";

const BASE_URL =
  "https://sandbox-api.piste.gouv.fr/dila/legifrance/lf-engine-app";

let GLOBAL_BEARER: { token: string; expiresAt: Date } | null = null;

function getAccessToken(): ResultAsync<string, string> {
  console.log("running getAccessToken");
  if (GLOBAL_BEARER && GLOBAL_BEARER.expiresAt > new Date()) {
    console.log(
      "using cached BEARER",
      "expiring in ",
      GLOBAL_BEARER.expiresAt.getTime() - new Date().getTime(),
    );
    return ResultAsync.fromSafePromise(Promise.resolve(GLOBAL_BEARER.token));
  }
  
  console.log("getting new BEARER");
  return getToken().map((token) => {
    console.log("BEARER", token);
    const HARDCODED_EXPIRES_IN = 30000; // in ms

    GLOBAL_BEARER = {
      token: token.access_token,
      expiresAt: new Date(Date.now() + HARDCODED_EXPIRES_IN),
    };
    return GLOBAL_BEARER.token;
  });
}

export function listLastNJo(
  n: number = 5,
): ResultAsync<GetJorfContResponse, string> {
  return getAccessToken().andThen((BEARER) => {
    const endpoint = "/consult/lastNJo";
    const url = `${BASE_URL}${endpoint}`;
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${BEARER}`,
    };
    const payload = { nbElement: n };

    console.log("fetching last N JOs");
    return ResultAsync.fromPromise(
      globalThis.fetch(url, {
        method: "POST",
        headers: headers,
        body: JSON.stringify(payload),
      }),
      (error) => `Error listing last N JOs: ${error}`
    ).andThen((response) => {
      console.log("response", response);

      if (!response.ok) {
        console.error("HTTP error! status: ", response.status);
        return err(`HTTP error! status: ${response.status}`);
      }

      return ResultAsync.fromPromise(
        response.json(),
        (error) => `Failed to parse response: ${error}`
      ).map((data) => data as GetJorfContResponse);
    });
  });
}

export function getJoSummary(
  textCid: string,
): ResultAsync<GetJosResponse, string> {
  return getAccessToken().andThen((BEARER) => {
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

    console.log("fetching JO details");
    return ResultAsync.fromPromise(
      fetch(url, {
        method: "POST",
        headers: headers,
        body: JSON.stringify(payload),
      }),
      (error) => `Error getting JO details: ${error}`
    ).andThen((response) => {
      console.log("response", response);

      if (!response.ok) {
        console.error("HTTP error! status: ", response.status);
        return ResultAsync.fromPromise(
          response.text(),
          () => "Failed to get error text"
        ).andThen((text) => {
          console.error(text);
          return err(`HTTP error! status: ${response.status}`);
        });
      }

      return ResultAsync.fromPromise(
        response.json(),
        (error) => `Failed to parse response: ${error}`
      ).map((data) => {
        console.log("data", data);
        return data as GetJosResponse;
      });
    });
  });
}

export function getJoDetail(
  textCid: string,
): ResultAsync<ConsultJorfResponse, string> {
  return getAccessToken().andThen((BEARER) => {
    const endpoint = "/consult/jorf";
    const url = `${BASE_URL}${endpoint}`;
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${BEARER}`,
    };
    const payload = {
      textCid: textCid,
    };

    return ResultAsync.fromPromise(
      fetch(url, {
        method: "POST",
        headers: headers,
        body: JSON.stringify(payload),
      }),
      (error) => `Error getting JO detail: ${error}`
    ).andThen((response) => {
      if (!response.ok) {
        return ResultAsync.fromPromise(
          response.text(),
          () => "Failed to get error text"
        ).andThen((text) => {
          console.error(text);
          return err(`HTTP error! status: ${response.status}`);
        });
      }

      return ResultAsync.fromPromise(
        response.json(),
        (error) => `Failed to parse response: ${error}`
      ).map((data) => data as ConsultJorfResponse);
    });
  });
}
