import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { cookies } from 'next/headers';

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Get locale from cookie or default to 'en'.
  // In practice this layout almost never renders: the middleware redirects
  // /auth/* → /{locale}/auth/* before this code runs. The real locale
  // detection for auth pages happens in middleware.ts (referer + accept-language)
  // and the rendered page lives under [locale]/auth/*.
  const cookieStore = cookies();
  const locale = cookieStore.get('NEXT_LOCALE')?.value || 'en';

  const messages = await getMessages({ locale });

  return (
    <NextIntlClientProvider messages={messages} locale={locale}>
      {children}
    </NextIntlClientProvider>
  );
}
