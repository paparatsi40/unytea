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
 * Resolve a raw `?error=` value against an allow-list.
 *
 * Matching is exact after trimming: the codes are @auth/core's class names and
 * a near-miss is not a match. Anything else — a typo, a code from a future
 * version, a string someone invented — is the generic message.
 *
 * The exactness is the point. A case-insensitive or substring match would let
 * whoever wrote the link choose which of our sentences to display, which is the
 * same problem as rendering their text, one step removed.
 */
function resolveErrorKey<T extends string>(raw: unknown, codes: readonly T[]): T | "Default" {
  if (typeof raw !== "string") return AUTH_PAGE_ERROR_FALLBACK;

  const code = raw.trim();
  return (codes as readonly string[]).includes(code) ? (code as T) : AUTH_PAGE_ERROR_FALLBACK;
}

/** The `auth.errorPage` catalog key for a raw `?error=` value. */
export function authPageErrorKey(raw: unknown): AuthPageErrorKey {
  return resolveErrorKey(raw, AUTH_PAGE_ERROR_CODES);
}

/**
 * Which failure the sign-in page is being asked to explain.
 *
 * A different list from the one above, because a different set of errors
 * arrives here. @auth/core routes by `error.kind`, and `pages.signIn` receives
 * the `SignInError`s — so this page gets the codes the error page does not.
 *
 * The list is every client-safe type whose kind is `"signIn"`
 * (`OAuthAccountNotLinked`, `AccountNotLinked`, `CredentialsSignin`,
 * `OAuthCallbackError`, `MissingCSRF`), plus two that arrive by other routes:
 * `Configuration`, which is what a sign-in-kind error that is *not* client-safe
 * is flattened to, and `SessionRequired`, which `next-auth/react` appends
 * itself when `useSession({ required: true })` bounces someone. `AccessDenied`
 * is included last because hand-written and older links carry it here even
 * though @auth/core sends it to the error page.
 *
 * Without this the page read `?error=` not at all: every one of these rendered
 * a blank, ordinary login form, and someone whose Google sign-in had just been
 * refused was left to guess why.
 */
export const SIGNIN_ERROR_CODES = [
  "OAuthAccountNotLinked",
  "AccountNotLinked",
  "CredentialsSignin",
  "OAuthCallbackError",
  "MissingCSRF",
  "Configuration",
  "SessionRequired",
  "AccessDenied",
] as const;

export type SignInErrorCode = (typeof SIGNIN_ERROR_CODES)[number];

export type SignInErrorKey = SignInErrorCode | typeof AUTH_PAGE_ERROR_FALLBACK;

/** The `auth.signinErrors` catalog key for a raw `?error=` value. */
export function signInErrorKey(raw: unknown): SignInErrorKey {
  return resolveErrorKey(raw, SIGNIN_ERROR_CODES);
}
