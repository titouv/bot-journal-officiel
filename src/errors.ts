// Auth-related errors
export type AuthError =
  | { type: "auth_fetch_failed"; message: string }
  | { type: "auth_invalid_response"; status: number; statusText: string }
  | { type: "auth_parse_error"; message: string };

// API/Network errors
export type ApiError =
  | { type: "api_fetch_failed"; endpoint: string; message: string }
  | {
    type: "api_http_error";
    endpoint: string;
    status: number;
    statusText: string;
  }
  | { type: "api_parse_error"; endpoint: string; message: string }
  | { type: "api_invalid_response"; endpoint: string; message: string };

// Journal/Content errors
export type JournalError =
  | { type: "journal_no_containers"; message: string }
  | { type: "journal_no_summary"; message: string }
  | { type: "journal_no_items"; message: string }
  | { type: "journal_no_official_journal"; message: string }
  | { type: "journal_ai_generation_failed"; message: string };

// Bluesky/Social errors
export type BlueSkyError =
  | { type: "bluesky_login_failed"; message: string }
  | { type: "bluesky_upload_failed"; message: string }
  | { type: "bluesky_post_failed"; message: string }
  | { type: "bluesky_thread_failed"; message: string }
  | { type: "bluesky_profile_error"; message: string }
  | { type: "bluesky_facets_error"; message: string };

// Image/Media errors
export type MediaError =
  | { type: "media_fetch_failed"; url: string; message: string }
  | { type: "media_blob_error"; message: string }
  | { type: "media_upload_failed"; message: string };

// Union of all error types
export type AppError =
  | AuthError
  | ApiError
  | JournalError
  | BlueSkyError
  | MediaError;

// Helper functions to create errors
export const createAuthError = {
  fetchFailed: (message: string): AuthError => ({
    type: "auth_fetch_failed",
    message,
  }),
  invalidResponse: (status: number, statusText: string): AuthError => ({
    type: "auth_invalid_response",
    status,
    statusText,
  }),
  parseError: (message: string): AuthError => ({
    type: "auth_parse_error",
    message,
  }),
};

export const createApiError = {
  fetchFailed: (endpoint: string, message: string): ApiError => ({
    type: "api_fetch_failed",
    endpoint,
    message,
  }),
  httpError: (
    endpoint: string,
    status: number,
    statusText: string,
  ): ApiError => ({
    type: "api_http_error",
    endpoint,
    status,
    statusText,
  }),
  parseError: (endpoint: string, message: string): ApiError => ({
    type: "api_parse_error",
    endpoint,
    message,
  }),
  invalidResponse: (endpoint: string, message: string): ApiError => ({
    type: "api_invalid_response",
    endpoint,
    message,
  }),
};

export const createJournalError = {
  noContainers: (message: string): JournalError => ({
    type: "journal_no_containers",
    message,
  }),
  noSummary: (message: string): JournalError => ({
    type: "journal_no_summary",
    message,
  }),
  noItems: (message: string): JournalError => ({
    type: "journal_no_items",
    message,
  }),
  noOfficialJournal: (message: string): JournalError => ({
    type: "journal_no_official_journal",
    message,
  }),
  aiGenerationFailed: (message: string): JournalError => ({
    type: "journal_ai_generation_failed",
    message,
  }),
};

export const createBlueSkyError = {
  loginFailed: (message: string): BlueSkyError => ({
    type: "bluesky_login_failed",
    message,
  }),
  uploadFailed: (message: string): BlueSkyError => ({
    type: "bluesky_upload_failed",
    message,
  }),
  postFailed: (message: string): BlueSkyError => ({
    type: "bluesky_post_failed",
    message,
  }),
  threadFailed: (message: string): BlueSkyError => ({
    type: "bluesky_thread_failed",
    message,
  }),
  profileError: (message: string): BlueSkyError => ({
    type: "bluesky_profile_error",
    message,
  }),
  facetsError: (message: string): BlueSkyError => ({
    type: "bluesky_facets_error",
    message,
  }),
};

export const createMediaError = {
  fetchFailed: (url: string, message: string): MediaError => ({
    type: "media_fetch_failed",
    url,
    message,
  }),
  blobError: (message: string): MediaError => ({
    type: "media_blob_error",
    message,
  }),
  uploadFailed: (message: string): MediaError => ({
    type: "media_upload_failed",
    message,
  }),
};

// Helper function to convert AppError to string for logging
export function errorToString(error: AppError): string {
  switch (error.type) {
    case "auth_fetch_failed":
      return `Auth fetch failed: ${error.message}`;
    case "auth_invalid_response":
      return `Auth invalid response: ${error.status} ${error.statusText}`;
    case "auth_parse_error":
      return `Auth parse error: ${error.message}`;
    case "api_fetch_failed":
      return `API fetch failed for ${error.endpoint}: ${error.message}`;
    case "api_http_error":
      return `API HTTP error for ${error.endpoint}: ${error.status} ${error.statusText}`;
    case "api_parse_error":
      return `API parse error for ${error.endpoint}: ${error.message}`;
    case "api_invalid_response":
      return `API invalid response for ${error.endpoint}: ${error.message}`;
    case "journal_no_containers":
      return `Journal no containers: ${error.message}`;
    case "journal_no_summary":
      return `Journal no summary: ${error.message}`;
    case "journal_no_items":
      return `Journal no items: ${error.message}`;
    case "journal_no_official_journal":
      return `Journal no official journal: ${error.message}`;
    case "journal_ai_generation_failed":
      return `Journal AI generation failed: ${error.message}`;
    case "bluesky_login_failed":
      return `BlueSky login failed: ${error.message}`;
    case "bluesky_upload_failed":
      return `BlueSky upload failed: ${error.message}`;
    case "bluesky_post_failed":
      return `BlueSky post failed: ${error.message}`;
    case "bluesky_thread_failed":
      return `BlueSky thread failed: ${error.message}`;
    case "bluesky_profile_error":
      return `BlueSky profile error: ${error.message}`;
    case "bluesky_facets_error":
      return `BlueSky facets error: ${error.message}`;
    case "media_fetch_failed":
      return `Media fetch failed for ${error.url}: ${error.message}`;
    case "media_blob_error":
      return `Media blob error: ${error.message}`;
    case "media_upload_failed":
      return `Media upload failed: ${error.message}`;
    default:
      return `Unknown error: ${JSON.stringify(error)}`;
  }
}
