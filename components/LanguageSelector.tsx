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
    const pathLocale = locales.find(l => pathname.startsWith(`/${l.code}`));
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
    const isI18nRoute = locales.some(l => pathname.startsWith(`/${l.code}`));
    
    if (isI18nRoute) {
      // Replace current locale in pathname with new one and navigate
      const newPathname = pathname.replace(/^\/(en|es|fr)/, `/${newLocale}`);
      router.push(newPathname);
      router.refresh();
    }
    // If on dashboard/auth (no i18n), stay on current page
    // The locale preference is saved and will apply to public pages
  };

  const currentLocaleData = locales.find((l) => l.code === currentLocale);

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <Button variant="ghost" size="sm" className="gap-2">
        <Globe className="h-4 w-4" />
        <span className="uppercase text-xs">EN</span>
      </Button>
    );
  }

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
