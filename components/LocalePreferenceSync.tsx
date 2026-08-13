"use client";

import { useEffect } from "react";
import { useLocale } from "next-intl";
import { readStoredLocale, resolveLocale, storeLocalePreference } from "@/lib/locale";

/**
 * Carry the locale from the URL into the persisted preference.
 *
 * Under `app/[locale]/*` the language is in the address bar, so it is known
 * without any storage. The dashboard, onboarding and auth trees have no locale
 * segment and read the cookie instead — which means a visitor who lands on
 * `/es`, signs up in Spanish and is redirected to `/dashboard` would arrive at
 * an English app unless something writes that preference down. This is that
 * something.
 *
 * It runs in the browser rather than as a `Set-Cookie` header because these
 * pages are prerendered and CDN-cached: a response header here would hand one
 * visitor's language to every subsequent visitor of the cached page, which is
 * exactly the bug `localeCookie: false` exists to prevent.
 *
 * The explicit language switcher still wins — it writes the same cookie and
 * navigates to the matching prefix, so the two never disagree for long.
 */
export function LocalePreferenceSync() {
  const locale = useLocale();

  useEffect(() => {
    const active = resolveLocale(locale);
    if (readStoredLocale() !== active) {
      storeLocalePreference(active);
    }
  }, [locale]);

  return null;
}
