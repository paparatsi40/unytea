"use client";

import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { Video, Calendar, Clock, ArrowRight, Sparkles } from "lucide-react";
import { format, isToday, isTomorrow, formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreateSessionDialog } from "@/components/sessions/CreateSessionDialog";
import { getDateFnsLocale } from "@/lib/i18n/date-fns-locale";

export interface SessionSummary {
  id: string;
  title: string;
  scheduledAt: string; // ISO
  duration: number | null;
  status: string;
  visibility: string | null;
  slug: string | null;
  recordingUrl: string | null;
  mentorName: string | null;
  isRsvped: boolean;
  attendeeCount: number;
}

interface CalendarCell {
  dayNum: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  sessions: { id: string; title: string; scheduledAt: string }[];
}

interface AttendanceMetrics {
  avgAttendance: number;
  rsvpToJoinRate: number;
  remindersSent: number;
  completedSessions: number;
  replayRate: number;
  periodDays: number;
  trend?: {
    avgAttendanceDelta?: number;
    rsvpToJoinRateDelta?: number;
    remindersSentDelta?: number;
    replayRateDelta?: number;
  };
}

interface CommunitySessionsViewProps {
  communityId: string;
  communityName: string;
  communitySlug: string;
  canCreateSessions: boolean;
  totalSessions: number;
  liveCount: number;
  thisWeekCount: number;
  upcomingTabCount: number;
  pastTabCount: number;
  filter: string;
  upcomingAllCount: number;
  upcomingLiveCount: number;
  upcomingTodayCount: number;
  upcomingWeekCount: number;
  filteredUpcoming: SessionSummary[];
  pastFilter: string;
  pastAllCount: number;
  pastReplayCount: number;
  pastPublicReplayCount: number;
  hasPast: boolean;
  featuredReplays: SessionSummary[];
  filteredPast: SessionSummary[];
  primarySession: SessionSummary | null;
  attendance: AttendanceMetrics | null;
  recommendation: { key: string; tone: "warning" | "positive" } | null;
  rsvpJoinTarget: number;
  rsvpJoinProgress: number;
  rsvpJoinGap: number;
  metricWindow: number;
  monthStart: string; // ISO
  sessionsThisMonthCount: number;
  calendarCells: CalendarCell[];
  upcomingThisMonth: { id: string; title: string; scheduledAt: string; duration: number | null }[];
  onRSVP: (sessionId: string, formData: FormData) => Promise<void>;
}

