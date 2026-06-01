"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { useLocale, useTranslations } from "next-intl";
import { Calendar, Play, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getDateFnsLocale } from "@/lib/i18n/date-fns-locale";

interface UpcomingSession {
  id: string;
  title: string;
  scheduledAt: string; // ISO string
  attendeeCount: number;
  roomId: string | null;
  status: string;
}

interface CommunityFeedSidebarProps {
  communityName: string;
  upcomingSession: UpcomingSession | null;
}

export function CommunityFeedSidebar({
  communityName,
  upcomingSession,
}: CommunityFeedSidebarProps) {
  const t = useTranslations("dashboard.communityAdmin.feed");
  const locale = useLocale();
  const dfLocale = getDateFnsLocale(locale);
  const isLive = upcomingSession?.status === "IN_PROGRESS";

  return (
    <aside className="space-y-4 lg:col-span-4">
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-purple-600">
          {t("label")}
        </p>
        <h1 className="mt-1 text-lg font-semibold text-gray-900">{communityName}</h1>
        <p className="mt-1 text-sm text-gray-600">{t("subtitle")}</p>
      </div>

      {upcomingSession ? (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="bg-gradient-to-r from-zinc-900 to-zinc-800 p-4 text-white">
            <Badge className="mb-3 border-none bg-red-500/20 text-red-300">
              <span className="mr-1.5 h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" />
              {isLive ? t("liveNow") : t("upcoming")}
            </Badge>
            <h3 className="text-lg font-semibold">{upcomingSession.title}</h3>
            <div className="mt-2 space-y-1 text-sm text-zinc-300">
              <p className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {formatDistanceToNow(new Date(upcomingSession.scheduledAt), {
                  addSuffix: true,
                  locale: dfLocale,
                })}
              </p>
              <p className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                {t("attending", { count: upcomingSession.attendeeCount })}
              </p>
            </div>
            <div className="mt-4 flex gap-2">
              {upcomingSession.roomId ? (
                <Link href={`/dashboard/sessions/${upcomingSession.id}/room`} className="flex-1">
                  <Button className="w-full bg-purple-600 hover:bg-purple-700">
                    <Play className="mr-2 h-4 w-4" />
                    {isLive ? t("joinNow") : t("openRoom")}
                  </Button>
                </Link>
              ) : (
                <Link href="/dashboard/sessions" className="flex-1">
                  <Button className="w-full bg-purple-600 hover:bg-purple-700">
                    <Calendar className="mr-2 h-4 w-4" />
                    {t("openSessions")}
                  </Button>
                </Link>
              )}
              <Link href="/dashboard/sessions" className="flex-1">
                <Button
                  variant="outline"
                  className="w-full border-zinc-700 bg-zinc-800/50 text-zinc-200 hover:bg-zinc-800"
                >
                  {t("viewAll")}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-medium text-gray-900">{t("noUpcomingTitle")}</p>
          <p className="mt-1 text-sm text-gray-600">{t("noUpcomingBody")}</p>
          <Link href="/dashboard/sessions" className="mt-3 inline-block">
            <Button size="sm" variant="outline">
              {t("openSessions")}
            </Button>
          </Link>
        </div>
      )}
    </aside>
  );
}
