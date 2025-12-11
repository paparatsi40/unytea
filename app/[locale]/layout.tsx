import type { Metadata } from "next";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';

export const metadata: Metadata = {
  title: {
    default: "Unytea - Where Communities Unite",
    template: "%s | Unytea",
  },
  description:
    "The most advanced community platform. Build engaged communities with video calls, courses, and collaborative tools.",
};

export default async function LocaleLayout({
  children,
  params: { locale }
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  // Providing all messages to the client side
  const messages = await getMessages();

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
