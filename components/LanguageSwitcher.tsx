"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Globe, Check } from "lucide-react";
import { locales, defaultLocale } from "@/i18n";

const languages = {
  en: { name: "English", flag: "🇺🇸" },
  es: { name: "Español", flag: "🇪🇸" },
  pt: { name: "Português", flag: "🇧🇷" },
  fr: { name: "Français", flag: "🇫🇷" },
} as const;

export function LanguageSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const rawPathname = usePathname();
  const router = useRouter();

  // Normalize the pathname (remove trailing slash)
  const pathname = (rawPathname?.replace(/\/+$/, "") || "/");

  useEffect(() => {
    setMounted(true);
  }, []);

  // Detect current locale from the pathname
  const pathSegments = pathname.split("/");
  const currentLocale = locales.includes(pathSegments[1] as any)
    ? (pathSegments[1] as typeof locales[number])
    : defaultLocale;

  const handleLanguageChange = (locale: typeof locales[number]) => {
    const segments = pathname.split("/");

    if (locales.includes(segments[1] as any)) {
      segments[1] = locale; // Replace existing locale
    } else {
      segments.splice(1, 0, locale); // Insert locale
    }

    const newPath = segments.join("/") || "/";
    router.push(newPath);
    router.refresh();
    setIsOpen(false);
  };

  if (!mounted) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-accent transition-colors"
        aria-label="Change language"
      >
        <Globe className="w-4 h-4" />
        <span className="text-sm font-medium">{languages[currentLocale].flag}</span>
        <span className="text-sm font-medium hidden sm:inline">{languages[currentLocale].name}</span>
      </button>

      {isOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute right-0 mt-2 w-48 rounded-xl border border-border bg-card shadow-lg z-50 overflow-hidden">
            {locales.map((locale) => (
              <button
                key={locale}
                onClick={() => handleLanguageChange(locale)}
                className={`w-full flex items-center justify-between px-4 py-3 hover:bg-accent transition-colors ${
                  currentLocale === locale ? "bg-primary/5" : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">{languages[locale].flag}</span>
                  <span className="text-sm font-medium">{languages[locale].name}</span>
                </div>
                {currentLocale === locale && (
                  <Check className="w-4 h-4 text-primary" />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
