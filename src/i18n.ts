import { getRequestConfig } from "next-intl/server";

const locales = ["en", "es", "fr"] as const;
const defaultLocale = "en";

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  // Validar que el locale es uno soportado; si no, fallback al default.
  if (!locale || !locales.includes(locale as (typeof locales)[number])) {
    locale = defaultLocale;
  }

  return {
    locale,
    messages: (await import(`../locales/${locale}.json`)).default,
  };
});
