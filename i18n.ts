import { getRequestConfig } from 'next-intl/server';

// Lista de idiomas soportados
export const locales = ['en', 'es', 'pt', 'fr'] as const;
export const defaultLocale = 'en' as const;

export default getRequestConfig(async ({ requestLocale }) => {
  // En next-intl 4.x, requestLocale es una Promise
  let locale = await requestLocale;
  
  // Validar y usar fallback si es necesario
  if (!locale || !locales.includes(locale as any)) {
    locale = defaultLocale;
  }

  try {
    // Cargar todos los archivos de mensajes disponibles para este locale
    const [homeMessages, dashboardMessages] = await Promise.all([
      import(`./locales/${locale}/home.json`).then((module) => module.default),
      import(`./locales/${locale}/dashboard.json`).then((module) => module.default),
    ]);

    return {
      locale,
      messages: {
        ...homeMessages,
        dashboard: dashboardMessages,
      },
    };
  } catch (error) {
    console.warn(`Could not load messages for locale "${locale}". Falling back to "${defaultLocale}".`, error);
    // Fallback a inglés
    const [homeMessages, dashboardMessages] = await Promise.all([
      import(`./locales/${defaultLocale}/home.json`).then((module) => module.default),
      import(`./locales/${defaultLocale}/dashboard.json`).then((module) => module.default),
    ]);

    return {
      locale: defaultLocale,
      messages: {
        ...homeMessages,
        dashboard: dashboardMessages,
      },
    };
  }
});
