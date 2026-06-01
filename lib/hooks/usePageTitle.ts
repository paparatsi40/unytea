"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";

/**
 * Updates document.title client-side with a localized translation.
 *
 * Used in the dashboard tree, where server-side metadata can't localize: the
 * locale is localStorage-only (read in DashboardLayout at mount) and the
 * NEXT_LOCALE cookie is intentionally disabled for CDN caching (see proxy.ts).
 *
 * Trade-off: the SSR <title> stays in the default language (English) for ~1
 * frame after mount, then this hook updates it to the user's locale. Acceptable
 * because the dashboard is auth-gated (not indexed by crawlers) and the
 * server-rendered title is never visible to the user (the tab updates after
 * mount). A cookie-based server fix would regress the documented CDN caching
 * behavior.
 */
export function usePageTitle(translationKey: string, namespace?: string) {
  const t = useTranslations(namespace);
  useEffect(() => {
    document.title = `${t(translationKey)} | Unytea`;
  }, [t, translationKey]);
}
