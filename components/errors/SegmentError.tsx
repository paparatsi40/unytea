"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { useTranslations } from "next-intl";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * The panel a route segment falls back to when its render throws.
 *
 * Until these existed the only boundary in the app was `global-error.tsx`,
 * which replaces the entire document — so a single failing query in, say, the
 * members tab blanked the sidebar, the header and every other route with it.
 * An `error.tsx` at a segment keeps the failure inside that segment: the
 * layouts above it stay mounted, so the user can still navigate away.
 *
 * That containment is also why this component can be localized at all — it
 * renders below the dashboard layout, inside the provider that layout mounts.
 *
 * `reset()` re-runs the failed render. It is offered rather than a page reload
 * because a transient failure (a dropped connection, a slow upstream) is the
 * common case, and retrying in place costs nothing.
 */
export function SegmentError({
  error,
  reset,
  scope,
}: {
  error: Error & { digest?: string };
  reset: () => void;
  scope: "dashboard" | "community" | "session";
}) {
  const t = useTranslations("dashboard.errorBoundary");

  useEffect(() => {
    // Same reporting global-error does — a contained error is still an error,
    // and these are the ones most likely to go unnoticed precisely because the
    // rest of the app keeps working.
    Sentry.captureException(error, { tags: { segment: scope } });
  }, [error, scope]);

  return (
    <div className="flex min-h-[24rem] items-center justify-center px-4 py-12">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <AlertTriangle className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
        </div>
        <h2 className="mb-2 text-lg font-semibold text-foreground">{t(`${scope}.title`)}</h2>
        <p className="mb-6 text-sm text-muted-foreground">{t(`${scope}.description`)}</p>
        <Button onClick={reset}>{t("retry")}</Button>
        {error.digest && (
          // Support can map this to the Sentry event; it is not an error message.
          <p className="mt-4 text-xs text-muted-foreground">
            {t("reference", { digest: error.digest })}
          </p>
        )}
      </div>
    </div>
  );
}
