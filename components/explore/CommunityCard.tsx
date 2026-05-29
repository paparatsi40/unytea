"use client";

import Image from "next/image";
import Link from "next/link";
import { Globe, Lock } from "lucide-react";
import { CommunityCategory } from "@prisma/client";
import { useTranslations } from "next-intl";
import { cn, getInitials } from "@/lib/utils";
import type { ExploreCommunity } from "@/types/explore";
import { LiveStatusBadge } from "./LiveStatusBadge";
import { ActivitySparkline } from "./ActivitySparkline";
import { MemberAvatarsStack } from "./MemberAvatarsStack";

type CommunityCardProps = {
  community: ExploreCommunity;
  locale: string;
  priority?: boolean;
};

const CATEGORY_COLOR_CLASS: Record<CommunityCategory, string> = {
  BUSINESS_ENTREPRENEURSHIP:
    "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200",
  MARKETING_SALES: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200",
  AI_DATA_SCIENCE: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200",
  TECH_PROGRAMMING: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200",
  GAMING: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200",
  HEALTH_WELLNESS: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200",
  FITNESS_SPORTS: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200",
  COOKING_NUTRITION: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200",
  PERSONAL_FINANCE: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200",
  PHOTOGRAPHY: "bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-200",
  ART_DESIGN: "bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-200",
  MUSIC: "bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-200",
  WRITING_PUBLISHING: "bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-200",
  CRAFTS_DIY: "bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-200",
  EDUCATION_LANGUAGES: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  BOOKS_READING: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  PARENTING_FAMILY: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  SPIRITUALITY_MINDFULNESS: "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-200",
  TRAVEL: "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-200",
  OTHER: "bg-muted text-muted-foreground",
};

type PricingShape = { amount?: unknown; interval?: unknown; currency?: unknown };

function parsePricing(
  pricing: unknown
): { amount: number; interval: "month" | "year"; currency: string } | null {
  if (!pricing || typeof pricing !== "object") return null;
  const p = pricing as PricingShape;
  if (typeof p.amount !== "number" || !Number.isFinite(p.amount) || p.amount < 0) return null;
  const interval = p.interval === "year" ? "year" : "month";
  const currency = typeof p.currency === "string" ? p.currency : "usd";
  return { amount: p.amount, interval, currency };
}

function PricingChip({ isPaid, pricing }: { isPaid: boolean; pricing: unknown }) {
  const t = useTranslations("explore.card");
  if (!isPaid) {
    return (
      <span className="inline-flex shrink-0 items-center rounded-md border border-border bg-card px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
        {t("free")}
      </span>
    );
  }

  const parsed = parsePricing(pricing);
  const label = parsed
    ? `$${parsed.amount.toFixed(0)}/${parsed.interval === "year" ? "yr" : "mo"}`
    : t("paid");

  return (
    <span className="inline-flex shrink-0 items-center gap-0.5 rounded-md bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/40 dark:text-blue-200">
      <Lock className="h-2.5 w-2.5" aria-hidden />
      {label}
    </span>
  );
}

function CategoryBadge({ category }: { category: CommunityCategory }) {
  const t = useTranslations("explore.categories");
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium leading-tight",
        CATEGORY_COLOR_CLASS[category]
      )}
    >
      {t(category)}
    </span>
  );
}

function LanguageBadge({ language }: { language: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium leading-tight text-muted-foreground">
      <Globe className="h-2.5 w-2.5" aria-hidden />
      {language.toUpperCase()}
    </span>
  );
}

export function CommunityCard({ community, locale, priority = false }: CommunityCardProps) {
  const t = useTranslations("explore.card");
  const ownerInitial = getInitials(community.owner.name).slice(0, 1) || "?";

  const ownerLine = community.owner.title
    ? t("byOwnerWithTitle", { name: community.owner.name, title: community.owner.title })
    : t("byOwner", { name: community.owner.name });

  return (
    <Link
      href={`/${locale}/c/${community.slug}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-border/50 bg-card transition-all hover:border-border hover:shadow-lg"
    >
      <div className="relative h-32 w-full bg-muted">
        <Image
          src={community.coverImageUrl}
          alt={community.name}
          fill
          className="object-cover transition-transform group-hover:scale-105"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          priority={priority}
        />
        <LiveStatusBadge
          status={community.liveStatus.status}
          nextSessionStartsAt={community.liveStatus.nextSessionStartsAt}
          nextSessionTitle={community.liveStatus.nextSessionTitle}
        />

        {community.imageUrl ? (
          <div className="absolute -bottom-5 left-3.5 h-[52px] w-[52px] overflow-hidden rounded-md border-[3px] border-card bg-card">
            <Image
              src={community.imageUrl}
              alt=""
              width={52}
              height={52}
              className="h-full w-full object-cover"
            />
          </div>
        ) : (
          <div
            className="absolute -bottom-5 left-3.5 flex h-[52px] w-[52px] items-center justify-center rounded-md border-[3px] border-card bg-gradient-to-br from-indigo-500 to-purple-500 text-sm font-semibold text-white"
            aria-hidden
          >
            {getInitials(community.name) || "?"}
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col px-4 pb-3.5 pt-7">
        <div className="mb-1 flex items-start justify-between gap-2">
          <h3 className="line-clamp-1 text-base font-medium leading-tight">{community.name}</h3>
          <PricingChip isPaid={community.isPaid} pricing={community.pricing} />
        </div>

        <div className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          {community.owner.image ? (
            <Image
              src={community.owner.image}
              alt=""
              width={16}
              height={16}
              className="h-4 w-4 rounded-full object-cover"
            />
          ) : (
            <span
              className="flex h-4 w-4 items-center justify-center rounded-full bg-muted text-[8px] font-medium"
              aria-hidden
            >
              {ownerInitial}
            </span>
          )}
          <span className="truncate">{ownerLine}</span>
        </div>

        <p className="mb-2.5 line-clamp-2 text-sm text-muted-foreground">{community.description}</p>

        <div className="mb-3 flex flex-wrap gap-1.5">
          <CategoryBadge category={community.category} />
          {community.language && <LanguageBadge language={community.language} />}
        </div>

        <ActivitySparkline history={community.activityHistory} status={community.activityStatus} />

        <div className="mt-auto">
          <MemberAvatarsStack
            members={community.sampleMembers}
            totalCount={community.memberCount}
          />
        </div>
      </div>
    </Link>
  );
}
