import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";

/**
 * In practice this layout almost never renders: `proxy.ts` redirects
 * /auth/* → /{locale}/auth/* before it runs, and the real locale detection for
 * auth pages happens there (referer, then Accept-Language). When it does render
 * — a bookmark hitting the unprefixed path, say — the locale comes from the
 * cookie via `src/i18n.ts`, the same source the dashboard and onboarding use.
 */
export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages} locale={locale}>
      {children}
    </NextIntlClientProvider>
  );
}
