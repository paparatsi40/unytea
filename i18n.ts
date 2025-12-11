import { getRequestConfig } from 'next-intl/server';

// Supported locales
export const locales = ['en', 'es', 'pt', 'fr'] as const;
export const defaultLocale = 'en' as const;

export default getRequestConfig(async ({ locale }) => {
  // Use default locale if none provided
  const validLocale = locale || defaultLocale;
  
  // Load the home translations
  const homeMessages = (await import(`./locales/${validLocale}/home.json`)).default;
  
  return {
    locale: validLocale,
    messages: {
      home: homeMessages
    }
  };
});
