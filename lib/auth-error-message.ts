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

/**
 * How long to tell someone to wait, in whole minutes, rounded up.
 *
 * Rounded up because the honest thing to promise is "not before"; a wait of
 * 61 seconds reported as "1 minute" sends them back to a second refusal.
 * Never zero, and never below one: "try again in 0 minutes" is what the
 * refusal is asking them not to do.
 *
 * Returns null for anything that is not a positive, finite number of seconds,
 * which is the signal to fall back to the message without a time in it — an
 * older deployment that does not send the field, or a body that never had one.
 */
export function retryAfterMinutes(seconds: unknown): number | null {
  if (typeof seconds !== "number" || !Number.isFinite(seconds) || seconds <= 0) return null;
  return Math.max(1, Math.ceil(seconds / 60));
}

/**
 * The same message, plus the wait when the server told us one.
 *
 * "Too many attempts, try again later" is true and useless: the wait behind it
 * ranges from twenty seconds to a quarter of an hour, and the reader has no
 * way to tell which, so they either give up or retry immediately and are
 * refused again. The routes that refuse now send the seconds; this puts them in
 * the sentence.
 *
 * @param t  a translator bound to `auth.errors`, able to take ICU values
 */
export function authErrorMessageWithRetry(
  // Narrower than `unknown` values on purpose: this is what next-intl's
  // translator accepts, so the signature fits `useTranslations("auth.errors")`
  // without a cast at either call site.
  t: (key: string, values?: Record<string, string | number | Date>) => string,
  code: unknown,
  retryAfterSeconds: unknown
): string {
  const minutes = retryAfterMinutes(retryAfterSeconds);
  if (code === "RATE_LIMITED" && minutes !== null) {
    return t("RATE_LIMITED_IN", { minutes });
  }
  return authErrorMessage(t, code);
}
