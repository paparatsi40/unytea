"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

/**
 * Back navigation for the (public) /explore page. Hybrid behaviour: go back to
 * wherever the user came from when there is history; otherwise fall back to a
 * fixed locale-aware destination (the homepage) for deep-links / bookmarks.
 */
export function ExploreBackButton({ fallbackHref }: { fallbackHref: string }) {
  const router = useRouter();
  const t = useTranslations("explore");

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push(fallbackHref);
    }
  };

  return (
    <Button variant="ghost" size="sm" onClick={handleBack} className="-ml-2 mb-2 gap-2">
      <ArrowLeft className="h-4 w-4" />
      {t("backButton")}
    </Button>
  );
}
