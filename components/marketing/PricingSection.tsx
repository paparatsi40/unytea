"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { PricingCard } from "./PricingCard";

type Interval = "monthly" | "annual";

interface PricingSectionProps {
  locale: string;
}

const TIERS = [
  {
    name: "Creator",
    description: "Para creators emergentes lanzando su primera comunidad",
    monthlyPrice: 15,
    annualPrice: 150,
    commissionPercent: 8,
    features: [
      "Comunidad ilimitada de members",
      "Live sessions hasta 100 participantes concurrentes",
      "Cursos pagados",
      "Community feed + library",
      "Basic analytics",
    ],
    stripePriceIdMonthly: process.env.NEXT_PUBLIC_STRIPE_CREATOR_PRICE_ID ?? "",
    stripePriceIdYearly: process.env.NEXT_PUBLIC_STRIPE_CREATOR_PRICE_ID_YEARLY ?? "",
  },
  {
    name: "Business",
    description: "Para hosts establecidos creciendo su comunidad",
    monthlyPrice: 49,
    annualPrice: 490,
    commissionPercent: 5,
    features: [
      "Todo lo de Creator",
      "Live sessions hasta 300 participantes concurrentes",
      "Dominio custom",
      "Analytics avanzados",
      "Hasta 5 admins",
    ],
    stripePriceIdMonthly: process.env.NEXT_PUBLIC_STRIPE_BUSINESS_PRICE_ID ?? "",
    stripePriceIdYearly: process.env.NEXT_PUBLIC_STRIPE_BUSINESS_PRICE_ID_YEARLY ?? "",
    featured: true,
    featuredLabel: "Most popular",
  },
  {
    name: "Pro",
    description: "Para teams scaling múltiples comunidades",
    monthlyPrice: 149,
    annualPrice: 1490,
    commissionPercent: 3,
    features: [
      "Todo lo de Business",
      "Live sessions hasta 1000 participantes concurrentes",
      "White-label experience",
      "API access",
      "Admins ilimitados",
    ],
    stripePriceIdMonthly: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID ?? "",
    stripePriceIdYearly: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID_YEARLY ?? "",
  },
] as const;

const STRINGS = {
  monthly: "Monthly",
  annual: "Annual",
  saveBadge: "Save 16%",
};

export function PricingSection({ locale }: PricingSectionProps) {
  const [interval, setInterval] = useState<Interval>("monthly");

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
            {STRINGS.monthly}
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
            {STRINGS.annual}
            <span className="ml-2 inline-flex items-center rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-700 dark:text-green-400">
              {STRINGS.saveBadge}
            </span>
          </button>
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-3">
        {TIERS.map((tier) => (
          <PricingCard
            key={tier.name}
            name={tier.name}
            description={tier.description}
            monthlyPrice={tier.monthlyPrice}
            annualPrice={tier.annualPrice}
            commissionPercent={tier.commissionPercent}
            features={[...tier.features]}
            stripePriceIdMonthly={tier.stripePriceIdMonthly}
            stripePriceIdYearly={tier.stripePriceIdYearly}
            featured={"featured" in tier ? tier.featured : false}
            featuredLabel={"featuredLabel" in tier ? tier.featuredLabel : undefined}
            interval={interval}
            locale={locale}
          />
        ))}
      </div>
    </div>
  );
}
