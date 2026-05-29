"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Interval = "monthly" | "annual";

export interface PricingCardProps {
  name: string;
  description: string;
  monthlyPrice: number; // dollars (not cents)
  annualPrice: number; // dollars
  interval: Interval;
  commissionPercent: number; // 8 / 5 / 3
  features: string[];
  stripePriceIdMonthly: string;
  stripePriceIdYearly: string;
  ctaLabel?: string; // override (default: "Start 14-day trial")
  featured?: boolean;
  featuredLabel?: string;
  locale: string;
}

const STRINGS = {
  defaultCta: "Start 14-day trial",
  trialNote: "14-day free trial — no card required",
  perMonth: "/month",
  perYear: "/year",
  annualSavings: (monthlyEquivalent: number) =>
    `vs $${monthlyEquivalent}/year on monthly billing`,
  commission: (pct: number) => `+ ${pct}% commission on member revenue`,
  loading: "Loading...",
  notAvailable: "Not available",
  errorMissingPrice: "Stripe price ID not configured",
  errorCheckout: "Failed to start checkout",
};

export function PricingCard({
  name,
  description,
  monthlyPrice,
  annualPrice,
  interval,
  commissionPercent,
  features,
  stripePriceIdMonthly,
  stripePriceIdYearly,
  ctaLabel,
  featured = false,
  featuredLabel,
  locale,
}: PricingCardProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const priceId = interval === "monthly" ? stripePriceIdMonthly : stripePriceIdYearly;
  const displayPrice = interval === "monthly" ? monthlyPrice : annualPrice;
  const displayUnit = interval === "monthly" ? STRINGS.perMonth : STRINGS.perYear;
  const monthlyEquivalent = monthlyPrice * 12;

  async function handleCheckout() {
    if (!priceId) {
      toast.error(STRINGS.errorMissingPrice);
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
        // Unauthenticated: bounce to signup. After signup the user lands on
        // onboarding and can revisit /dashboard/upgrade to complete checkout.
        router.push(`/${locale}/auth/signup`);
        return;
      }

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error?.error ?? STRINGS.errorCheckout);
      }

      const { url } = await response.json();
      if (url) {
        window.location.href = url;
      } else {
        throw new Error(STRINGS.errorCheckout);
      }
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error(error instanceof Error ? error.message : STRINGS.errorCheckout);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div
      className={cn(
        "relative flex flex-col rounded-xl border bg-card p-6",
        featured ? "border-primary shadow-lg shadow-primary/10 ring-2 ring-primary/20" : "border-border"
      )}
    >
      {featured && featuredLabel && (
        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
          {featuredLabel}
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
            {STRINGS.annualSavings(monthlyEquivalent)}
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
            {STRINGS.loading}
          </>
        ) : !priceId ? (
          STRINGS.notAvailable
        ) : (
          ctaLabel ?? STRINGS.defaultCta
        )}
      </Button>

      <p className="mt-3 text-center text-xs text-muted-foreground">{STRINGS.trialNote}</p>

      <p className="mt-4 border-t border-border pt-3 text-center text-xs text-muted-foreground">
        {STRINGS.commission(commissionPercent)}
      </p>
    </div>
  );
}
