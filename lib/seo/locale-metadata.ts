import type { Metadata } from "next";

/**
 * Helper to generate `metadata.alternates` (canonical + hreflang) for any
 * static page that lives under `[locale]`. Without these, Google treats
 * /en/cookies, /es/cookies and /fr/cookies as duplicates without a clear
 * preferred version — which is exactly what Search Console flagged as
 * "Duplicate without user-selected canonical" and "Duplicate, Google chose
 * different canonical than user."
 *
 * Usage:
 *   export async function generateMetadata({ params }) {
 *     return {
 *       title: "…",
 *       description: "…",
 *       ...localizedAlternates({ path: "/cookies", locale: params.locale }),
 *     };
 *   }
 *
 * The canonical always points to the locale being rendered (so each locale
 * variant declares itself as canonical of its own URL). The `languages`
 * map gives Google the full set of equivalents — Google uses this for
 * country/language targeting.
 */

const BASE_URL = "https://www.unytea.com";
export const SUPPORTED_LOCALES = ["en", "es", "fr"] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export function isSupportedLocale(value: unknown): value is SupportedLocale {
  return (
    typeof value === "string" &&
    (SUPPORTED_LOCALES as readonly string[]).includes(value)
  );
}

export function resolveLocale(value: unknown, fallback: SupportedLocale = "en"): SupportedLocale {
  return isSupportedLocale(value) ? value : fallback;
}

export function localizedAlternates({
  path,
  locale,
}: {
  /** Path WITHOUT the locale prefix and WITHOUT trailing slash. e.g. "/cookies" */
  path: string;
  /** The locale currently being rendered. */
  locale: string;
}): Pick<Metadata, "alternates"> {
  const safeLocale = resolveLocale(locale);
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  return {
    alternates: {
      canonical: `${BASE_URL}/${safeLocale}${normalizedPath}`,
      languages: Object.fromEntries(
        SUPPORTED_LOCALES.map((l) => [l, `${BASE_URL}/${l}${normalizedPath}`])
      ),
    },
  };
}
