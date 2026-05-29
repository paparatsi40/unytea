"use client";

import { useLocale } from "next-intl";
import { PricingSection } from "@/components/marketing/PricingSection";

export default function UpgradePage() {
  const locale = useLocale();

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold text-foreground">
          Choose a plan that fits your community
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
          14-day free trial — no credit card required. Hosts pay for the platform; members join for
          free. Commission applies only when you sell paid access or courses.
        </p>
      </div>

      <PricingSection locale={locale} />

      <div className="mx-auto mt-16 max-w-4xl rounded-2xl border border-border bg-card/50 p-8">
        <h2 className="mb-4 text-center text-2xl font-bold text-foreground">Billing clarity</h2>
        <p className="text-center text-muted-foreground">
          Members can join free. Commission (3–8% depending on tier) applies only on paid
          memberships and paid courses, deducted from member-side revenue you collect via Stripe.
        </p>
      </div>
    </div>
  );
}
