import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";

/**
 * Onboarding sits outside `[locale]`, so the language comes from the locale
 * cookie (resolved in `src/i18n.ts`). This layout used to hardcode `locale="en"`
 * while loading messages for the default locale — which meant a user who signed
 * up in Spanish met an English wizard on their very first screen.
 */
export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages} locale={locale}>
      {children}
    </NextIntlClientProvider>
  );
}
