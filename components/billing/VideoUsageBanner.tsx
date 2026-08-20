import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { Video } from "lucide-react";

import { readCommunityVideoUsage } from "@/lib/usage/video-usage";

/**
 * The 80 % / 100 % notice, above the community.
 *
 * A sibling of the subscription banners rather than a new state inside them:
 * `/api/user/subscription-state` is user-scoped and this counter is not — a Pro
 * owner runs up to three communities, and "your usage" has no single answer
 * for them.
 *
 * Server-rendered, unlike `SubscriptionBannerMount`. That one fetches from the
 * browser because the dashboard layout it lives in is a client component; the
 * community layout is not, and it already holds the community and the
 * ownership decision. So there is no route to add, no fetch, and no
 * flash-of-no-banner.
 *
 * Nothing here refuses anything. B1 measures and reports; the gate is a
 * separate piece of work behind its own flag, and copy that warned about
 * blocked sessions would be describing software that does not exist yet.
 */
export async function VideoUsageBanner({
  communityId,
  communityName,
  communitySlug,
}: {
  communityId: string;
  communityName: string;
  communitySlug: string;
}) {
  const usage = await readCommunityVideoUsage(communityId);
  if (usage.state === "normal") return null;

  const t = await getTranslations("dashboard.videoUsage");
  const locale = await getLocale();
  const resets = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(usage.resetsAt);

  const isOver = usage.state === "over";

  return (
    <div
      className={
        isOver ? "border-b border-amber-200 bg-amber-50" : "border-b border-violet-200 bg-violet-50"
      }
    >
      <div className="container mx-auto flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-sm">
        <Video
          className={
            isOver ? "h-4 w-4 shrink-0 text-amber-600" : "h-4 w-4 shrink-0 text-violet-600"
          }
          aria-hidden="true"
        />
        <span className={isOver ? "font-medium text-amber-900" : "font-medium text-violet-900"}>
          {isOver
            ? t("bannerOver", { community: communityName })
            : t("bannerWarn", { community: communityName, percent: usage.percent })}
        </span>
        <span className={isOver ? "text-amber-800" : "text-violet-800"}>
          {t("bannerNote", { date: resets })}
        </span>
        <Link
          href={`/dashboard/c/${communitySlug}/settings/payments`}
          className={
            isOver
              ? "font-medium text-amber-900 underline underline-offset-2"
              : "font-medium text-violet-900 underline underline-offset-2"
          }
        >
          {t("viewUsage")}
        </Link>
      </div>
    </div>
  );
}
