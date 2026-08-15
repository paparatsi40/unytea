"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { PricingCard, type TierKey } from "./PricingCard";
import {
  PLAN_PRICING,
  PLATFORM_FEE_PERCENT,
  hasAnyAnnualPricing,
  type PaidPlan,
} from "@/lib/plans";

type Interval = "monthly" | "annual";

interface PricingSectionProps {
  locale: string;
}

/**
 * The cards derive everything from lib/plans.ts.
 *
 * They used to hold their own prices AND their own commission numbers — and the
 * commissions were wrong: 8/5/3 against the 5/2/0 that Stripe actually applies
 * via `application_fee_percent`. A Pro host was told 3% and charged 0%.
 */
const TIERS: ReadonlyArray<{
  key: TierKey;
  plan: PaidPlan;
}> = [
  { key: "creator", plan: "CREATOR" },
  { key: "business", plan: "BUSINESS" },
  { key: "pro", plan: "PRO" },
];

const FEATURED: TierKey = "business";

export function PricingSection({ locale }: PricingSectionProps) {
  const [interval, setInterval] = useState<Interval>("monthly");
  const t = useTranslations("billing.pricing");

  // Annual billing needs its own Stripe price IDs, which are separate env vars
  // and may simply be unset. Offering the toggle without them produces a price
  // the visitor can select and then cannot buy.
  const annualOffered = hasAnyAnnualPricing();
  const activeInterval: Interval = annualOffered ? interval : "monthly";

  return (
    <div>
      <div className={cn("mb-12 flex justify-center", !annualOffered && "hidden")}>
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
        {TIERS.map((tier) => {
          const pricing = PLAN_PRICING[tier.plan];
          return (
            <PricingCard
              key={tier.key}
              tierKey={tier.key}
              monthlyPrice={pricing.monthly}
              annualPrice={pricing.annual}
              interval={activeInterval}
              commissionPercent={PLATFORM_FEE_PERCENT[tier.plan]}
              stripePriceIdMonthly={pricing.stripePriceIdMonthly}
              stripePriceIdAnnual={pricing.stripePriceIdAnnual}
              featured={tier.key === FEATURED}
              locale={locale}
            />
          );
        })}
      </div>
    </div>
  );
}
