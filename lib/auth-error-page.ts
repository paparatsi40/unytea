/**
 * Which NextAuth error the `/auth/error` page is being asked to explain.
 *
 * `lib/auth.ts` declares `pages.error: "/auth/error"`, and @auth/core sends
 * anyone there with the failure in a query parameter:
 *
 *   const type = isClientSafeErrorType(error) ? error.type : "Configuration"
 *   return Response.redirect(`${origin}${pages.error}?error=${type}`)
 *
 * Only a fixed set of types is client-safe (`clientErrors` in
 * `@auth/core/errors.js`); everything else is flattened to `Configuration` so a
 * misconfigured secret or a failing adapter cannot describe itself to the
 * public. Of the client-safe set, only the ones whose `kind` is `"error"` reach
 * this page at all — `AccessDenied` and `Verification`. The rest are
 * `SignInError`s and go to `pages.signIn` instead.
 *
 * `OAuthAccountNotLinked` is in this list even though it is one of those
 * sign-in-kind errors: it is the code Auth.js documents most often, it is
 * linked to from support answers, and a page that shrugged at it would be
 * wrong in exactly the situation someone arrived hoping for an answer.
 *
 * The raw query value is deliberately never rendered. It is attacker-supplied
 * text on a page carrying our logo, and while React escapes it, escaping is not
 * the concern — `?error=Your%20account%20is%20suspended,%20call%20555-0100` is.
 * An unrecognised code resolves to the generic message and the code itself is
 * dropped.
 */

export const AUTH_PAGE_ERROR_CODES = [
  "AccessDenied",
  "OAuthAccountNotLinked",
  "Configuration",
  "Verification",
] as const;

export type AuthPageErrorCode = (typeof AUTH_PAGE_ERROR_CODES)[number];

/** The catalog key used when the code is missing, unknown or not a string. */
export const AUTH_PAGE_ERROR_FALLBACK = "Default";

export type AuthPageErrorKey = AuthPageErrorCode | typeof AUTH_PAGE_ERROR_FALLBACK;

/**
 * The `auth.errorPage` catalog key for a raw `?error=` value.
 *
 * Matching is exact after trimming: the codes are @auth/core's class names and
 * a near-miss is not a match. Anything else — a typo, a code from a future
 * version, a string someone invented — is the generic message.
 */
export function authPageErrorKey(raw: unknown): AuthPageErrorKey {
  if (typeof raw !== "string") return AUTH_PAGE_ERROR_FALLBACK;

  const code = raw.trim();
  return (AUTH_PAGE_ERROR_CODES as readonly string[]).includes(code)
    ? (code as AuthPageErrorCode)
    : AUTH_PAGE_ERROR_FALLBACK;
}
