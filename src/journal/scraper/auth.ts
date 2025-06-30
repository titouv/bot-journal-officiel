import { env } from "../../env.ts";
import { err, ResultAsync } from "neverthrow";
import { AuthError, createAuthError } from "../../errors.ts";

const CLIENT_ID = env.PISTE_CLIENT_ID!;
const CLIENT_SECRET = env.PISTE_CLIENT_SECRET!;

export function getToken(): ResultAsync<{
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}, AuthError> {
  return ResultAsync.fromPromise(
    fetch("https://sandbox-oauth.piste.gouv.fr/api/oauth/token", {
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
    }),
    (error) => createAuthError.fetchFailed(String(error)),
  )
    .andThen((res) => {
      if (!res.ok) {
        return ResultAsync.fromPromise(
          res.json(),
          () => createAuthError.parseError("Failed to parse error response"),
        ).andThen((error) => {
          console.error(error);
          return err(
            createAuthError.invalidResponse(res.status, res.statusText),
          );
        });
      }

      return ResultAsync.fromPromise(
        res.json(),
        () => createAuthError.parseError("Failed to parse token response"),
      ).map((data) =>
        data as {
          access_token: string;
          token_type: string;
          expires_in: number;
          scope: string;
        }
      );
    });
}

if (import.meta.main) {
  const tokenResult = await getToken();
  if (tokenResult.isOk()) {
    console.log(tokenResult.value);
  } else {
    console.error(tokenResult.error);
  }
}

if (import.meta.main) {
  const token = await getToken();
  console.log(token);
}
