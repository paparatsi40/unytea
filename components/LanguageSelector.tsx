"use client";

import { usePathname, useRouter } from "next/navigation";
import { Globe } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

const locales = [
  { code: "en", label: "English", flag: "🇺🇸" },
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
];

export function LanguageSelector() {
  const router = useRouter();
  const pathname = usePathname() ?? "/";
  const [currentLocale, setCurrentLocale] = useState("en");

  // Detect current locale from pathname or localStorage
  useEffect(() => {
    // Check pathname first
    const pathLocale = locales.find(l => pathname.startsWith(`/${l.code}`));
    if (pathLocale) {
      setCurrentLocale(pathLocale.code);
      localStorage.setItem("locale", pathLocale.code);
    } else {
      // Fallback to localStorage or default
      const savedLocale = localStorage.getItem("locale") || "en";
      setCurrentLocale(savedLocale);
    }
  }, [pathname]);

  const handleLocaleChange = (newLocale: string) => {
    localStorage.setItem("locale", newLocale);
    
    // Check if we're on an i18n route or dashboard route
    const isI18nRoute = locales.some(l => pathname.startsWith(`/${l.code}`));
    
    if (isI18nRoute) {
      // Replace current locale in pathname with new one
      const newPathname = pathname.replace(/^\/(en|es|fr)/, `/${newLocale}`);
      router.push(newPathname);
    } else {
      // We're on dashboard/auth route without locale prefix
      // Redirect to home with new locale, or stay if we want to support dashboard i18n later
      router.push(`/${newLocale}`);
    }
    router.refresh();
  };

  const currentLocaleData = locales.find((l) => l.code === currentLocale);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Globe className="h-4 w-4" />
          <span className="hidden sm:inline">{currentLocaleData?.flag}</span>
          <span className="uppercase text-xs">{currentLocale}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {locales.map((l) => (
          <DropdownMenuItem
            key={l.code}
            onClick={() => handleLocaleChange(l.code)}
            className={`gap-2 ${l.code === currentLocale ? "bg-accent" : ""}`}
          >
            <span>{l.flag}</span>
            <span>{l.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
