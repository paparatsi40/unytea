"use client";

import { useRouter, usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BackButtonProps {
  label?: string;
  fallbackUrl?: string; // e.g. "/dashboard/sessions"
  className?: string;
}

function getLocaleFromPathname(pathname: string | null) {
  const safe = pathname ?? "/en";
  const seg = safe.split("/").filter(Boolean)[0];
  return seg || "en";
}

function isAbsoluteUrl(url: string) {
  return /^https?:\/\//i.test(url);
}

export function BackButton({
  label = "Back",
  fallbackUrl = "/dashboard",
  className = "",
}: BackButtonProps) {
  const router = useRouter();
  const pathname = usePathname();
  const locale = getLocaleFromPathname(pathname);

  const handleBack = () => {
    // Browser back first
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }

    // Fallback navigation (locale-safe)
    if (!fallbackUrl) return;

    if (isAbsoluteUrl(fallbackUrl)) {
      router.push(fallbackUrl);
      return;
    }

    const normalized = fallbackUrl.startsWith("/") ? fallbackUrl : `/${fallbackUrl}`;

    // ✅ Solo consideramos "ya tiene locale" si empieza con EL locale actual
    // Ej: "/en/dashboard/sessions"
    const alreadyLocalized =
      normalized === `/${locale}` || normalized.startsWith(`/${locale}/`);

    router.push(alreadyLocalized ? normalized : `/${locale}${normalized}`);
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleBack}
      className={`gap-2 ${className}`}
    >
      <ArrowLeft className="h-4 w-4" />
      {label}
    </Button>
  );
}
