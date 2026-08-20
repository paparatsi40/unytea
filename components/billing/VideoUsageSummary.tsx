"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { getMyVideoUsage, type VideoUsageView } from "@/app/actions/video-usage";
import { VideoUsageMeter } from "./VideoUsageCard";

/**
 * Video hours on the billing screen, one row per community the caller hosts.
 *
 * The billing screen is user-scoped and the counter is not, so there is no
 * single number to put here. A Pro owner runs up to three communities with
 * three separate allowances; collapsing them into "your usage" would be the
 * same category error that keeps this out of `/api/user/subscription-state`.
 *
 * Renders nothing at all for someone who hosts no communities — an empty
 * section with an explanation is still an empty section.
 */
export function VideoUsageSummary() {
  const t = useTranslations("dashboard.videoUsage");
  const [usages, setUsages] = useState<VideoUsageView[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    getMyVideoUsage()
      .then((result) => {
        if (!cancelled && result.success && "usages" in result) setUsages(result.usages);
      })
      .catch((error) => {
        console.error("Failed to load video usage", error);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!usages || usages.length === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-lg font-semibold tracking-tight">{t("sectionTitle")}</h3>
      <div className="flex flex-col gap-2">
        {usages.map((usage) => (
          <VideoUsageMeter key={usage.communityId} usage={usage} compact />
        ))}
      </div>
    </section>
  );
}