export function CommunitySessionsView(props: CommunitySessionsViewProps) {
  const t = useTranslations("dashboard.communityAdmin.sessions");
  const locale = useLocale();
  const dfLocale = getDateFnsLocale(locale);

  const {
    communityId,
    communityName,
    communitySlug,
    canCreateSessions,
    totalSessions,
    liveCount,
    thisWeekCount,
    upcomingTabCount,
    pastTabCount,
    filter,
    upcomingAllCount,
    upcomingLiveCount,
    upcomingTodayCount,
    upcomingWeekCount,
    filteredUpcoming,
    pastFilter,
    pastAllCount,
    pastReplayCount,
    pastPublicReplayCount,
    hasPast,
    featuredReplays,
    filteredPast,
    primarySession,
    attendance,
    recommendation,
    rsvpJoinTarget,
    rsvpJoinProgress,
    rsvpJoinGap,
    metricWindow,
    monthStart,
    sessionsThisMonthCount,
    calendarCells,
    upcomingThisMonth,
    onRSVP,
  } = props;

  const formatSessionDate = (date: Date) => {
    if (isToday(date)) return t("today");
    if (isTomorrow(date)) return t("tomorrow");
    return format(date, "EEEE, MMMM d", { locale: dfLocale });
  };
  const formatSessionTime = (date: Date) => format(date, "h:mm a", { locale: dfLocale });
  const signed = (v: number) => `${v >= 0 ? "+" : ""}${v}`;
  const sessionsHref = (params: { filter?: string; pastFilter?: string; window?: number }) =>
    `/dashboard/communities/${communityId}/sessions?filter=${params.filter ?? filter}&pastFilter=${params.pastFilter ?? pastFilter}&window=${params.window ?? metricWindow}`;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-6xl px-4 py-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="mb-1 flex items-center gap-2">
                <h1 className="text-2xl font-semibold text-foreground">{t("title")}</h1>
                <Badge variant="secondary" className="bg-muted text-xs text-muted-foreground">
                  {t("sessionsCount", { count: totalSessions })}
                </Badge>
              </div>
              <p className="text-muted-foreground">{t("subtitle", { community: communityName })}</p>
              {liveCount > 0 && (
                <div className="mt-2 flex items-center gap-2 text-sm">
                  <Sparkles className="h-4 w-4 text-red-500" />
                  <span className="text-foreground">{t("liveNowCount", { count: liveCount })}</span>
                </div>
              )}
              {thisWeekCount > 0 && (
                <div className="mt-2 flex items-center gap-2 text-sm">
                  <Sparkles className="h-4 w-4 text-yellow-500" />
                  <span className="text-foreground">
                    {t("thisWeekCount", { count: thisWeekCount })}
                  </span>
                </div>
              )}
            </div>
            {canCreateSessions ? (
              <CreateSessionDialog
                triggerText={t("scheduleSession")}
                className="flex items-center gap-2 rounded-lg bg-purple-600 px-5 py-2.5 font-medium text-white hover:bg-purple-700"
                communityId={communityId}
              />
            ) : (
              <div className="text-sm text-muted-foreground">{t("ownerOnly")}</div>
            )}
          </div>
        </div>

        {/* Next / Current session */}
        <div className="mb-6 rounded-xl border border-border bg-card p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                {t("nextSession.label")}
              </p>
              {primarySession ? (
                <>
                  <h2 className="mt-1 text-lg font-semibold text-foreground">
                    {primarySession.title}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {primarySession.status === "IN_PROGRESS"
                      ? t("nextSession.liveBlurb")
                      : t("nextSession.metaScheduled", {
                          date: formatSessionDate(new Date(primarySession.scheduledAt)),
                          time: formatSessionTime(new Date(primarySession.scheduledAt)),
                          minutes: primarySession.duration || 60,
                          host: primarySession.mentorName || t("hostFallback"),
                        })}
                  </p>
                </>
              ) : (
                <>
                  <h2 className="mt-1 text-lg font-semibold text-foreground">
                    {t("nextSession.noneTitle")}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">{t("nextSession.noneBody")}</p>
                </>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {primarySession ? (
                <>
                  <Link
                    href={`/dashboard/sessions/${primarySession.id}/room?src=sessions_hub_primary_action`}
                  >
                    <Button
                      className={`${primarySession.status === "IN_PROGRESS" ? "bg-red-600 hover:bg-red-700" : "bg-purple-600 hover:bg-purple-700"} text-foreground`}
                    >
                      {primarySession.status === "IN_PROGRESS"
                        ? t("nextSession.joinLive")
                        : t("nextSession.openSession")}
                    </Button>
                  </Link>
                  {primarySession.status !== "IN_PROGRESS" && (
                    <form action={onRSVP.bind(null, primarySession.id)}>
                      <Button
                        variant="outline"
                        className="border-border text-foreground hover:bg-accent"
                      >
                        {primarySession.isRsvped
                          ? t("nextSession.attending")
                          : t("nextSession.rsvp")}
                      </Button>
                    </form>
                  )}
                  {canCreateSessions && (
                    <Link
                      href={`/dashboard/sessions/${primarySession.id}?src=sessions_hub_manage_primary`}
                    >
                      <Button
                        variant="outline"
                        className="border-border text-foreground hover:bg-accent"
                      >
                        {t("nextSession.manage")}
                      </Button>
                    </Link>
                  )}
                </>
              ) : (
                canCreateSessions && (
                  <CreateSessionDialog
                    triggerText={t("scheduleSession")}
                    className="bg-purple-600 text-white hover:bg-purple-700"
                    communityId={communityId}
                  />
                )
              )}
            </div>
          </div>
        </div>

        {attendance && (
          <>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-semibold text-foreground">{t("performance.title")}</p>
              <div className="flex items-center gap-2 text-xs">
                {canCreateSessions && (
                  <Link href="/dashboard/notifications?src=sessions_hub_reminders">
                    <Button
                      variant="outline"
                      className="h-7 border-border px-2 text-[11px] text-foreground hover:bg-accent"
                    >
                      {t("performance.reminders")}
                    </Button>
                  </Link>
                )}
                <span className="text-muted-foreground">{t("performance.window")}</span>
                {([7, 30, 90] as const).map((days) => (
                  <Link
                    key={days}
                    href={sessionsHref({ window: days })}
                    className={`rounded border px-2 py-1 transition ${
                      metricWindow === days
                        ? "border-border bg-muted text-foreground"
                        : "border-border bg-card text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    {t("performance.windowDays", { days })}
                  </Link>
                ))}
              </div>
            </div>
            <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border border-border bg-card p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {t("performance.avgAttendance")}
                </p>
                <p className="mt-1 text-2xl font-semibold text-foreground">
                  {attendance.avgAttendance}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("performance.lastDays", { days: attendance.periodDays })}
                </p>
                <p
                  className={`mt-1 text-xs ${(attendance.trend?.avgAttendanceDelta ?? 0) >= 0 ? "text-emerald-400" : "text-rose-400"}`}
                >
                  {t("performance.vsPrev", {
                    value: signed(attendance.trend?.avgAttendanceDelta || 0),
                  })}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-card p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {t("performance.rsvpToJoin")}
                </p>
                <p className="mt-1 text-2xl font-semibold text-foreground">
                  {attendance.rsvpToJoinRate}%
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("performance.target", { value: rsvpJoinTarget })}
                </p>
                <div className="mt-2 h-1.5 w-full rounded-full bg-muted">
                  <div
                    className={`h-1.5 rounded-full ${rsvpJoinProgress >= rsvpJoinTarget ? "bg-emerald-500" : "bg-amber-500"}`}
                    style={{ width: `${rsvpJoinProgress}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {rsvpJoinGap === 0
                    ? t("performance.onTarget")
                    : t("performance.ppToTarget", { value: rsvpJoinGap })}
                </p>
                <p
                  className={`mt-1 text-xs ${(attendance.trend?.rsvpToJoinRateDelta ?? 0) >= 0 ? "text-emerald-400" : "text-rose-400"}`}
                >
                  {t("performance.vsPrevPp", {
                    value: signed(attendance.trend?.rsvpToJoinRateDelta || 0),
                  })}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-card p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {t("performance.remindersSent")}
                </p>
                <p className="mt-1 text-2xl font-semibold text-foreground">
                  {attendance.remindersSent}
                </p>
                <p className="text-xs text-muted-foreground">{t("performance.deliveryVolume")}</p>
                <p
                  className={`mt-1 text-xs ${(attendance.trend?.remindersSentDelta ?? 0) >= 0 ? "text-emerald-400" : "text-rose-400"}`}
                >
                  {t("performance.vsPrev", {
                    value: signed(attendance.trend?.remindersSentDelta || 0),
                  })}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-card p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {t("performance.completedSessions")}
                </p>
                <p className="mt-1 text-2xl font-semibold text-foreground">
                  {attendance.completedSessions}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("performance.replayRate", { value: attendance.replayRate })}
                </p>
                <p
                  className={`mt-1 text-xs ${(attendance.trend?.replayRateDelta ?? 0) >= 0 ? "text-emerald-400" : "text-rose-400"}`}
                >
                  {t("performance.replayVsPrev", {
                    value: signed(attendance.trend?.replayRateDelta || 0),
                  })}
                </p>
              </div>
            </div>
            {recommendation && recommendation.tone === "warning" && (
              <div className="mb-6 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
                <p className="text-sm font-semibold text-foreground">
                  {t(`recommendation.${recommendation.key}.title`)}
                </p>
                <p className="mt-1 text-sm text-foreground">
                  {t(`recommendation.${recommendation.key}.description`)}
                </p>
                {recommendation.key === "lowRsvp" && (
                  <div className="mt-3">
                    <Link href={`/dashboard/c/${communitySlug}?src=attendance_tip_question_post`}>
                      <Button className="bg-amber-400 text-black hover:bg-amber-300">
                        {t("recommendation.createQuestionPost")}
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">{t("scheduleSurface.title")}</p>
          <p className="text-xs text-muted-foreground">{t("scheduleSurface.subtitle")}</p>
        </div>

        <Tabs defaultValue="upcoming" className="w-full">
          <TabsList className="mb-6 border-border bg-card">
            <TabsTrigger value="upcoming" className="text-foreground data-[state=active]:bg-muted">
              {t("tabs.upcoming", { count: upcomingTabCount })}
            </TabsTrigger>
            <TabsTrigger value="past" className="text-foreground data-[state=active]:bg-muted">
              {t("tabs.past", { count: pastTabCount })}
            </TabsTrigger>
            <TabsTrigger value="calendar" className="text-foreground data-[state=active]:bg-muted">
              {t("tabs.calendar")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="space-y-4">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              {upcomingLiveCount > 0 && (
                <Badge className="bg-red-600 text-xs text-white">
                  {t("filters.liveNow", { count: upcomingLiveCount })}
                </Badge>
              )}
              <Link href={sessionsHref({ filter: "all" })}>
                <Button
                  variant="outline"
                  className={`h-8 border-border text-xs ${filter === "all" ? "bg-muted text-foreground" : "text-foreground hover:bg-accent"}`}
                >
                  {t("filters.all", { count: upcomingAllCount })}
                </Button>
              </Link>
              <Link href={sessionsHref({ filter: "live" })}>
                <Button
                  variant="outline"
                  className={`h-8 border-border text-xs ${filter === "live" ? "border-red-500 bg-red-600 text-white" : "bg-card text-foreground hover:bg-accent"}`}
                >
                  {t("filters.live", { count: upcomingLiveCount })}
                </Button>
              </Link>
              <Link href={sessionsHref({ filter: "today" })}>
                <Button
                  variant="outline"
                  className={`h-8 border-border text-xs ${filter === "today" ? "bg-muted text-foreground" : "bg-card text-foreground hover:bg-accent"}`}
                >
                  {t("filters.today", { count: upcomingTodayCount })}
                </Button>
              </Link>
              <Link href={sessionsHref({ filter: "week" })}>
                <Button
                  variant="outline"
                  className={`h-8 border-border text-xs ${filter === "week" ? "bg-muted text-foreground" : "bg-card text-foreground hover:bg-accent"}`}
                >
                  {t("filters.week", { count: upcomingWeekCount })}
                </Button>
              </Link>
            </div>

            {filteredUpcoming.length === 0 ? (
              <div className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                      <Video className="h-4.5 w-4.5 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">
                        {filter === "live"
                          ? t("empty.upcomingLive")
                          : filter === "today"
                            ? t("empty.upcomingToday")
                            : filter === "week"
                              ? t("empty.upcomingWeek")
                              : t("empty.upcomingAll")}
                      </h3>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {filter === "all"
                          ? t("empty.upcomingBodyAll")
                          : t("empty.upcomingBodyFiltered")}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {canCreateSessions && (
                      <CreateSessionDialog
                        triggerText={t("scheduleSession")}
                        className="bg-purple-600 text-white hover:bg-purple-700"
                        communityId={communityId}
                      />
                    )}
                    {filter !== "all" && (
                      <Link href={sessionsHref({ filter: "all" })}>
                        <Button
                          variant="outline"
                          className="border-border text-foreground hover:bg-accent"
                        >
                          {t("filters.clearFilter")}
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredUpcoming.map((s) => (
                  <div
                    key={s.id}
                    className="group rounded-xl border border-border bg-background p-5 transition-all hover:border-border"
                  >
                    <div className="mb-3 flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-foreground">
                        {formatSessionDate(new Date(s.scheduledAt))}
                      </span>
                      {s.status === "IN_PROGRESS" && (
                        <Badge className="bg-red-600 text-[10px] text-white">
                          {t("card.live")}
                        </Badge>
                      )}
                    </div>

                    <h3 className="mb-2 text-lg font-semibold text-foreground">{s.title}</h3>

                    <p className="mb-4 text-sm text-muted-foreground">
                      {t("card.withHost", { host: s.mentorName || t("hostFallback") })}
                    </p>

                    <div className="mb-4 flex items-center gap-3 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        <span>{formatSessionTime(new Date(s.scheduledAt))}</span>
                      </div>
                      <span>•</span>
                      <span>{t("card.minutes", { minutes: s.duration || 60 })}</span>
                    </div>

                    <p className="mb-3 text-xs text-muted-foreground">
                      {t("card.attending", { count: s.attendeeCount })}
                    </p>

                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/dashboard/sessions/${s.id}/room?src=sessions_hub_upcoming_card`}
                      >
                        <Button
                          className={`${s.status === "IN_PROGRESS" ? "bg-red-600 hover:bg-red-700" : "bg-purple-600 hover:bg-purple-700"} text-foreground`}
                        >
                          {s.status === "IN_PROGRESS" ? t("card.joinLive") : t("card.join")}
                        </Button>
                      </Link>
                      {s.visibility === "public" && s.slug && (
                        <Link
                          href={`/sessions/${s.slug}?ref=sessions_hub&src=upcoming_card`}
                          target="_blank"
                        >
                          <Button
                            variant="outline"
                            className="border-border text-foreground hover:bg-accent"
                          >
                            {t("card.publicPage")}
                          </Button>
                        </Link>
                      )}
                      {s.status !== "IN_PROGRESS" && (
                        <form action={onRSVP.bind(null, s.id)}>
                          <Button
                            variant="outline"
                            className="border-border text-foreground hover:bg-accent"
                          >
                            {s.isRsvped ? t("card.attendingBtn") : t("card.rsvp")}
                          </Button>
                        </form>
                      )}
                      {canCreateSessions && (
                        <Link href={`/dashboard/sessions/${s.id}?src=sessions_hub_manage_card`}>
                          <Button
                            variant="outline"
                            className="border-border text-foreground hover:bg-accent"
                          >
                            {t("card.manage")}
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="past" className="space-y-4">
            {!hasPast ? (
              <div className="rounded-2xl border border-border bg-card p-8 text-center">
                <Video className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
                <p className="text-muted-foreground">{t("empty.pastTitle")}</p>
                <p className="mt-1 text-sm text-muted-foreground">{t("empty.pastBody")}</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex flex-wrap gap-2">
                  <Link href={sessionsHref({ pastFilter: "all" })}>
                    <Button
                      variant="outline"
                      className={`h-8 border-border text-xs ${pastFilter === "all" ? "bg-muted text-foreground" : "text-foreground hover:bg-accent"}`}
                    >
                      {t("pastFilters.all", { count: pastAllCount })}
                    </Button>
                  </Link>
                  <Link href={sessionsHref({ pastFilter: "replay" })}>
                    <Button
                      variant="outline"
                      className={`h-8 border-border text-xs ${pastFilter === "replay" ? "bg-muted text-foreground" : "text-foreground hover:bg-accent"}`}
                    >
                      {t("pastFilters.replay", { count: pastReplayCount })}
                    </Button>
                  </Link>
                  <Link href={sessionsHref({ pastFilter: "public" })}>
                    <Button
                      variant="outline"
                      className={`h-8 border-border text-xs ${pastFilter === "public" ? "border-emerald-500 bg-emerald-600 text-white" : "text-foreground hover:bg-accent"}`}
                    >
                      {t("pastFilters.public", { count: pastPublicReplayCount })}
                    </Button>
                  </Link>
                </div>
                {featuredReplays.length > 0 && (
                  <div>
                    <h3 className="mb-3 text-sm font-semibold text-foreground">
                      {t("featuredReplays.title")}
                    </h3>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {featuredReplays.map((s, index) => (
                        <div
                          key={s.id}
                          className="rounded-xl border border-emerald-500/30 bg-gradient-to-br from-card to-background p-5"
                        >
                          <div className="mb-3 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <Badge className="border-emerald-500/30 bg-emerald-500/20 text-emerald-300">
                                {t("featuredReplays.replay")}
                              </Badge>
                              {index === 0 && (
                                <Badge className="border-amber-500/40 bg-amber-500/20 text-amber-300">
                                  {t("featuredReplays.topAttended")}
                                </Badge>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(s.scheduledAt), {
                                addSuffix: true,
                                locale: dfLocale,
                              })}
                            </span>
                          </div>
                          <h4 className="mb-2 line-clamp-2 text-base font-semibold text-foreground">
                            {s.title}
                          </h4>
                          <p className="mb-4 text-xs text-muted-foreground">
                            {t("card.minutes", { minutes: s.duration || 60 })} •{" "}
                            {t("card.attended", { count: s.attendeeCount })}
                          </p>
                          <div className="grid grid-cols-2 gap-2">
                            <Link href={s.recordingUrl!} target="_blank">
                              <Button className="w-full bg-emerald-600 text-foreground hover:bg-emerald-700">
                                {t("card.watchReplay")}
                              </Button>
                            </Link>
                            {s.visibility === "public" && s.slug ? (
                              <Link
                                href={`/sessions/${s.slug}?ref=sessions_hub&src=featured_replay`}
                                target="_blank"
                              >
                                <Button
                                  variant="outline"
                                  className="w-full border-border text-foreground hover:bg-accent"
                                >
                                  {t("card.publicLink")}
                                </Button>
                              </Link>
                            ) : (
                              <Button
                                variant="outline"
                                disabled
                                className="w-full border-border text-muted-foreground"
                              >
                                {t("card.membersOnly")}
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {filteredPast.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border bg-background p-8 text-center">
                    <p className="text-sm font-medium text-foreground">
                      {t("empty.pastFilterTitle")}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {pastFilter === "public"
                        ? t("empty.pastFilterPublic")
                        : pastFilter === "replay"
                          ? t("empty.pastFilterReplay")
                          : t("empty.pastFilterDefault")}
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredPast.slice(0, 9).map((s) => (
                      <div
                        key={s.id}
                        className="group rounded-xl border border-border bg-background p-5 transition-all hover:border-border"
                      >
                        <div className="mb-3 flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">
                            {formatDistanceToNow(new Date(s.scheduledAt), {
                              addSuffix: true,
                              locale: dfLocale,
                            })}
                          </span>
                          {s.recordingUrl && (
                            <Badge className="border-green-500/30 bg-green-500/20 text-green-400">
                              {t("card.recordingAvailable")}
                            </Badge>
                          )}
                        </div>

                        <h3 className="mb-2 text-base font-medium text-foreground">{s.title}</h3>
                        <p className="mb-4 text-xs text-muted-foreground">
                          {t("card.minutes", { minutes: s.duration || 60 })} •{" "}
                          {t("card.attended", { count: s.attendeeCount })}
                        </p>

                        <div className="flex items-center gap-2">
                          {s.recordingUrl ? (
                            <>
                              <Link href={s.recordingUrl} target="_blank">
                                <Button
                                  variant="outline"
                                  className="flex items-center gap-2 border-border text-foreground hover:bg-accent"
                                >
                                  <ArrowRight className="h-4 w-4" />
                                  {t("card.watch")}
                                </Button>
                              </Link>
                              {s.visibility === "public" && s.slug && (
                                <Link
                                  href={`/sessions/${s.slug}?ref=sessions_hub&src=past_card`}
                                  target="_blank"
                                >
                                  <Button
                                    variant="outline"
                                    className="border-border text-foreground hover:bg-accent"
                                  >
                                    {t("card.publicLink")}
                                  </Button>
                                </Link>
                              )}
                            </>
                          ) : (
                            <Link
                              href={`/dashboard/sessions/${s.id}/room?src=sessions_hub_past_enter_room`}
                            >
                              <Button
                                variant="outline"
                                className="border-border text-foreground hover:bg-accent"
                              >
                                {t("card.enterRoom")}
                              </Button>
                            </Link>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="calendar" className="space-y-6">
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground">
                  {format(new Date(monthStart), "MMMM yyyy", { locale: dfLocale })}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t("calendar.sessionsThisMonth", { count: sessionsThisMonthCount })}
                </p>
              </div>

              <div className="mb-2 grid grid-cols-7 gap-2 text-center text-xs text-muted-foreground">
                {[1, 2, 3, 4, 5, 6, 0].map((v) => (
                  <div key={v} className="py-1 font-medium">
                    {t(`weekdays.${v}`)}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-2">
                {calendarCells.map((cell, idx) => (
                  <div
                    key={idx}
                    className={`min-h-[92px] rounded-lg border p-2 ${
                      cell.isCurrentMonth
                        ? "border-border bg-background"
                        : "border-border bg-background/40"
                    } ${cell.isToday ? "ring-1 ring-purple-500/70" : ""}`}
                  >
                    <div
                      className={`text-xs font-medium ${cell.isCurrentMonth ? "text-foreground" : "text-muted-foreground"}`}
                    >
                      {cell.dayNum}
                    </div>

                    <div className="mt-1 space-y-1">
                      {cell.sessions.slice(0, 2).map((s) => (
                        <Link
                          key={s.id}
                          href={`/dashboard/sessions/${s.id}?src=sessions_hub_calendar_day`}
                        >
                          <div className="truncate rounded bg-purple-600/20 px-1.5 py-0.5 text-[10px] text-purple-300 hover:bg-purple-600/30">
                            {formatSessionTime(new Date(s.scheduledAt))} • {s.title}
                          </div>
                        </Link>
                      ))}
                      {cell.sessions.length > 2 && (
                        <div className="text-[10px] text-muted-foreground">
                          {t("calendar.moreCount", { count: cell.sessions.length - 2 })}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="mb-4 text-sm font-semibold text-foreground">
                {t("calendar.upcomingInMonth")}
              </h3>
              {upcomingThisMonth.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("calendar.noUpcomingInMonth")}</p>
              ) : (
                <div className="space-y-2">
                  {upcomingThisMonth.map((s) => (
                    <Link
                      key={s.id}
                      href={`/dashboard/sessions/${s.id}?src=sessions_hub_calendar_list`}
                    >
                      <div className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2 hover:border-border">
                        <div>
                          <p className="text-sm font-medium text-foreground">{s.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(s.scheduledAt), "EEE, MMM d • h:mm a", {
                              locale: dfLocale,
                            })}
                          </p>
                        </div>
                        <Badge className="bg-muted text-foreground">
                          {t("card.minutes", { minutes: s.duration || 60 })}
                        </Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
