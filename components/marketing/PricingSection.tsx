"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { PricingCard, type TierKey } from "./PricingCard";

type Interval = "monthly" | "annual";

interface PricingSectionProps {
  locale: string;
}

const TIERS: ReadonlyArray<{
  key: TierKey;
  monthlyPrice: number;
  annualPrice: number;
  commissionPercent: number;
  stripePriceIdMonthly: string;
  stripePriceIdYearly: string;
  featured?: boolean;
}> = [
  {
    key: "creator",
    monthlyPrice: 15,
    annualPrice: 150,
    commissionPercent: 8,
    stripePriceIdMonthly: process.env.NEXT_PUBLIC_STRIPE_CREATOR_PRICE_ID ?? "",
    stripePriceIdYearly: process.env.NEXT_PUBLIC_STRIPE_CREATOR_PRICE_ID_YEARLY ?? "",
  },
  {
    key: "business",
    monthlyPrice: 49,
    annualPrice: 490,
    commissionPercent: 5,
    stripePriceIdMonthly: process.env.NEXT_PUBLIC_STRIPE_BUSINESS_PRICE_ID ?? "",
    stripePriceIdYearly: process.env.NEXT_PUBLIC_STRIPE_BUSINESS_PRICE_ID_YEARLY ?? "",
    featured: true,
  },
  {
    key: "pro",
    monthlyPrice: 149,
    annualPrice: 1490,
    commissionPercent: 3,
    stripePriceIdMonthly: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID ?? "",
    stripePriceIdYearly: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID_YEARLY ?? "",
  },
];

export function PricingSection({ locale }: PricingSectionProps) {
  const [interval, setInterval] = useState<Interval>("monthly");
  const t = useTranslations("billing.pricing");

  return (
    <div>
      <div className="mb-12 flex justify-center">
        <div className="inline-flex rounded-full border border-border bg-muted/30 p-1">
          <button
            type="button"
            onClick={() => setInterval("monthly")}
            className={cn(
              "rounded-full px-6 py-2 text-sm font-medium transition-colors",
              interval === "monthly"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
            aria-pressed={interval === "monthly"}
          >
            {t("toggleMonthly")}
          </button>
          <button
            type="button"
            onClick={() => setInterval("annual")}
            className={cn(
              "rounded-full px-6 py-2 text-sm font-medium transition-colors",
              interval === "annual"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
            aria-pressed={interval === "annual"}
          >
            {t("toggleAnnual")}
            <span className="ml-2 inline-flex items-center rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-700 dark:text-green-400">
              {t("annualSaveBadge")}
            </span>
          </button>
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-3">
        {TIERS.map((tier) => (
          <PricingCard
            key={tier.key}
            tierKey={tier.key}
            monthlyPrice={tier.monthlyPrice}
            annualPrice={tier.annualPrice}
            commissionPercent={tier.commissionPercent}
            stripePriceIdMonthly={tier.stripePriceIdMonthly}
            stripePriceIdYearly={tier.stripePriceIdYearly}
            featured={tier.featured ?? false}
            interval={interval}
            locale={locale}
          />
        ))}
      </div>
    </div>
  );
}
