"use server";

import { signOut } from "@/lib/auth";
import { defineAction } from "@/lib/actions/define-action";

/**
 * Sign the user out.
 *
 * Logging out used to take two clicks. The first one appeared to do something —
 * the page navigated — but the session survived; only the second actually ended
 * it. The captured exchange explains why:
 *
 *   POST /api/auth/signout   (no __Host-authjs.csrf-token cookie on the request)
 *   → HTTP 200
 *   → no Set-Cookie clearing the session
 *   → {"url":"https://www.unytea.com/auth/signin?error=MissingCSRF"}
 *
 * versus, with the CSRF cookie present:
 *
 *   → HTTP 200
 *   → set-cookie: next-auth.session-token=; Max-Age=0; Path=/
 *   → {"url":"https://www.unytea.com"}
 *
 * Both are 200 with a `url` in the body, and `next-auth/react`'s client
 * `signOut()` does `window.location.href = data.url` without inspecting which
 * one it got. A refused signout is therefore indistinguishable from a completed
 * one: the browser navigates, the user assumes they are out, and the session
 * token is still in the jar. The second click works because the GET to
 * /api/auth/csrf during the first attempt left the cookie behind.
 *
 * Running it on the server removes the failure mode rather than papering over
 * it. `signOut()` from `lib/auth` clears the session cookie and issues the
 * redirect in one server-side step, so there is no window in which the browser
 * navigates while the session is still alive — and no /api/auth/csrf
 * round-trip to fail, because Server Actions carry their own Origin-checked
 * CSRF protection.
 *
 * `auth: "public"` is deliberate: signing out must work even when the session
 * is already expired, malformed or half-cleared, which is exactly when a user
 * reaches for the button. Requiring a valid session to end a session would fail
 * closed in the one state where the user most needs it to work. The handler
 * reads and returns no data, so there is nothing for an anonymous caller to
 * learn; the worst an unauthenticated POST achieves is clearing cookies it did
 * not have.
 *
 * `signOut` performs its navigation by throwing NEXT_REDIRECT. The seam
 * re-throws Next's control-flow signals rather than folding them into an
 * INTERNAL failure — without that, wrapping this action would silently
 * reintroduce the very bug it fixes.
 */
export const logout = defineAction(
  // `api` (60/min), not `auth` (5 per 15 min): the strict limiter is sized for
  // credential guessing, and being throttled out of LOGGING OUT — on a shared
  // IP, where anonymous callers share a bucket — is a worse failure than the
  // one it would prevent. The action reads nothing and is idempotent.
  { name: "logout", auth: "public", args: [], rateLimit: "api" },
  async (): Promise<never> => {
    await signOut({ redirectTo: "/" });
    // Unreachable: signOut always throws NEXT_REDIRECT.
    throw new Error("signOut returned without redirecting");
  }
);
