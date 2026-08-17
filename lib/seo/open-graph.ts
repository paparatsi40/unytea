import type { Metadata } from "next";
import { SITE_URL } from "@/lib/site-url";

/**
 * Shared Open Graph defaults.
 *
 * Next merges `metadata` per top-level field, not per leaf: a page that defines
 * `openGraph` replaces the root layout's **entire** object rather than adding to
 * it. The homepage declared `{ title, description, type }` and so silently threw
 * away `url`, `siteName`, `locale`, `alternateLocale` and — the one that shows —
 * `images`. Sharing unytea.com produced a preview with no picture and no
 * canonical URL, on the single URL most likely to be shared.
 *
 * This is the same trap `localizedAlternates` exists to work around one field
 * over, where the root's `x-default` vanished the same way. The fix is the same
 * shape: keep the defaults in one place and spread them at every call site.
 *
 *   openGraph: { ...baseOpenGraph, title, description }
 *
 * Spread it. Never write a bare `openGraph` object in a page again.
 */
export const baseOpenGraph = {
  type: "website",
  locale: "en_US",
  alternateLocale: ["es_ES", "fr_FR"],
  // Apex origin from lib/site-url.ts — the canonicalisation work retired
  // www.unytea.com, and an og:url on the retired host would advertise a URL
  // that 308-redirects.
  url: SITE_URL,
  siteName: "Unytea",
  images: [
    {
      url: "/og",
      width: 1200,
      height: 630,
      alt: "Unytea — Where Communities Unite",
      type: "image/png",
    },
  ],
} as const satisfies NonNullable<Metadata["openGraph"]>;

/**
 * `baseOpenGraph` with `url` pointed at the locale actually being rendered, so
 * og:url agrees with the `rel=canonical` that `localizedAlternates` emits for
 * the same page. Two different self-URLs on one document is a contradiction
 * search engines have to guess their way out of.
 */
export function localizedOpenGraph(locale: string, path = "") {
  const normalized = path.replace(/\/+$/, "");
  return {
    ...baseOpenGraph,
    url: `${SITE_URL}/${locale}${normalized}`,
  };
}
