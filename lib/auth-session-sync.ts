"use client";

import { getSession } from "next-auth/react";

/**
 * Make the client session store go and look at the session again.
 *
 * `SessionProvider` sits in the root layout with no `session` prop, so it
 * fetches `/api/auth/session` once when it mounts and then holds the answer —
 * in React state and in the module-level `__NEXTAUTH._session` — for the life
 * of the page. Nothing in a client-side navigation remounts it, and it polls
 * only on window focus (`refetchOnWindowFocus`), which a visitor who never
 * left the tab does not trigger.
 *
 * That is fine while the session only changes through `next-auth/react`, which
 * announces its own writes. Ours no longer does: logging out is a server
 * action, so the cookie is cleared by a `Set-Cookie` on the action response and
 * the store is never told. It keeps handing `useSession()` a session the server
 * has already thrown away, which is why the marketing header still offered
 * "Go to Dashboard" to somebody who had just signed out.
 *
 * `getSession()` is the announcement. It re-reads the session over HTTP and
 * posts on next-auth's `BroadcastChannel`, which is what the provider listens
 * on to re-sync — the same path a sign-out in another tab travels. It reads;
 * it never asserts a state of its own, so calling it when the session turned
 * out to still be alive simply confirms that.
 *
 * Note `useSession().update()` is *not* an alternative: it calls `setSession`
 * only `if (newSession)`, so the one answer it refuses to store is the empty
 * one — exactly the answer a logout produces.
 */
export async function resyncClientSession(): Promise<void> {
  // Never rejects: it is attached to a promise that has already settled, and an
  // unhandled rejection here would be reported against the logout itself.
  await getSession().catch(() => null);
}
