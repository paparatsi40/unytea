"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { LogOut } from "lucide-react";
import { logout } from "@/app/actions/auth";

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
          const result = await logout();
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
