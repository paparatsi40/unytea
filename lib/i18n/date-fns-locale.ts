import { enUS, es, fr, type Locale } from "date-fns/locale";

// Shared map of next-intl locale codes → date-fns locales. Extracted from the
// copies that had accumulated across the dashboard (Sub-Phases A/B/E). Use this
// instead of re-declaring DATE_FNS_LOCALES inline.
const DATE_FNS_LOCALES: Record<string, Locale> = {
  en: enUS,
  es,
  fr,
};

export function getDateFnsLocale(locale: string): Locale {
  return DATE_FNS_LOCALES[locale] ?? enUS;
}
