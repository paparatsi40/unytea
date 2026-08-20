"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Video } from "lucide-react";

import { getCommunityVideoUsage, type VideoUsageView } from "@/app/actions/video-usage";
import { cn } from "@/lib/utils";

/**
 * The number itself, for the owner of one community.
 *
 * Client-side because the pages it sits on are client components; the read
 * behind the action is the same one the banner renders from, so the two can
 * never disagree.
 *
 * What it shows is the sum of `exactSeconds` for the period — connected time
 * that was actually measured. Deliberately not `community_video_usage.usedSeconds`,
 * which accumulates the over-counting approximation; see the note on
 * `readCommunityVideoUsage`.
 */
export function VideoUsageCard({ communitySlug }: { communitySlug: string }) {
  const [usage, setUsage] = useState<VideoUsageView | null>(null);

  useEffect(() => {
    let cancelled = false;
    getCommunityVideoUsage(communitySlug)
      .then((result) => {
        if (!cancelled && result.success && "usage" in result) setUsage(result.usage);
      })
      .catch((error) => {
        console.error("Failed to load video usage", error);
      });
    return () => {
      cancelled = true;
    };
  }, [communitySlug]);

  if (!usage) return null;
  return <VideoUsageMeter usage={usage} />;
}

/**
 * The meter, given the numbers. Split out so the billing screen can render a
 * row per community without a request each.
 */
export function VideoUsageMeter({
  usage,
  compact = false,
}: {
  usage: VideoUsageView;
  compact?: boolean;
}) {
  const t = useTranslations("dashboard.videoUsage");
  const locale = useLocale();

  const resets = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(usage.resetsAt));

  const used = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(usage.usedHours);
  const cap = new Intl.NumberFormat(locale).format(usage.capHours);

  // The fill is clamped; the number above it is not. Past the cap the bar is
  // full and the text says by how much — a bar that kept growing would need a
  // scale nobody is reading.
  const fill = Math.min(100, usage.percent);

  return (
    <div
      className={cn(
        "rounded-xl border bg-white",
        compact ? "px-4 py-3" : "px-5 py-4",
        usage.state === "over"
          ? "border-amber-200"
          : usage.state === "warn"
            ? "border-violet-200"
            : "border-gray-200"
      )}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <div className="flex items-center gap-2">
          {!compact && <Video className="h-4 w-4 text-gray-400" aria-hidden="true" />}
          <span className="text-sm font-medium text-gray-900">
            {compact ? usage.communityName : t("title")}
          </span>
        </div>
        <span className="text-xs text-gray-500">{t("plan", { plan: usage.plan })}</span>
      </div>

      <p className="mt-2 text-sm text-gray-900">
        <span className="font-semibold tabular-nums">{t("used", { used, cap })}</span>
        <span className="text-gray-500"> · {t("resets", { date: resets })}</span>
      </p>

      <div
        className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-100"
        role="img"
        aria-label={t("used", { used, cap })}
      >
        <div
          className={cn(
            "h-full rounded-full transition-all",
            usage.state === "over"
              ? "bg-amber-500"
              : usage.state === "warn"
                ? "bg-violet-500"
                : "bg-violet-400"
          )}
          style={{ width: `${fill}%` }}
        />
      </div>

      {/* The unit, in the reader's terms rather than ours. It also quietly
          explains why the number climbs faster than a coach expects. */}
      <p className="mt-2 text-xs text-gray-500">{t("unitNote")}</p>
    </div>
  );
}
