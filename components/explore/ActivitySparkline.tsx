"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { ExploreActivityStatus } from "@/types/explore";

type ActivitySparklineProps = {
  history: number[];
  status: ExploreActivityStatus;
};

const STATUS_COLOR_CLASS: Record<ExploreActivityStatus, string> = {
  very_active: "text-green-600 dark:text-green-400",
  active: "text-blue-600 dark:text-blue-400",
  moderate: "text-amber-600 dark:text-amber-400",
  quiet: "text-muted-foreground",
};

const VIEWBOX_WIDTH = 280;
const VIEWBOX_HEIGHT = 22;
const Y_MIN = 2;
const Y_MAX = 20;
const Y_RANGE = Y_MAX - Y_MIN;

export function ActivitySparkline({ history, status }: ActivitySparklineProps) {
  const t = useTranslations("explore.card");
  const tStatus = useTranslations("explore.card.activityStatus");

  const safeHistory = history.length > 0 ? history : [0];
  const max = Math.max(...safeHistory, 1);
  const colorClass = STATUS_COLOR_CLASS[status];
  const activityLabel = t("activityLabel");
  const statusLabel = tStatus(status);

  const points = safeHistory
    .map((value, i) => {
      const x =
        safeHistory.length === 1
          ? VIEWBOX_WIDTH / 2
          : (i / (safeHistory.length - 1)) * VIEWBOX_WIDTH;
      const y = Y_MAX - (value / max) * Y_RANGE;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");

  return (
    <div className="mb-2.5">
      <div className="mb-1 flex justify-between text-xs text-muted-foreground">
        <span>{activityLabel}</span>
        <span className={cn("font-medium", colorClass)}>{statusLabel}</span>
      </div>
      <svg
        viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
        preserveAspectRatio="none"
        className="block h-5 w-full"
        role="img"
        aria-label={`${activityLabel}: ${statusLabel}`}
      >
        <polyline
          points={points}
          fill="none"
          strokeWidth="1.5"
          className={cn("stroke-current", colorClass)}
        />
      </svg>
    </div>
  );
}
