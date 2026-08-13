/**
 * The locale contract shared by the two kinds of route tree in this app.
 *
 * Most of the product lives under `app/[locale]/*`, where the locale is a URL
 * segment and next-intl resolves it from the route params. Three trees do not:
 * `app/(dashboard)`, `app/onboarding` and `app/auth`. They are authenticated
 * (or immediately redirected) surfaces with no SEO value, so they were never
 * given a locale prefix — which left them with no way to answer "which language
 * is this user reading in?" and made every server render fall back to English.
 *
 * This module is that missing answer: a single cookie, written whenever the
 * user's language is known, read whenever the URL cannot say. Keeping the name
 * and the validation in one place is what stops the two halves from drifting.
 *
 * Why a cookie and not next-intl's own: `proxy.ts` sets `localeCookie: false`
 * deliberately, because next-intl's middleware writes `Set-Cookie` on *every*
 * response — including CDN-cacheable marketing pages, where one visitor's
 * language then leaks into another's cached response. That must stay off. This
 * cookie is only ever written from the browser via `document.cookie`, so it
 * never appears in a cacheable response and cannot cause that bug.
 */

export const SUPPORTED_LOCALES = ["en", "es", "fr"] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: SupportedLocale = "en";

/**
 * The cookie carrying the user's language for the trees with no `[locale]`
 * segment. `NEXT_LOCALE` is the conventional name and `app/auth/layout.tsx`
 * already read it, so reusing it makes that layout work rather than adding a
 * second name for the same idea.
 */
export const LOCALE_COOKIE = "NEXT_LOCALE";

/** One year: a language choice should outlive a session. */
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** Mirrors the cookie for client code that reads it before hydration. */
export const LOCALE_STORAGE_KEY = "locale";

export function isSupportedLocale(value: unknown): value is SupportedLocale {
  return typeof value === "string" && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

/**
 * Narrow an untrusted locale — a cookie, a localStorage entry, a query param —
 * to one we actually ship messages for.
 *
 * The value is attacker-controllable (any client can set its own cookie) and it
 * is interpolated into a dynamic `import()` of a locale file, so validating
 * here rather than at the call site is what keeps that import from becoming a
 * path-traversal primitive.
 */
export function resolveLocale(value: unknown): SupportedLocale {
  return isSupportedLocale(value) ? value : DEFAULT_LOCALE;
}

/**
 * Persist the user's language from the browser.
 *
 * Written with `document.cookie` rather than a `Set-Cookie` response header on
 * purpose — see the note at the top of this file. `localStorage` is kept in
 * step because client code that runs before any provider mounts still reads it.
 *
 * Callers must be client components; the guard is for the module being pulled
 * into a server bundle by a shared import, not for defensive programming.
 */
export function storeLocalePreference(locale: SupportedLocale): void {
  if (typeof document === "undefined") return;

  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${LOCALE_COOKIE_MAX_AGE}; samesite=lax`;

  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // Private-browsing modes can refuse localStorage. The cookie is the one
    // that matters for rendering, so a failure here is not worth surfacing.
  }
}

/** Read the persisted language in the browser: cookie first, storage second. */
export function readStoredLocale(): SupportedLocale {
  if (typeof document === "undefined") return DEFAULT_LOCALE;

  const fromCookie = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${LOCALE_COOKIE}=`))
    ?.slice(LOCALE_COOKIE.length + 1);

  if (isSupportedLocale(fromCookie)) return fromCookie;

  try {
    return resolveLocale(window.localStorage.getItem(LOCALE_STORAGE_KEY));
  } catch {
    return DEFAULT_LOCALE;
  }
}
