import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

const locales = ["en", "es", "fr"] as const;

/**
 * Pre-genera el HTML para cada locale en build time.
 * Esto convierte estas rutas en estáticas, lo que permite que Vercel las cachee
 * en CDN y reduce dramáticamente el TTFB.
 */
export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  // Validar que el locale solicitado es uno soportado.
  if (!locales.includes(locale as (typeof locales)[number])) {
    notFound();
  }

  // setRequestLocale habilita static rendering para esta ruta.
  // Sin esto, next-intl marca la ruta como dinámica al usar getMessages().
  setRequestLocale(locale);

  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages} locale={locale}>
      {children}
    </NextIntlClientProvider>
  );
}
