"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { LogOut } from "lucide-react";
import { logout } from "@/app/actions/auth";
import { resyncClientSession } from "@/lib/auth-session-sync";

/**
 * The logout control.
 *
 * It invokes the `logout` server action and does nothing else. In particular it
 * does not navigate: the action ends the session and issues the redirect on the
 * server, in one response, so the browser never moves while the session is
 * still alive. That ordering is the whole fix — the previous implementation
 * called `next-auth/react`'s client `signOut()`, which navigates on any HTTP
 * 200, including the 200 that means "refused, session untouched".
 *
 * The action can still legitimately come back without redirecting — the seam
 * rate-limits it — so that case is surfaced instead of being mistaken for
 * success. Anything else it can throw is a NEXT_REDIRECT, which is the
 * navigation itself and must not be caught.
 *
 * Ending the session on the server does mean nobody tells the client session
 * store, which the marketing header reads through `useSession()`. The client
 * `signOut()` this replaced announced its own write and then reloaded the page,
 * and both of those did the telling; a server action does neither. So the store
 * is sent to re-read the session once the call has settled — see
 * `lib/auth-session-sync.ts`.
 */
export function LogoutButton({ className }: { className?: string }) {
  const t = useTranslations("navigation");
  const [isPending, startTransition] = useTransition();
  const [failed, setFailed] = useState(false);

  return (
    <button
      type="button"
      disabled={isPending}
      className={className}
      onClick={() =>
        startTransition(async () => {
          setFailed(false);
          // A returned value means the seam refused (rate limit); a successful
          // logout never returns, it redirects.
          const call = logout();
          // Whichever way it settles, the server has by then been asked to end
          // the session, so the client store has to go and look again. It is
          // attached to the promise instead of written after the `await`
          // because a completed logout never gets past that await: Next rejects
          // the action promise with its redirect signal and performs the
          // navigation itself. Attached before the await, but it can only run
          // after — the server's answer is what settles the promise, and asking
          // any earlier would just re-read the session that is still alive.
          void call.then(resyncClientSession, resyncClientSession);
          const result = await call;
          if (result && "success" in result && result.success === false) {
            setFailed(true);
          }
        })
      }
    >
      <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
      <span>{failed ? t("logoutRetry") : t("logout")}</span>
    </button>
  );
}
