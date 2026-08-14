/**
 * Whether the auth cookies must carry `Secure` and the matching name prefix.
 *
 * This mirrors the rule @auth/core applies to every cookie it names itself
 * (`@auth/core/lib/init.js`):
 *
 *     defaultCookies(config.useSecureCookies ?? url.protocol === "https:")
 *
 * `lib/auth.ts` overrides the session cookie, and its config is merged ON TOP
 * of those defaults — so if it decides "are we secure?" from a different input,
 * the two halves can disagree. They did: the override keyed on `NODE_ENV`,
 * which is not the same question. Anywhere the auth URL is https while
 * NODE_ENV is not "production" — local development, Vercel preview deploys —
 * @auth/core emitted `__Host-authjs.csrf-token; Secure` while the session
 * cookie went out plain. Browsers refuse to store a `__Host-`/`Secure` cookie
 * over http, so the next POST to /api/auth/signout arrived with no CSRF cookie
 * and was refused — returning HTTP 200 with no `Set-Cookie`, which is why the
 * failure was invisible and logging out appeared to need two clicks.
 *
 * Lives in its own module, with no NextAuth import, so the rule can be asserted
 * directly rather than through a mock of the whole auth instance.
 */
type AuthEnv = { AUTH_URL?: string; NEXTAUTH_URL?: string };

export function shouldUseSecureCookies(env: AuthEnv = process.env as AuthEnv): boolean {
  const url = env.AUTH_URL ?? env.NEXTAUTH_URL;

  // No URL configured: err secure. Getting this wrong in the secure direction
  // only breaks plain-http development, where the fix is to set the variable.
  // Getting it wrong the other way ships a session cookie without `Secure`.
  if (!url) return true;

  try {
    return new URL(url).protocol === "https:";
  } catch {
    return true;
  }
}

/**
 * Name of the session cookie, prefixed to match its own `secure` flag.
 *
 * `__Secure-` is not decoration: a browser rejects the cookie outright if the
 * prefix and the flag disagree, so the two must come from one decision.
 */
export function sessionCookieName(env: AuthEnv = process.env as AuthEnv): string {
  return `${shouldUseSecureCookies(env) ? "__Secure-" : ""}next-auth.session-token`;
}
