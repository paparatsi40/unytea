import { permanentRedirect } from "next/navigation";

const SUPPORTED_LOCALES = ["en", "es", "fr"] as const;
type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

/**
 * Pricing isn't its own page — it's a `#pricing` section on the homepage.
 * Search Console flagged /es/pricing as crawled-not-indexed (404). We
 * redirect 308 to the homepage anchor so any inbound link equity is
 * preserved and Google replaces /pricing with the canonical URL.
 *
 * Why this lives in app/[locale]/pricing/page.tsx and not in next.config's
 * redirects(): the middleware processes /[locale]/* routes before config
 * redirects get a chance to run, so the config redirect was being silently
 * ignored. Putting the redirect inside the routing system itself fixes that.
 */
export default function PricingRedirect({
  params,
}: {
  params: { locale: string };
}) {
  const locale = (SUPPORTED_LOCALES as readonly string[]).includes(params.locale)
    ? (params.locale as SupportedLocale)
    : "en";
  permanentRedirect(`/${locale}#pricing`);
}

export function generateStaticParams() {
  return SUPPORTED_LOCALES.map((locale) => ({ locale }));
}
