import { getRequestConfig } from "next-intl/server";

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;
  
  // Fallback to default locale
  if (!locale) {
    locale = "en";
  }

  return {
    locale,
    messages: (await import(`../locales/${locale}.json`)).default,
  };
});
