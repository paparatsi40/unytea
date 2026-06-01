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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Detect current locale from pathname or localStorage
    const pathLocale = locales.find((l) => pathname.startsWith(`/${l.code}`));
    if (pathLocale) {
      setCurrentLocale(pathLocale.code);
    } else {
      const savedLocale = localStorage.getItem("locale") || "en";
      setCurrentLocale(savedLocale);
    }
  }, [pathname]);

  const handleLocaleChange = (newLocale: string) => {
    localStorage.setItem("locale", newLocale);
    setCurrentLocale(newLocale);

    // Check if we're on an i18n route
    const isI18nRoute = locales.some((l) => pathname.startsWith(`/${l.code}`));

    if (isI18nRoute) {
      // Replace current locale in pathname with new one and navigate
      const newPathname = pathname.replace(/^\/(en|es|fr)/, `/${newLocale}`);
      router.push(newPathname);
      router.refresh();
    } else {
      // Dashboard / auth route groups have no [locale] segment.
      // NextIntlClientProvider in the layout reads the locale from
      // localStorage at mount and doesn't observe later changes, so a soft
      // re-render leaves every other mounted component with stale strings.
      // Force a full reload to re-mount the provider with the new locale.
      window.location.reload();
    }
  };

  const currentLocaleData = locales.find((l) => l.code === currentLocale);

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <Button variant="ghost" size="sm" className="gap-2">
        <Globe className="h-4 w-4" />
        <span className="text-xs uppercase">EN</span>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Globe className="h-4 w-4" />
          <span className="hidden sm:inline">{currentLocaleData?.flag}</span>
          <span className="text-xs uppercase">{currentLocale}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {locales.map((l) => (
          <DropdownMenuItem
            key={l.code}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleLocaleChange(l.code);
            }}
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
