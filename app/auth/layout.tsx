import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { cookies, headers } from 'next/headers';

/**
 * Auth pages live OUTSIDE the [locale] route segment, so there's no URL
 * prefix to read the visitor's language from. We used to rely on the
 * NEXT_LOCALE cookie, but that was disabled at the middleware level (it
 * was being shipped on every CDN-cached response, overwriting visitors'
 * preferences). Now we detect language with a small priority list and
 * fall back gracefully to English.
 *
 * Priority:
 *   1. NEXT_LOCALE cookie — only honored if it's still a supported locale.
 *      Kept for backward compat; new visitors won't have it.
 *   2. Referer URL prefix — e.g. visitor coming from /es/explore wants Spanish.
 *   3. Accept-Language header — browser's declared preference, matched
 *      against our supported set.
 *   4. Default to 'en'.
 */

const SUPPORTED_LOCALES = ['en', 'es', 'fr'] as const;
type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];
const DEFAULT_LOCALE: SupportedLocale = 'en';

function isSupportedLocale(value: string | null | undefined): value is SupportedLocale {
  return !!value && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

function localeFromReferer(referer: string | null): SupportedLocale | null {
  if (!referer) return null;
  try {
    const { pathname } = new URL(referer);
    const firstSegment = pathname.split('/').filter(Boolean)[0];
    return isSupportedLocale(firstSegment) ? firstSegment : null;
  } catch {
    // Malformed referer (rare but possible); ignore.
    return null;
  }
}

function localeFromAcceptLanguage(header: string | null): SupportedLocale | null {
  if (!header) return null;
  // Header format: "es-ES,es;q=0.9,en;q=0.8". We normalize to base lang
  // ("es-ES" → "es"), sort by q-value, and pick the first supported one.
  const entries = header
    .split(',')
    .map((part) => {
      const [tag, ...params] = part.trim().split(';');
      const qParam = params.find((p) => p.trim().startsWith('q='));
      const q = qParam ? Number(qParam.split('=')[1]) : 1;
      const baseLang = (tag || '').toLowerCase().split('-')[0];
      return { lang: baseLang, q: Number.isFinite(q) ? q : 0 };
    })
    .filter((e) => e.lang.length > 0)
    .sort((a, b) => b.q - a.q);

  for (const entry of entries) {
    if (isSupportedLocale(entry.lang)) return entry.lang;
  }
  return null;
}

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = cookies();
  const headersList = headers();

  const cookieLocale = cookieStore.get('NEXT_LOCALE')?.value;
  const refererLocale = localeFromReferer(headersList.get('referer'));
  const acceptLocale = localeFromAcceptLanguage(headersList.get('accept-language'));

  const locale: SupportedLocale =
    (isSupportedLocale(cookieLocale) ? cookieLocale : null) ||
    refererLocale ||
    acceptLocale ||
    DEFAULT_LOCALE;

  const messages = await getMessages({ locale });

  return (
    <NextIntlClientProvider messages={messages} locale={locale}>
      {children}
    </NextIntlClientProvider>
  );
}
