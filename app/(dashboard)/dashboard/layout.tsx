import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

/**
 * The dashboard has no `[locale]` segment, so next-intl cannot read the
 * language from the URL. It comes from the locale cookie instead, resolved in
 * `src/i18n.ts` — see `lib/locale.ts` for why that cookie exists.
 *
 * This used to be a client component that read `localStorage` in an effect and
 * blocked the whole tree behind a "Loading..." screen while it did. That cost a
 * full render pass on every dashboard visit and, more importantly, left every
 * server component below it rendering in English: server code cannot see
 * localStorage. Resolving here makes the language available to both halves.
 */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <DashboardShell>{children}</DashboardShell>
    </NextIntlClientProvider>
  );
}
