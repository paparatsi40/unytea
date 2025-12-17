"use client";
import { usePathname } from "next/navigation";

export function useLocale() {
  const pathname = usePathname();
  
  // Extract locale from pathname (e.g., /en/dashboard -> en)
  const segments = pathname?.split('/').filter(Boolean) || [];
  const locale = segments[0] || 'en';
  
  // Validate it's a valid locale
  const validLocales = ['en', 'es', 'pt', 'fr'];
  return validLocales.includes(locale) ? locale : 'en';
}
