/**
 * Turn an auth API error into a message in the reader's language.
 *
 * The auth routes used to return their error as an English sentence, and the
 * pages rendered it straight into a toast — so a visitor on the Spanish or
 * French signup hit "Too many attempts. Please try again later." the moment
 * anything went wrong. The server cannot localize it either: it is the client
 * that knows which catalog is loaded.
 *
 * So the routes now return a stable `code` alongside `error`. The code is the
 * contract; the sentence stays in the response for logs and for any non-UI
 * consumer, but nothing renders it.
 *
 * Unknown or absent codes fall back to the generic message rather than showing
 * raw server text — a new code shipped by a route that this list has not caught
 * up with should read as "something went wrong", never as English in the middle
 * of a French page.
 */

export const AUTH_ERROR_CODES = [
  "RATE_LIMITED",
  "SERVER_ERROR",
  "EMAIL_REQUIRED",
  "RESET_LINK_INVALID",
  "RESET_LINK_EXPIRED",
  "VALIDATION_NAME",
  "VALIDATION_EMAIL",
  "VALIDATION_PASSWORD",
] as const;

export type AuthErrorCode = (typeof AUTH_ERROR_CODES)[number];

function isKnown(code: unknown): code is AuthErrorCode {
  return typeof code === "string" && (AUTH_ERROR_CODES as readonly string[]).includes(code);
}

/**
 * @param t   a translator bound to the `auth.errors` namespace
 * @param code  the `code` field of the API response, if any
 */
export function authErrorMessage(t: (key: string) => string, code: unknown): string {
  return isKnown(code) ? t(code) : t("generic");
}
