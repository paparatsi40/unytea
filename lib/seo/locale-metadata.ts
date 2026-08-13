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

/**
 * The locale `x-default` resolves to: the page a search engine should show a
 * user whose language matches none of ours.
 */
const DEFAULT_LOCALE: SupportedLocale = "en";

export function isSupportedLocale(value: unknown): value is SupportedLocale {
  return typeof value === "string" && (SUPPORTED_LOCALES as readonly string[]).includes(value);
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
  const normalizedPath = normalizePath(path);

  return {
    alternates: {
      canonical: `${BASE_URL}/${safeLocale}${normalizedPath}`,
      languages: {
        ...Object.fromEntries(
          SUPPORTED_LOCALES.map((l) => [l, `${BASE_URL}/${l}${normalizedPath}`])
        ),
        // Without this the homepage has no x-default at all: a page's
        // `alternates` replaces the root layout's wholesale, and the root's
        // x-default went with it.
        "x-default": `${BASE_URL}/${DEFAULT_LOCALE}${normalizedPath}`,
      },
    },
  };
}

/**
 * Normalize a page path to exactly the form the router serves.
 *
 * The homepage passes `""`, which used to become `"/"` and produced a canonical
 * of `https://www.unytea.com/en/`. That URL is not the page: `trailingSlash` is
 * off, so `/en/` 308-redirects to `/en`. A canonical pointing at a redirect is
 * not self-referential, and because every hreflang carried the same slash,
 * Lighthouse read the canonical as pointing at one of the alternates rather
 * than at this document — the "Document does not have a valid rel=canonical"
 * failure. Sub-pages like `/cookies` were never affected, which is why this hid
 * on every route except the one that matters most.
 */
function normalizePath(path: string): string {
  const trimmed = path.replace(/\/+$/, "");
  if (trimmed === "") return "";
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}
