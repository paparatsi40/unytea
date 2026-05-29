"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TrialBannerProps {
  daysRemaining: number;
  trialEndsAt: Date;
  planName: string;
}

export function TrialBanner({ daysRemaining, trialEndsAt, planName }: TrialBannerProps) {
  const [isOpening, setIsOpening] = useState(false);
  const t = useTranslations("billing.trial");

  async function openPortal() {
    setIsOpening(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error("Failed to open Stripe portal", err);
    } finally {
      setIsOpening(false);
    }
  }

  // Tone shifts at day 7: friendly → urgent.
  const isUrgent = daysRemaining <= 7;

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 border-b px-4 py-3",
        isUrgent
          ? "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-100"
          : "border-primary/20 bg-primary/5 text-foreground"
      )}
    >
      <div className="flex items-center gap-3">
        <Sparkles className="h-5 w-5 shrink-0" aria-hidden />
        <div className="text-sm">
          {daysRemaining === 0 ? (
            <span className="font-medium">{t("endsToday")}</span>
          ) : (
            <>
              <span className="font-medium">
                {t("daysLeft", { days: daysRemaining, plan: planName })}
              </span>
              <span className="ml-1 text-muted-foreground">
                {t("addPaymentPrompt", { date: trialEndsAt.toLocaleDateString() })}
              </span>
            </>
          )}
        </div>
      </div>
      <Button
        onClick={openPortal}
        disabled={isOpening}
        size="sm"
        variant={isUrgent ? "default" : "outline"}
      >
        {t("addPaymentCta")}
      </Button>
    </div>
  );
}
