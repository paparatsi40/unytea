/**
 * What to tell someone whose email address is already registered.
 *
 * The signup route used to answer an existing address with **201 and a generic
 * message** — the standard shape for refusing to confirm whether an account
 * exists. The client read `response.ok` as success and went straight on to
 * `signIn("credentials", …)`, which fails for any account whose password is
 * different, and for every account created through Google, which has no
 * password at all. What the user saw was a bare "sign-in error" toast on the
 * signup page: never told an account existed, never offered a way to recover
 * it, and no reason to think the two screens were related.
 *
 * The anti-enumeration it cost that for was not being bought. With any random
 * password, a fresh address signs in and a taken one does not, so the very flow
 * that hid the answer on line one handed it back on line four. The address is
 * discoverable either way; only the user was being kept in the dark.
 *
 * So the route now says so, and this function decides what "so" is. Naming the
 * provider is a deliberate, bounded disclosure: it tells an attacker who
 * already knows the address is registered which door to rattle. It is bounded
 * because the route rate-limits at 5 attempts per IP per 15 minutes before it
 * gets here, and it is worth it because "that account uses Google" is
 * information the account's actual owner cannot deduce and cannot act without.
 * This is what GitHub, Figma, Slack and Notion all do.
 */

export const SIGNUP_CONFLICT_CODES = [
  "EMAIL_IN_USE_PASSWORD",
  "EMAIL_IN_USE_GOOGLE",
  "EMAIL_IN_USE_GITHUB",
  "EMAIL_IN_USE",
] as const;

export type SignupConflictCode = (typeof SIGNUP_CONFLICT_CODES)[number];

/**
 * The subset of an existing user this decision reads.
 *
 * `password` is the hash, and it is taken as a parameter only so its presence
 * can be tested. It is never returned, logged, or compared here.
 */
export interface ExistingAccountShape {
  password?: string | null;
  accounts?: { provider: string }[] | null;
}

/**
 * Which sign-in method the owner of an existing account should be sent to.
 *
 * A password wins over a linked provider even when both exist: they are already
 * typing a password, that password will work, and telling them to go and use
 * Google instead would be sending them the long way round for no reason.
 *
 * With no password and no linked account — a real state, since our own `signIn`
 * callback creates the user row a moment before the adapter links it — the
 * generic code sends them to password recovery, which is the one route that
 * works from there.
 */
export function signupConflictCode(account: ExistingAccountShape): SignupConflictCode {
  if (typeof account.password === "string" && account.password.length > 0) {
    return "EMAIL_IN_USE_PASSWORD";
  }

  const providers = new Set((account.accounts ?? []).map((a) => a.provider));
  if (providers.has("google")) return "EMAIL_IN_USE_GOOGLE";
  if (providers.has("github")) return "EMAIL_IN_USE_GITHUB";

  return "EMAIL_IN_USE";
}

/** Whether an API response code is one of the conflicts this module describes. */
export function isSignupConflictCode(code: unknown): code is SignupConflictCode {
  return typeof code === "string" && (SIGNUP_CONFLICT_CODES as readonly string[]).includes(code);
}
