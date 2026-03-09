import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getLocale } from 'next-intl/server';

export default async function DashboardRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Use default locale since dashboard skips i18n middleware
  let locale = 'en';
  let messages;
  
  try {
    locale = await getLocale() || 'en';
    messages = await getMessages();
  } catch {
    // Fallback to default messages if i18n fails
    messages = (await import('@/locales/en.json')).default;
  }

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
