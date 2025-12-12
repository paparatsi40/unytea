"use client";

import { useRouter, usePathname } from "next/navigation";
import { useParams } from "next/navigation";
import { Globe } from "lucide-react";

export function LanguageSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const { locale } = useParams();

  const switchLanguage = (lang: string) => {
    const newPath = pathname.replace(`/${locale}`, `/${lang}`);
    router.push(newPath);
  };

  return (
    <div className="flex items-center gap-2 text-sm">
      <Globe className="w-4 h-4 text-muted-foreground" />
      <select
        value={locale}
        onChange={(e) => switchLanguage(e.target.value)}
        className="bg-transparent border-none text-muted-foreground hover:text-foreground cursor-pointer"
      >
        <option value="en">EN</option>
        <option value="es">ES</option>
      </select>
    </div>
  );
}
