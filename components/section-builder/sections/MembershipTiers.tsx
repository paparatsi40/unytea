import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { getTranslations } from "next-intl/server";
import type { SubscriptionPlan } from "@prisma/client";
import type { JSX } from "react";
import { SectionSchema } from "../types";

interface MembershipTiersRenderProps {
  communityId?: string;
  communitySlug?: string;
  title?: string;
}

export async function MembershipTiersRender(
  props: MembershipTiersRenderProps
): Promise<JSX.Element> {
  const { communityId, communitySlug, title } = props;

  if (!communityId) {
    // Defensive: section configured but no community context. Render nothing.
    return <></>;
  }

  // String form resolves the request locale (this renders under app/[locale]).
  const t = await getTranslations("community.landing.membershipTiers");

  const plans = await prisma.subscriptionPlan.findMany({
    where: { communityId, isActive: true },
    orderBy: { price: "asc" },
  });

  // No tiers configured → don't render this section. The community is
  // effectively free; the general 'Join community' CTA lives in Stats.
  if (plans.length === 0) {
    return <></>;
  }

  const intervalLabel = (interval: SubscriptionPlan["interval"]): string =>
    interval === "MONTHLY"
      ? t("perMonth")
      : interval === "YEARLY"
        ? t("perYear")
        : interval === "LIFETIME"
          ? t("oneTime")
          : "";

  return (
    <section className="px-4 py-8">
      <div className="mx-auto max-w-4xl">
        <h2 className="mb-1 text-center text-xl font-medium">{title || t("defaultTitle")}</h2>
        <p className="mb-6 text-center text-sm text-muted-foreground">{t("subtitle")}</p>
        <div
          className={cn(
            "grid gap-4",
            plans.length === 1 && "mx-auto max-w-sm grid-cols-1",
            plans.length === 2 && "grid-cols-1 sm:grid-cols-2",
            plans.length >= 3 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
          )}
        >
          {plans.map((plan) => (
            <TierCard
              key={plan.id}
              plan={plan}
              communitySlug={communitySlug}
              intervalLabel={intervalLabel(plan.interval)}
              ctaLabel={t("joinTier", { tierName: plan.name })}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

// Inline helper component — receives already-translated labels so it stays sync.
function TierCard({
  plan,
  communitySlug,
  intervalLabel,
  ctaLabel,
}: {
  plan: SubscriptionPlan;
  communitySlug?: string;
  intervalLabel: string;
  ctaLabel: string;
}) {
  // price is stored as a Float in cents (per seed-subscription-plans.ts).
  const priceUSD = (plan.price / 100).toFixed(0);

  // features is a Json column holding a string[] (per seed). Defensive parse.
  const features: string[] = Array.isArray(plan.features)
    ? plan.features.filter((f): f is string => typeof f === "string")
    : [];

  // CTA href: the /c/{slug}/join flow page does not exist yet (documented
  // follow-up). It will resolve plan.id -> stripePriceId and route logged-in
  // users to /api/stripe/community-checkout (POST) or signup otherwise.
  const ctaHref = communitySlug ? `/c/${communitySlug}/join?plan=${plan.id}` : "#";

  return (
    <div className="flex flex-col rounded-lg border border-border bg-card p-6">
      <h3 className="mb-1 text-lg font-medium">{plan.name}</h3>
      {plan.description && (
        <p className="mb-4 text-sm text-muted-foreground">{plan.description}</p>
      )}
      <div className="mb-4">
        <span className="text-3xl font-bold">${priceUSD}</span>
        <span className="text-sm text-muted-foreground">{intervalLabel}</span>
      </div>
      {features.length > 0 && (
        <ul className="mb-6 flex-1 space-y-2">
          {features.slice(0, 6).map((feature, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      )}
      <Button asChild className="w-full">
        <Link href={ctaHref}>{ctaLabel}</Link>
      </Button>
    </div>
  );
}

export const MembershipTiersSchema: SectionSchema = {
  type: "membershipTiers",
  label: "Membership tiers",
  description: "Membership tiers and pricing for joining the community",
  icon: "💎",
  fields: [
    {
      key: "title",
      label: "Section title",
      kind: "text",
      placeholder: "Become a member",
    },
    {
      key: "showFreeTier",
      label: "Show free tier",
      kind: "select",
      options: ["false", "true"],
    },
  ],
  defaultProps: {
    title: "Become a member",
    showFreeTier: false,
  },
  Render: MembershipTiersRender,
};
