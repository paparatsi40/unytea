import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isSupportedLocale, resolveLocale } from "@/lib/locale";

export default getRequestConfig(async ({ requestLocale }) => {
  const routeLocale = await requestLocale;

  // Routes under app/[locale]/* carry the locale in the URL; it is authoritative
  // and reading anything else here would let a stale cookie override the address
  // bar. Just as importantly, these routes are statically prerendered — touching
  // cookies() on this path would opt every marketing page into dynamic
  // rendering and lose the CDN cache.
  if (isSupportedLocale(routeLocale)) {
    return {
      locale: routeLocale,
      messages: (await import(`../locales/${routeLocale}.json`)).default,
    };
  }

  // No locale in the URL: this is one of the trees outside [locale] — the
  // dashboard, onboarding or auth. Fall back to the language the user last
  // chose. Those trees are already dynamic (they are authenticated), so the
  // cookie read costs no static rendering.
  const locale = resolveLocale(await readLocaleCookie());

  return {
    locale,
    messages: (await import(`../locales/${locale}.json`)).default,
  };
});

/**
 * `cookies()` throws when there is no request scope — during `generateMetadata`
 * for a fully static route, or when next-intl's config is evaluated outside a
 * render. Falling back to the default locale is correct there: with no request
 * there is no user whose preference we could honour.
 */
async function readLocaleCookie(): Promise<string> {
  try {
    const store = await cookies();
    return store.get(LOCALE_COOKIE)?.value ?? DEFAULT_LOCALE;
  } catch {
    return DEFAULT_LOCALE;
  }
}
