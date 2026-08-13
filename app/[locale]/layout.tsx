import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { LocalePreferenceSync } from "@/components/LocalePreferenceSync";

const locales = ["en", "es", "fr"] as const;

/**
 * Pre-genera el HTML para cada locale en build time.
 * Esto convierte estas rutas en estáticas, lo que permite que Vercel las cachee
 * en CDN y reduce dramáticamente el TTFB.
 */
export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout(props: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const params = await props.params;

  const { locale } = params;

  const { children } = props;

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
      {/* Records the URL locale so the dashboard, onboarding and auth trees —
          which have no [locale] segment — render in the same language. */}
      <LocalePreferenceSync />
      {children}
    </NextIntlClientProvider>
  );
}
