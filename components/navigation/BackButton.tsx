"use client";

import { useRouter, usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BackButtonProps {
  label?: string;
  fallbackUrl?: string;
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

function hasLocalePrefix(url: string) {
  // matches "/en/..." or "/es/..."
  return /^\/[a-zA-Z-]{2,5}(\/|$)/.test(url);
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
    // Try browser back first
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }

    // Fallback to specific URL (locale-safe)
    if (!fallbackUrl) return;

    if (isAbsoluteUrl(fallbackUrl) || hasLocalePrefix(fallbackUrl)) {
      router.push(fallbackUrl);
    } else {
      // Ensure it starts with "/"
      const normalized = fallbackUrl.startsWith("/") ? fallbackUrl : `/${fallbackUrl}`;
      router.push(`/${locale}${normalized}`);
    }
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
