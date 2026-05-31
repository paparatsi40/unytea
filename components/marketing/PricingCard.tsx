"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Interval = "monthly" | "annual";
export type TierKey = "creator" | "business" | "pro";

export interface PricingCardProps {
  tierKey: TierKey;
  monthlyPrice: number; // dollars (not cents)
  annualPrice: number; // dollars
  interval: Interval;
  commissionPercent: number; // 8 / 5 / 3
  stripePriceIdMonthly: string;
  stripePriceIdYearly: string;
  featured?: boolean;
  locale: string;
}

export function PricingCard({
  tierKey,
  monthlyPrice,
  annualPrice,
  interval,
  commissionPercent,
  stripePriceIdMonthly,
  stripePriceIdYearly,
  featured = false,
  locale,
}: PricingCardProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const t = useTranslations("billing.pricing");
  const tTier = useTranslations(`billing.tiers.${tierKey}`);

  const priceId = interval === "monthly" ? stripePriceIdMonthly : stripePriceIdYearly;
  const displayPrice = interval === "monthly" ? monthlyPrice : annualPrice;
  const displayUnit = interval === "monthly" ? t("perMonth") : t("perYear");
  const monthlyEquivalent = monthlyPrice * 12;
  const annualSavings = monthlyEquivalent - annualPrice;

  const name = tTier("name");
  const description = tTier("description");
  // t.raw lets us pull array values without ICU formatting (features is a
  // string[] in the locale file).
  const features = tTier.raw("features") as string[];

  async function handleCheckout() {
    if (!priceId) {
      toast.error("Stripe price ID not configured");
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId }),
      });

      if (response.status === 401) {
        router.push(`/${locale}/auth/signup`);
        return;
      }

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error?.error ?? "Failed to start checkout");
      }

      const { url } = await response.json();
      if (url) {
        window.location.href = url;
      } else {
        throw new Error("Failed to start checkout");
      }
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to start checkout");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div
      className={cn(
        "relative flex flex-col rounded-xl border bg-card p-6",
        featured
          ? "border-primary shadow-lg shadow-primary/10 ring-2 ring-primary/20"
          : "border-border"
      )}
    >
      {featured && (
        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
          {t("featuredLabel")}
        </Badge>
      )}

      <div className="mb-6 text-center">
        <h3 className="text-lg font-semibold">{name}</h3>
        <div className="mt-3">
          <span className="text-5xl font-bold">${displayPrice}</span>
          <span className="ml-1 text-muted-foreground">{displayUnit}</span>
        </div>
        {interval === "annual" && (
          <p className="mt-1 text-xs text-muted-foreground">
            {t("annualSavingsHint", { amount: annualSavings })}
          </p>
        )}
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      </div>

      <ul className="mb-6 flex-1 space-y-2.5">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-sm">
            <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500" aria-hidden />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <Button
        className="w-full"
        variant={featured ? "default" : "outline"}
        onClick={handleCheckout}
        disabled={isLoading || !priceId}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
            {t("trialCta")}
          </>
        ) : (
          t("trialCta")
        )}
      </Button>

      <p className="mt-3 text-center text-xs text-muted-foreground">{t("trialNoCC")}</p>

      <p className="mt-4 border-t border-border pt-3 text-center text-xs text-muted-foreground">
        {t("commission", { percent: commissionPercent })}
      </p>
    </div>
  );
}
