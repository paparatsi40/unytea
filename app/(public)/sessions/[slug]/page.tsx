import { permanentRedirect } from "next/navigation";

// Legacy mirror of the session detail page. The canonical, i18n-enabled
// route is /[locale]/s/[slug] (wrapped in NextIntlClientProvider in
// app/[locale]/layout.tsx). This (public) route group has no provider, so
// adding useTranslations to <PublicSessionPage> would crash here — instead
// we permanently redirect to the canonical route. A 308 preserves SEO
// (crawlers consolidate /sessions/[slug] into /en/s/[slug]); the NextIntl
// middleware/cookie then steers returning users to their preferred locale.
export default async function LegacySessionRedirect({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  permanentRedirect(`/en/s/${slug}`);
}
