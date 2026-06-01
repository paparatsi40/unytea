"use client";

import { useMemo } from "react";
import { format, isToday, isTomorrow, formatDistanceToNow } from "date-fns";
import { enUS, es, fr } from "date-fns/locale";
import { useLocale, useTranslations } from "next-intl";
import { Video, Calendar, Clock, ArrowRight, Sparkles, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import Image from "next/image";

const DATE_FNS_LOCALES = { en: enUS, es, fr } as const;

export interface AgendaSession {
  id: string;
  title: string;
  scheduledAt: string; // ISO string
  duration: number; // minutes
  recordingUrl: string | null;
  communityName: string | null;
  communityImageUrl: string | null;
}

interface AgendaPageClientProps {
  upcoming: AgendaSession[];
  past: AgendaSession[];
}

export function AgendaPageClient({ upcoming, past }: AgendaPageClientProps) {
  const t = useTranslations("dashboard.agenda");
  const locale = useLocale();
  const dfLocale = DATE_FNS_LOCALES[locale as keyof typeof DATE_FNS_LOCALES] ?? enUS;

  // Localized date-group label (Today / Tomorrow / weekday + date).
  const groupLabel = (date: Date) => {
    if (isToday(date)) return t("today");
    if (isTomorrow(date)) return t("tomorrow");
    return format(date, "EEEE, MMM d", { locale: dfLocale });
  };

  // Group upcoming sessions by calendar day, keyed on a stable yyyy-MM-dd
  // (not the localized label, so grouping is locale-independent). Input is
  // already sorted ascending by the server.
  const groups = useMemo(() => {
    const map = new Map<string, AgendaSession[]>();
    for (const s of upcoming) {
      const key = format(new Date(s.scheduledAt), "yyyy-MM-dd");
      const arr = map.get(key) ?? [];
      arr.push(s);
      map.set(key, arr);
    }
    return Array.from(map.entries());
  }, [upcoming]);

  return (
    <div className="space-y-8 p-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">{t("title")}</h1>
        <p className="mt-1 text-sm text-zinc-400">{t("subtitle")}</p>
        {upcoming.length > 0 && (
          <p className="mt-2 text-sm font-medium text-purple-400">
            <Sparkles className="mr-1 inline h-4 w-4" />
            {t("upcomingThisWeek", { count: upcoming.length })}
          </p>
        )}
      </div>

      {/* UPCOMING SESSIONS GROUPED BY DATE */}
      {upcoming.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-900 p-8 text-center">
          <Video className="mx-auto mb-4 h-12 w-12 text-zinc-500" />
          <h2 className="mb-2 text-xl font-semibold text-white">{t("empty.title")}</h2>
          <p className="text-zinc-400">{t("empty.description")}</p>
          <Link href="/dashboard/communities">
            <Button className="mt-4 rounded-full bg-purple-600 hover:bg-purple-700">
              {t("empty.cta")}
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map(([dateKey, sessions]) => (
            <div key={dateKey} className="space-y-3">
              <h2 className="flex items-center gap-2 text-sm font-medium text-zinc-400">
                <Calendar className="h-4 w-4" />
                {groupLabel(new Date(sessions[0].scheduledAt))}
              </h2>

              <div className="space-y-3">
                {sessions.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-950 p-4 transition-all hover:border-zinc-700"
                  >
                    {/* Community Avatar */}
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-zinc-900">
                      {s.communityImageUrl ? (
                        <Image
                          src={s.communityImageUrl}
                          alt={s.communityName ?? ""}
                          width={48}
                          height={48}
                          className="h-full w-full rounded-lg object-cover"
                        />
                      ) : (
                        <Users className="h-6 w-6 text-zinc-500" />
                      )}
                    </div>

                    {/* Session Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate font-semibold text-white">{s.title}</h3>
                        {isToday(new Date(s.scheduledAt)) && (
                          <Badge className="bg-purple-600 text-xs text-white">{t("today")}</Badge>
                        )}
                      </div>
                      <p className="text-sm text-zinc-400">
                        {s.communityName} •{" "}
                        {format(new Date(s.scheduledAt), "h:mm a", { locale: dfLocale })}
                      </p>
                    </div>

                    {/* Duration */}
                    <div className="hidden items-center gap-1 text-xs text-zinc-500 sm:flex">
                      <Clock className="h-3 w-3" />
                      {t("durationMinutes", { minutes: s.duration })}
                    </div>

                    {/* Actions */}
                    <Link href={`/dashboard/sessions/${s.id}/room`}>
                      <Button size="sm" className="rounded-full bg-purple-600 hover:bg-purple-700">
                        {t("join")}
                        <ArrowRight className="ml-1 h-3 w-3" />
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* PAST SESSIONS SUMMARY */}
      {past.length > 0 && (
        <div className="border-t border-zinc-800 pt-4">
          <h2 className="mb-3 text-sm font-medium text-zinc-400">
            {t("past.title", { count: past.length })}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {past.slice(0, 4).map((s) => (
              <div
                key={s.id}
                className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-950/50 p-3"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-zinc-900">
                  <Users className="h-5 w-5 text-zinc-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">{s.title}</p>
                  <p className="text-xs text-zinc-500">
                    {s.communityName} •{" "}
                    {formatDistanceToNow(new Date(s.scheduledAt), {
                      addSuffix: true,
                      locale: dfLocale,
                    })}
                  </p>
                </div>
                {s.recordingUrl && (
                  <Badge className="border-0 bg-green-500/10 text-xs text-green-400">
                    {t("past.recording")}
                  </Badge>
                )}
              </div>
            ))}
          </div>
          {past.length > 4 && (
            <div className="mt-4 text-center">
              <Link href="/dashboard/sessions">
                <Button variant="ghost" className="text-zinc-400 hover:text-white">
                  {t("past.viewAll", { count: past.length })}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
