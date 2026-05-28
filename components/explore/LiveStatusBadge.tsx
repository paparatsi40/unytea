"use client";

import { format, formatDistanceToNowStrict } from "date-fns";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { ExploreLiveStatus } from "@/types/explore";

type LiveStatusBadgeProps = {
  status: ExploreLiveStatus["status"];
  nextSessionStartsAt: Date | null;
  nextSessionTitle: string | null;
};

const BASE_CLASSES =
  "absolute right-2 top-2 inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium backdrop-blur-sm";

const STATUS_CLASSES: Record<Exclude<ExploreLiveStatus["status"], "none">, string> = {
  live_now: "border-green-500/40 bg-green-500/15 text-green-700 dark:text-green-300",
  live_soon: "border-amber-500/40 bg-amber-500/15 text-amber-700 dark:text-amber-300",
  live_today: "border-blue-500/40 bg-blue-500/15 text-blue-700 dark:text-blue-300",
  live_this_week: "border-blue-500/40 bg-blue-500/15 text-blue-700 dark:text-blue-300",
};

export function LiveStatusBadge({
  status,
  nextSessionStartsAt,
  nextSessionTitle,
}: LiveStatusBadgeProps) {
  const t = useTranslations("explore.card.liveStatus");

  if (status === "none") return null;

  let label: string;
  if (status === "live_now") {
    label = t("live_now");
  } else if (status === "live_soon" && nextSessionStartsAt) {
    label = t("live_soon", { time: formatDistanceToNowStrict(nextSessionStartsAt) });
  } else if (status === "live_today" && nextSessionStartsAt) {
    label = t("live_today", { time: format(nextSessionStartsAt, "h:mma").toLowerCase() });
  } else if (status === "live_this_week" && nextSessionStartsAt) {
    label = t("live_this_week", {
      day: format(nextSessionStartsAt, "EEE h:mma").toLowerCase(),
    });
  } else {
    return null;
  }

  return (
    <div
      className={cn(BASE_CLASSES, STATUS_CLASSES[status])}
      title={nextSessionTitle ?? undefined}
    >
      {status === "live_now" && (
        <span className="relative inline-flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-green-500" />
        </span>
      )}
      <span>{label}</span>
    </div>
  );
}
