import { fetch } from "./cache.ts";
import { getToken } from "./auth.ts";
import type {
  ConsultJorfResponse,
  GetJorfContResponse,
  GetJosResponse,
} from "./types.ts";
import { err, ResultAsync } from "neverthrow";
import { ApiError, AuthError, createApiError } from "../../errors.ts";

const BASE_URL =
  "https://sandbox-api.piste.gouv.fr/dila/legifrance/lf-engine-app";

let GLOBAL_BEARER: { token: string; expiresAt: Date } | null = null;

function getAccessToken(): ResultAsync<string, AuthError> {
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
): ResultAsync<GetJorfContResponse, AuthError | ApiError> {
  const endpoint = "/consult/lastNJo";

  return getAccessToken().andThen((BEARER) => {
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
      (error) => createApiError.fetchFailed(endpoint, String(error)),
    ).andThen((response) => {
      console.log("response", response);

      if (!response.ok) {
        console.error("HTTP error! status: ", response.status);
        return err(
          createApiError.httpError(
            endpoint,
            response.status,
            response.statusText,
          ),
        );
      }

      return ResultAsync.fromPromise(
        response.json(),
        (error) => createApiError.parseError(endpoint, String(error)),
      ).map((data) => data as GetJorfContResponse);
    });
  });
}

export function getJoSummary(
  textCid: string,
): ResultAsync<GetJosResponse, AuthError | ApiError> {
  const endpoint = "/consult/jorfCont";

  return getAccessToken().andThen((BEARER) => {
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
      (error) => createApiError.fetchFailed(endpoint, String(error)),
    ).andThen((response) => {
      console.log("response", response);

      if (!response.ok) {
        console.error("HTTP error! status: ", response.status);
        return ResultAsync.fromPromise(
          response.text(),
          () => createApiError.parseError(endpoint, "Failed to get error text"),
        ).andThen((text) => {
          console.error(text);
          return err(
            createApiError.httpError(
              endpoint,
              response.status,
              response.statusText,
            ),
          );
        });
      }

      return ResultAsync.fromPromise(
        response.json(),
        (error) => createApiError.parseError(endpoint, String(error)),
      ).map((data) => {
        console.log("data", data);
        return data as GetJosResponse;
      });
    });
  });
}

export function getJoDetail(
  textCid: string,
): ResultAsync<ConsultJorfResponse, AuthError | ApiError> {
  const endpoint = "/consult/jorf";

  return getAccessToken().andThen((BEARER) => {
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
      (error) => createApiError.fetchFailed(endpoint, String(error)),
    ).andThen((response) => {
      if (!response.ok) {
        return ResultAsync.fromPromise(
          response.text(),
          () => createApiError.parseError(endpoint, "Failed to get error text"),
        ).andThen((text) => {
          console.error(text);
          return err(
            createApiError.httpError(
              endpoint,
              response.status,
              response.statusText,
            ),
          );
        });
      }

      return ResultAsync.fromPromise(
        response.json(),
        (error) => createApiError.parseError(endpoint, String(error)),
      ).map((data) => data as ConsultJorfResponse);
    });
  });
}
