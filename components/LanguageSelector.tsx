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
import { readStoredLocale, resolveLocale, storeLocalePreference } from "@/lib/locale";

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
      setCurrentLocale(readStoredLocale());
    }
  }, [pathname]);

  const handleLocaleChange = (rawLocale: string) => {
    const newLocale = resolveLocale(rawLocale);

    // Persist before navigating: the server reads this cookie to render the
    // trees that have no locale in their URL (dashboard, onboarding, auth).
    storeLocalePreference(newLocale);
    setCurrentLocale(newLocale);

    // Check if we're on an i18n route
    const isI18nRoute = locales.some((l) => pathname.startsWith(`/${l.code}`));

    if (isI18nRoute) {
      // Replace current locale in pathname with new one and navigate
      const newPathname = pathname.replace(/^\/(en|es|fr)/, `/${newLocale}`);
      router.push(newPathname);
      router.refresh();
    } else {
      // Dashboard / onboarding / auth have no [locale] segment, so there is no
      // URL to change: the language now lives in the cookie the server just
      // received. A full reload is what re-renders those layouts against it —
      // router.refresh() would replay the RSC request, but every already-
      // mounted client component would keep its stale provider.
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
