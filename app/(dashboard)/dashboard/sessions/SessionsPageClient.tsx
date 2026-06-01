"use client";

import {
  Video,
  Calendar,
  Clock,
  Play,
  Radio,
  Users,
  ArrowRight,
  VideoIcon,
  Sparkles,
  BellRing,
} from "lucide-react";
import { format, isToday, isTomorrow, formatDistanceToNow } from "date-fns";
import { getDateFnsLocale } from "@/lib/i18n/date-fns-locale";
import { usePageTitle } from "@/lib/hooks/usePageTitle";
import { useLocale, useTranslations } from "next-intl";
import { CreateSessionDialog } from "@/components/sessions/CreateSessionDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import Image from "next/image";

export interface SessionItem {
  id: string;
  title: string;
  scheduledAt: string; // ISO string
  duration: number; // minutes
  status: string;
  recordingUrl: string | null;
  mentorName: string | null;
}

interface SessionsPageClientProps {
  upcoming: SessionItem[];
  past: SessionItem[];
  communityId?: string;
  sessionsThisWeek: number;
  liveSessionId: string | null;
  startingSoon: { id: string; startsInMinutes: number } | null;
  error: string | null;
}

export function SessionsPageClient({
  upcoming,
  past,
  communityId,
  sessionsThisWeek,
  liveSessionId,
  startingSoon,
  error,
}: SessionsPageClientProps) {
  const t = useTranslations("dashboard.sessions");
  usePageTitle("metaTitle", "dashboard.sessions");
  const locale = useLocale();
  const dfLocale = getDateFnsLocale(locale);

  if (error !== null) {
    return (
      <div className="flex min-h-[600px] items-center justify-center">
        <div className="text-center">
          <Video className="mx-auto mb-4 h-12 w-12 text-zinc-500" />
          <h2 className="mb-2 text-xl font-semibold text-white">{t("loadFailedTitle")}</h2>
          <p className="text-zinc-400">{error || t("genericError")}</p>
        </div>
      </div>
    );
  }

  // Localized session-date label (Today / Tomorrow / weekday + date).
  const sessionDateLabel = (date: Date) => {
    if (isToday(date)) return t("today");
    if (isTomorrow(date)) return t("tomorrow");
    return format(date, "EEEE, MMMM d", { locale: dfLocale });
  };
  const sessionTime = (date: Date) => format(date, "h:mm a", { locale: dfLocale });

  const liveSession = liveSessionId ? (upcoming.find((s) => s.id === liveSessionId) ?? null) : null;
  const startingSoonSession = startingSoon
    ? (upcoming.find((s) => s.id === startingSoon.id) ?? null)
    : null;

  return (
    <div className="space-y-8 p-8 text-foreground">
      {/* HEADER with Stats */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
          {sessionsThisWeek > 0 && (
            <p className="mt-2 text-sm font-medium text-purple-400">
              <Sparkles className="mr-1 inline h-4 w-4" />
              {t("sessionsThisWeek", { count: sessionsThisWeek })}
            </p>
          )}
        </div>
        <CreateSessionDialog
          triggerText={t("scheduleSession")}
          communityId={communityId}
          className="inline-flex items-center gap-2 rounded-full bg-purple-600 px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-purple-700"
        />
      </div>

      {startingSoonSession && startingSoon && (
        <div className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-950/50 to-zinc-900 p-6">
          <div className="absolute left-0 top-0 h-full w-1 bg-amber-500" />
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/20">
                <BellRing className="h-6 w-6 animate-pulse text-amber-400" />
              </div>
              <div>
                <Badge className="bg-amber-500 text-zinc-900">{t("startingSoon.badge")}</Badge>
                <h2 className="mt-2 text-xl font-semibold text-white">
                  {startingSoonSession.title}
                </h2>
                <p className="mt-1 text-sm text-zinc-300">
                  {t("startingSoon.startsIn", {
                    minutes: startingSoon.startsInMinutes,
                    time: sessionTime(new Date(startingSoonSession.scheduledAt)),
                  })}
                </p>
              </div>
            </div>
            <Link href={`/dashboard/sessions/${startingSoonSession.id}/room`}>
              <Button className="rounded-full bg-amber-500 px-6 text-zinc-900 hover:bg-amber-400">
                {t("joinNextSession")}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* LIVE NOW SECTION */}
      {liveSession && (
        <div className="relative overflow-hidden rounded-2xl border border-red-500/30 bg-gradient-to-r from-red-950/50 to-zinc-900 p-6">
          <div className="absolute left-0 top-0 h-full w-1 bg-red-500" />
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/20">
                <Radio className="h-6 w-6 animate-pulse text-red-500" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-red-500 text-white">{t("liveNow.badge")}</Badge>
                  <span className="text-xs text-zinc-400">
                    {t("liveNow.startedAgo", {
                      distance: formatDistanceToNow(new Date(liveSession.scheduledAt), {
                        locale: dfLocale,
                      }),
                    })}
                  </span>
                </div>
                <h2 className="mt-1 text-xl font-semibold text-white">{liveSession.title}</h2>
                <p className="mt-1 text-sm text-zinc-400">
                  {t("withHost", { name: liveSession.mentorName ?? "" })}
                </p>
                <div className="mt-3 flex items-center gap-4 text-sm text-zinc-400">
                  <span className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {/* In production, fetch actual participant count */}
                    {t("liveNow.participants", { count: 12 })}
                  </span>
                </div>
              </div>
            </div>
            <Link href={`/dashboard/sessions/${liveSession.id}/room`}>
              <Button className="rounded-full bg-red-500 px-6 hover:bg-red-600">
                {t("joinNextSession")}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* UPCOMING SESSIONS */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Radio className="h-5 w-5 text-purple-400" />
            <h2 className="text-lg font-semibold text-white">{t("upcoming.title")}</h2>
            {upcoming.length > 0 && (
              <Badge variant="secondary" className="bg-zinc-800 text-zinc-300">
                {upcoming.length}
              </Badge>
            )}
          </div>
        </div>

        {upcoming.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-8">
            <div className="grid items-center gap-6 lg:grid-cols-[1fr_auto_1fr]">
              <div className="relative h-48 overflow-hidden rounded-xl border border-border bg-muted/30">
                <Image
                  src="https://images.unsplash.com/photo-1513258496099-48168024aec0?auto=format&fit=crop&w=900&q=80"
                  alt={t("empty.classroomAlt")}
                  fill
                  className="object-cover"
                />
              </div>

              <div className="flex flex-col items-center text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-purple-600/20">
                  <Video className="h-8 w-8 text-purple-400" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-foreground">{t("empty.title")}</h3>
                <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                  {t("empty.description")}
                </p>
                <div className="mt-6 flex items-center gap-4">
                  <CreateSessionDialog
                    triggerText={t("scheduleSession")}
                    communityId={communityId}
                    className="inline-flex items-center gap-2 rounded-full bg-purple-600 px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-purple-700"
                  />
                  <span className="text-xs text-muted-foreground">{t("empty.takesMinutes")}</span>
                </div>
                <p className="mt-4 text-xs text-muted-foreground">{t("empty.growFaster")}</p>
              </div>

              <div className="relative h-48 overflow-hidden rounded-xl border border-border bg-muted/30">
                <Image
                  src="https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=900&q=80"
                  alt={t("empty.yogaAlt")}
                  fill
                  className="object-cover"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {upcoming.map((s) => (
              <div
                key={s.id}
                className="group relative overflow-hidden rounded-xl border border-border bg-card p-5 transition-all hover:border-border/80 hover:bg-accent/40"
              >
                {/* Date Badge */}
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-zinc-400" />
                    <span className="text-zinc-300">
                      {sessionDateLabel(new Date(s.scheduledAt))}
                    </span>
                  </div>
                  <span className="text-xs text-zinc-500">
                    {sessionTime(new Date(s.scheduledAt))}
                  </span>
                </div>

                {/* Title & Host */}
                <h3 className="font-semibold text-white transition-colors group-hover:text-purple-400">
                  {s.title}
                </h3>
                <p className="mt-1 text-sm text-zinc-400">
                  {t("withHost", { name: s.mentorName ?? "" })}
                </p>

                {/* Meta Info */}
                <div className="mt-4 flex items-center gap-4 text-xs text-zinc-500">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {t("durationMinutes", { minutes: s.duration })}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {/* In production, fetch actual count */}
                    {t("upcoming.attending", { count: 0 })}
                  </span>
                </div>

                {/* Actions */}
                <div className="mt-4 flex items-center gap-2">
                  <Link href={`/dashboard/sessions/${s.id}/room`} className="flex-1">
                    <Button
                      variant="default"
                      size="sm"
                      className="w-full rounded-full bg-purple-600 hover:bg-purple-700"
                    >
                      {t("joinNextSession")}
                    </Button>
                  </Link>
                  <CreateSessionDialog
                    triggerText={t("upcoming.edit")}
                    communityId={communityId}
                    className="inline-flex items-center justify-center rounded-full border border-zinc-700 bg-transparent px-3 py-1.5 text-xs text-zinc-400 transition-all hover:bg-zinc-800 hover:text-zinc-200"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* PAST SESSIONS */}
      {past.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Play className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold text-foreground">{t("past.title")}</h2>
            <Badge variant="secondary" className="bg-muted text-foreground/80">
              {past.length}
            </Badge>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {past.slice(0, 6).map((s) => (
              <div
                key={s.id}
                className="group relative overflow-hidden rounded-xl border border-border bg-card p-5 transition-all hover:border-border/80 hover:bg-accent/40"
              >
                {/* Recording Badge */}
                {s.status === "COMPLETED" && (
                  <div className="absolute right-3 top-3">
                    <Badge className="border-green-500/20 bg-green-500/10 text-xs text-green-400">
                      <VideoIcon className="mr-1 h-3 w-3" />
                      {t("past.recordingAvailable")}
                    </Badge>
                  </div>
                )}

                {/* Date */}
                <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  {formatDistanceToNow(new Date(s.scheduledAt), {
                    addSuffix: true,
                    locale: dfLocale,
                  })}
                </div>

                {/* Title */}
                <h3 className="font-medium text-foreground transition-colors group-hover:text-foreground">
                  {s.title}
                </h3>

                {/* Duration */}
                <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {t("durationMinutes", { minutes: s.duration })}
                </div>

                {/* Actions */}
                <div className="mt-4 flex items-center gap-2">
                  {/* Always show Enter Room button for past sessions */}
                  <Link href={`/dashboard/sessions/${s.id}/room`} className="flex-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full rounded-full border-border bg-background text-xs text-foreground hover:bg-accent"
                    >
                      {t("past.enterRoom")}
                    </Button>
                  </Link>

                  {/* Show recording buttons if available */}
                  {s.recordingUrl && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-green-400 hover:bg-green-500/10 hover:text-green-300"
                    >
                      <Play className="mr-1 h-3 w-3" />
                      {t("past.watch")}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {past.length > 6 && (
            <div className="text-center">
              <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
                {t("past.viewAll", { count: past.length })}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
