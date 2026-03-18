import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Video, Calendar, Clock, ArrowRight, Sparkles } from "lucide-react";
import { CreateSessionDialog } from "@/components/sessions/CreateSessionDialog";
import { getCommunityAttendanceMetrics, toggleSessionRSVP } from "@/app/actions/sessions";
import {
  format,
  isToday,
  isTomorrow,
  formatDistanceToNow,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
} from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface CommunitySessionsPageProps {
  params: Promise<{
    communityId: string;
  }>;
  searchParams: Promise<{
    filter?: string;
    pastFilter?: string;
    window?: string;
  }>;
}

function formatSessionDate(date: Date): string {
  if (isToday(date)) return "Today";
  if (isTomorrow(date)) return "Tomorrow";
  return format(date, "EEEE, MMMM d");
}

function formatSessionTime(date: Date): string {
  return format(date, "h:mm a");
}

function getAttendanceRecommendation(attendance: any) {
  if (!attendance) return null;

  if (attendance.rsvpToJoinRate < 50) {
    return {
      title: "Low RSVP → Join conversion",
      description: "Tip: Ask members to drop questions in the feed before the session. This typically increases attendance by ~30%.",
      tone: "warning" as const,
    };
  }

  if (attendance.avgAttendance < 5 && attendance.completedSessions >= 3) {
    return {
      title: "Attendance is still low",
      description: "Try a fixed weekly time and announce it earlier in feed to build a habit loop.",
      tone: "warning" as const,
    };
  }

  if (attendance.replayRate < 60 && attendance.completedSessions >= 2) {
    return {
      title: "Replay capture opportunity",
      description: "More sessions need replay distribution. Push recording-ready notifications and share public links.",
      tone: "warning" as const,
    };
  }

  if ((attendance.trend?.avgAttendanceDelta || 0) > 0 || (attendance.trend?.rsvpToJoinRateDelta || 0) > 0) {
    return {
      title: "Momentum is improving",
      description: "Keep cadence stable this week and push one extra live session announcement.",
      tone: "positive" as const,
    };
  }

  return null;
}

export default async function CommunitySessionsPage({ params, searchParams }: CommunitySessionsPageProps) {
try {
    const session = await auth();
    if (!session?.user?.id) {
      redirect("/auth/signin");
    }

    const { communityId } = await params;
    const { filter = "all", pastFilter = "all", window = "30" } = await searchParams;
    const metricWindow = ["7", "30", "90"].includes(window) ? Number(window) : 30;

    // Verify community exists and user is a member
    const community = await prisma.community.findUnique({
      where: { id: communityId },
      include: {
        members: {
          where: { userId: session.user.id },
          select: { id: true, role: true },
        },
      },
    });

    if (!community) {
      notFound();
    }

    const isOwner = community.ownerId === session.user.id;
    const canCreateSessions = isOwner;

    // Get sessions for this community - now filtering by communityId
    let allSessions: any[] = [];
    try {
      allSessions = await prisma.mentorSession.findMany({
        where: {
          communityId: community.id,
        },
        select: {
          id: true,
          title: true,
          description: true,
          scheduledAt: true,
          duration: true,
          status: true,
          visibility: true,
          slug: true,
          recordingUrl: true,
          mentorId: true,
mentor: {
            select: {
              id: true,
              name: true,
              image: true,
              username: true,
            },
          },
          participations: {
            where: {
              userId: session.user.id,
            },
            select: { id: true },
          },
          _count: {
            select: {
              participations: true,
            },
          },
        },
        orderBy: {
          scheduledAt: "asc",
        },
      });
    } catch (dbError) {
      console.error("Database error fetching sessions:", dbError);
      // Continue with empty sessions
    }

    const attendanceResult = await getCommunityAttendanceMetrics(communityId, metricWindow);
    const attendance = attendanceResult.success ? attendanceResult.metrics : null;
    const recommendation = attendance ? getAttendanceRecommendation(attendance) : null;
    const rsvpJoinTarget = 70;
    const rsvpJoinProgress = attendance ? Math.min(100, Math.max(0, attendance.rsvpToJoinRate)) : 0;
    const rsvpJoinGap = attendance ? Math.max(0, rsvpJoinTarget - attendance.rsvpToJoinRate) : 0;

    // Split into live, upcoming and past
    const now = new Date();
    const liveSessions = allSessions.filter((s) => s.status === "IN_PROGRESS");
    const upcoming = allSessions.filter(
      (s) => s.status === "SCHEDULED" && new Date(s.scheduledAt) >= now
    );
    const past = allSessions.filter(
      (s) => s.status === "COMPLETED" || (s.status === "SCHEDULED" && new Date(s.scheduledAt) < now)
    );
    const pastSorted = [...past].sort(
      (a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime()
    );
    const filteredPast = pastSorted.filter((s) => {
      if (pastFilter === "replay") return Boolean(s.recordingUrl);
      if (pastFilter === "public") return Boolean(s.recordingUrl) && s.visibility === "public";
      return true;
    });
    const featuredReplays = pastSorted
      .filter((s) => Boolean(s.recordingUrl))
      .sort((a, b) => {
        const attendanceDelta = (b._count?.participations || 0) - (a._count?.participations || 0);
        if (attendanceDelta !== 0) return attendanceDelta;
        return new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime();
      })
      .slice(0, 3);
const pastAllCount = pastSorted.length;
    const pastReplayCount = pastSorted.filter((s) => Boolean(s.recordingUrl)).length;
    const pastPublicReplayCount = pastSorted.filter((s) => Boolean(s.recordingUrl) && s.visibility === "public" && Boolean(s.slug)).length;

    // Calculate sessions this week
    const thisWeek = [...liveSessions, ...upcoming].filter(s => {
const sessionDate = new Date(s.scheduledAt);
      const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      return sessionDate <= weekFromNow;
    });

    // Calendar data (current month)
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

    const sessionsThisMonth = allSessions.filter((s) => {
      const d = new Date(s.scheduledAt);
      return d >= monthStart && d <= monthEnd;
    });

    const getSessionsForDay = (day: Date) =>
      allSessions.filter((s) => isSameDay(new Date(s.scheduledAt), day));

    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const allUpcomingPool = [...liveSessions, ...upcoming];
    const upcomingAllCount = allUpcomingPool.length;
    const upcomingLiveCount = allUpcomingPool.filter((s) => s.status === "IN_PROGRESS").length;
    const upcomingTodayCount = allUpcomingPool.filter((s) => {
      const date = new Date(s.scheduledAt);
      return date >= startOfToday && date <= endOfToday;
    }).length;
    const upcomingWeekCount = allUpcomingPool.filter((s) => {
      const date = new Date(s.scheduledAt);
      return date >= now && date <= weekFromNow;
    }).length;

    const filteredUpcoming = allUpcomingPool.filter((s) => {
      const date = new Date(s.scheduledAt);
      if (filter === "live") return s.status === "IN_PROGRESS";
      if (filter === "today") return date >= startOfToday && date <= endOfToday;
      if (filter === "week") return date >= now && date <= weekFromNow;
      return true;
    });

    const primarySession = liveSessions[0] || upcoming[0] || null;

    async function handleRSVP(sessionId: string, _formData: FormData) {
"use server";
      await toggleSessionRSVP(sessionId, `/dashboard/communities/${communityId}/sessions`);
    }

    return (
<div className="min-h-screen bg-zinc-950">
        <div className="container mx-auto max-w-6xl px-4 py-6">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-2xl font-semibold text-white">Live Sessions</h1>
                  <Badge variant="secondary" className="bg-zinc-800 text-zinc-400 text-xs">
                    {allSessions.length} sessions
                  </Badge>
                </div>
                <p className="text-zinc-400">{community.name} • Run live coaching, classes, and workshops</p>
                {liveSessions.length > 0 && (
                  <div className="mt-2 flex items-center gap-2 text-sm">
                    <Sparkles className="h-4 w-4 text-red-500" />
                    <span className="text-zinc-300">
                      {liveSessions.length} {liveSessions.length === 1 ? "session is" : "sessions are"} live now
                    </span>
                  </div>
                )}
                {upcoming.length > 0 && (
                  <div className="mt-2 flex items-center gap-2 text-sm">
                    <Sparkles className="h-4 w-4 text-yellow-500" />
                    <span className="text-zinc-300">
                      {thisWeek.length} {thisWeek.length === 1 ? "session" : "sessions"} this week
                    </span>
                  </div>
                )}
</div>
              {canCreateSessions && (
                <CreateSessionDialog
                  triggerText="Schedule Session"
                  className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-lg font-medium flex items-center gap-2"
                  communityId={communityId}
                />
              )}
              {!canCreateSessions && (
                <div className="text-sm text-zinc-500">
                  (Owner only feature)
                </div>
              )}
            </div>
          </div>

          <div className="mb-6 rounded-xl border border-zinc-800 bg-zinc-900 p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-zinc-500">Next / Current session</p>
                {primarySession ? (
                  <>
                    <h2 className="mt-1 text-lg font-semibold text-white">{primarySession.title}</h2>
                    <p className="mt-1 text-sm text-zinc-400">
                      {primarySession.status === "IN_PROGRESS"
                        ? "Your community is live now. Keep momentum and drive join rate."
                        : `${formatSessionDate(new Date(primarySession.scheduledAt))} · ${formatSessionTime(new Date(primarySession.scheduledAt))} · ${primarySession.duration || 60} min · with ${primarySession.mentor?.name || "Host"}`}
                    </p>
                  </>
                ) : (
                  <>
                    <h2 className="mt-1 text-lg font-semibold text-white">No session scheduled yet</h2>
                    <p className="mt-1 text-sm text-zinc-400">Schedule your next live touchpoint to keep weekly community cadence.</p>
                  </>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {primarySession ? (
                  <>
                    <Link href={`/dashboard/sessions/${primarySession.id}/room?src=sessions_hub_primary_action`}>
                      <Button className={`${primarySession.status === "IN_PROGRESS" ? "bg-red-600 hover:bg-red-700" : "bg-purple-600 hover:bg-purple-700"} text-white`}>
                        {primarySession.status === "IN_PROGRESS" ? "Join live" : "Open session"}
                      </Button>
                    </Link>
                    {primarySession.status !== "IN_PROGRESS" && (
                      <form action={handleRSVP.bind(null, primarySession.id)}>
                        <Button variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
                          {primarySession.participations?.length ? "Attending" : "RSVP"}
                        </Button>
                      </form>
                    )}
                  </>
                ) : (
                  canCreateSessions && (
                    <CreateSessionDialog
                      triggerText="Schedule session"
                      className="bg-purple-600 hover:bg-purple-700 text-white"
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
              <p className="text-sm font-semibold text-zinc-100">Session performance</p>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-zinc-500">Window:</span>
                {([7, 30, 90] as const).map((days) => (
                  <Link
                    key={days}
                    href={`/dashboard/communities/${communityId}/sessions?filter=${filter}&pastFilter=${pastFilter}&window=${days}`}
                    className={`rounded border px-2 py-1 transition ${
                      metricWindow === days
                        ? "border-zinc-500 bg-zinc-800 text-zinc-100"
                        : "border-zinc-700 bg-zinc-900 text-zinc-400 hover:bg-zinc-800"
                    }`}
                  >
                    {days}d
                  </Link>
                ))}
              </div>
            </div>
            <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
<div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
                <p className="text-xs uppercase tracking-wide text-zinc-500">Avg attendance</p>
                <p className="mt-1 text-2xl font-semibold text-white">{attendance.avgAttendance}</p>
                <p className="text-xs text-zinc-500">last {attendance.periodDays} days</p>
                <p className={`mt-1 text-xs ${attendance.trend?.avgAttendanceDelta >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {attendance.trend?.avgAttendanceDelta >= 0 ? "+" : ""}{attendance.trend?.avgAttendanceDelta || 0} vs prev period
                </p>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
                <p className="text-xs uppercase tracking-wide text-zinc-500">RSVP → join</p>
                <p className="mt-1 text-2xl font-semibold text-white">{attendance.rsvpToJoinRate}%</p>
                <p className="text-xs text-zinc-500">target: {rsvpJoinTarget}%</p>
                <div className="mt-2 h-1.5 w-full rounded-full bg-zinc-800">
                  <div
                    className={`h-1.5 rounded-full ${rsvpJoinProgress >= rsvpJoinTarget ? "bg-emerald-500" : "bg-amber-500"}`}
                    style={{ width: `${rsvpJoinProgress}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-zinc-500">
                  {rsvpJoinGap === 0 ? "On target" : `${rsvpJoinGap}pp to target`}
                </p>
                <p className={`mt-1 text-xs ${attendance.trend?.rsvpToJoinRateDelta >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {attendance.trend?.rsvpToJoinRateDelta >= 0 ? "+" : ""}{attendance.trend?.rsvpToJoinRateDelta || 0}pp vs prev period
                </p>
              </div>
<div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
                <p className="text-xs uppercase tracking-wide text-zinc-500">Reminders sent</p>
                <p className="mt-1 text-2xl font-semibold text-white">{attendance.remindersSent}</p>
                <p className="text-xs text-zinc-500">delivery volume</p>
                <p className={`mt-1 text-xs ${attendance.trend?.remindersSentDelta >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {attendance.trend?.remindersSentDelta >= 0 ? "+" : ""}{attendance.trend?.remindersSentDelta || 0} vs prev period
                </p>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
                <p className="text-xs uppercase tracking-wide text-zinc-500">Completed sessions</p>
                <p className="mt-1 text-2xl font-semibold text-white">{attendance.completedSessions}</p>
                <p className="text-xs text-zinc-500">Replay rate: {attendance.replayRate}%</p>
                <p className={`mt-1 text-xs ${attendance.trend?.replayRateDelta >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {attendance.trend?.replayRateDelta >= 0 ? "+" : ""}{attendance.trend?.replayRateDelta || 0}pp replay vs prev period
                </p>
              </div>
</div>
            {recommendation && recommendation.tone === "warning" && (
              <div className="mb-6 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
                <p className="text-sm font-semibold text-white">{recommendation.title}</p>
                <p className="mt-1 text-sm text-zinc-300">{recommendation.description}</p>
                {recommendation.title === "Low RSVP → Join conversion" && (
                  <div className="mt-3">
                    <Link href={`/dashboard/c/${community.slug}?src=attendance_tip_question_post`}>
                      <Button className="bg-amber-400 text-zinc-900 hover:bg-amber-300">
                        Create question post
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            )}
</>
          )}


          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-zinc-100">Schedule surface</p>
            <p className="text-xs text-zinc-500">Upcoming, past, and calendar views</p>
          </div>

          <Tabs defaultValue="upcoming" className="w-full">
<TabsList className="bg-zinc-900 border-zinc-800 mb-6">
              <TabsTrigger value="upcoming" className="data-[state=active]:bg-zinc-800 text-zinc-300">
                Upcoming ({liveSessions.length + upcoming.length})
              </TabsTrigger>
<TabsTrigger value="past" className="data-[state=active]:bg-zinc-800 text-zinc-300">
                Past ({past.length})
              </TabsTrigger>
              <TabsTrigger value="calendar" className="data-[state=active]:bg-zinc-800 text-zinc-300">
                Calendar
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upcoming" className="space-y-4">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                {upcomingLiveCount > 0 && (
                  <Badge className="bg-red-600 text-white text-xs">{upcomingLiveCount} live now</Badge>
                )}
<Link href={`/dashboard/communities/${communityId}/sessions?filter=all&window=${metricWindow}`}>
                  <Button variant="outline" className={`h-8 border-zinc-700 text-xs ${filter === "all" ? "bg-zinc-800 text-white" : "text-zinc-300 hover:bg-zinc-800"}`}>
                    All ({upcomingAllCount})
</Button>
                </Link>
                <Link href={`/dashboard/communities/${communityId}/sessions?filter=live&window=${metricWindow}`}>
                  <Button variant="outline" className={`h-8 border-zinc-700 text-xs ${filter === "live" ? "bg-red-600 text-white border-red-500" : "bg-zinc-900 text-zinc-100 hover:bg-zinc-800"}`}>
                    Live ({upcomingLiveCount})
</Button>
                </Link>
                <Link href={`/dashboard/communities/${communityId}/sessions?filter=today&window=${metricWindow}`}>
                  <Button variant="outline" className={`h-8 border-zinc-700 text-xs ${filter === "today" ? "bg-zinc-800 text-white" : "bg-zinc-900 text-zinc-100 hover:bg-zinc-800"}`}>
                    Today ({upcomingTodayCount})
</Button>
                </Link>
                <Link href={`/dashboard/communities/${communityId}/sessions?filter=week&window=${metricWindow}`}>
                  <Button variant="outline" className={`h-8 border-zinc-700 text-xs ${filter === "week" ? "bg-zinc-800 text-white" : "bg-zinc-900 text-zinc-100 hover:bg-zinc-800"}`}>
                    This week ({upcomingWeekCount})
</Button>
                </Link>
              </div>

              {filteredUpcoming.length === 0 ? (
                <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-full bg-zinc-800">
                        <Video className="h-4.5 w-4.5 text-zinc-400" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-white">
                          {filter === "live"
                            ? "No sessions live right now"
                            : filter === "today"
                            ? "No sessions scheduled for today"
                            : filter === "week"
                            ? "No sessions scheduled this week"
                            : "No upcoming sessions yet"}
                        </h3>
                        <p className="mt-1 text-xs text-zinc-400">
                          {filter === "all"
                            ? "Schedule your next live touchpoint to keep weekly community cadence."
                            : "Try another filter or schedule a session for this window."}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {canCreateSessions && (
                        <CreateSessionDialog
                          triggerText="Schedule session"
                          className="bg-purple-600 hover:bg-purple-700 text-white"
                          communityId={communityId}
                        />
                      )}
                      {filter !== "all" && (
                        <Link href={`/dashboard/communities/${communityId}/sessions?filter=all&window=${metricWindow}`}>
                          <Button variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
                            Clear filter
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
                      className="group rounded-xl border border-zinc-800 bg-zinc-950 p-5 transition-all hover:border-zinc-700"
                    >
                      {/* Date badge */}
                      <div className="mb-3 flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-zinc-400" />
                        <span className="text-zinc-300">
                          {formatSessionDate(new Date(s.scheduledAt))}
                        </span>
                        {s.status === "IN_PROGRESS" && (
                          <Badge className="bg-red-600 text-white text-[10px]">LIVE</Badge>
                        )}
                      </div>

                      {/* Title */}
                      <h3 className="mb-2 text-lg font-semibold text-white">
                        {s.title}
                      </h3>

                      {/* Host */}
                      <p className="mb-4 text-sm text-zinc-400">
                        with {s.mentor?.name || "Host"}
                      </p>

                      {/* Time & Duration */}
                      <div className="mb-4 flex items-center gap-3 text-sm text-zinc-500">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          <span>{formatSessionTime(new Date(s.scheduledAt))}</span>
                        </div>
                        <span>•</span>
                        <span>{s.duration || 60} min</span>
                      </div>

                      <p className="mb-3 text-xs text-zinc-500">
                        {s._count?.participations || 0} attending
                      </p>

                      {/* Actions */}
                      <div className="flex flex-wrap items-center gap-2">
                        <Link href={`/dashboard/sessions/${s.id}/room?src=sessions_hub_upcoming_card`}>
                          <Button className={`${s.status === "IN_PROGRESS" ? "bg-red-600 hover:bg-red-700" : "bg-purple-600 hover:bg-purple-700"} text-white`}>
{s.status === "IN_PROGRESS" ? "Join Live" : "Join"}
                          </Button>
                        </Link>
                        {s.visibility === "public" && s.slug && (
                          <Link href={`/sessions/${s.slug}?ref=sessions_hub&src=upcoming_card`} target="_blank">
                            <Button variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
                              Public Page
                            </Button>
                          </Link>
                        )}
                        {s.status !== "IN_PROGRESS" && (
                          <form action={handleRSVP.bind(null, s.id)}>
                            <Button variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
                              {s.participations?.length ? "Attending" : "RSVP"}
                            </Button>
                          </form>
                        )}
                        {canCreateSessions && (
                          <Button variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
                            Edit
                          </Button>
                        )}
                      </div>
</div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="past" className="space-y-4">
              {past.length === 0 ? (
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-center">
                  <Video className="mx-auto mb-3 h-12 w-12 text-zinc-600" />
                  <p className="text-zinc-400">No past sessions yet</p>
                  <p className="text-sm text-zinc-500 mt-1">
                    Past sessions with recordings will appear here
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex flex-wrap gap-2">
                    <Link href={`/dashboard/communities/${communityId}/sessions?filter=${filter}&pastFilter=all&window=${metricWindow}`}>
                      <Button variant="outline" className={`h-8 border-zinc-700 text-xs ${pastFilter === "all" ? "bg-zinc-800 text-white" : "text-zinc-300 hover:bg-zinc-800"}`}>
                        All ({pastAllCount})
                      </Button>
                    </Link>
                    <Link href={`/dashboard/communities/${communityId}/sessions?filter=${filter}&pastFilter=replay&window=${metricWindow}`}>
                      <Button variant="outline" className={`h-8 border-zinc-700 text-xs ${pastFilter === "replay" ? "bg-zinc-800 text-white" : "text-zinc-300 hover:bg-zinc-800"}`}>
                        With Replay ({pastReplayCount})
                      </Button>
                    </Link>
                    <Link href={`/dashboard/communities/${communityId}/sessions?filter=${filter}&pastFilter=public&window=${metricWindow}`}>
                      <Button variant="outline" className={`h-8 border-zinc-700 text-xs ${pastFilter === "public" ? "bg-emerald-600 text-white border-emerald-500" : "text-zinc-300 hover:bg-zinc-800"}`}>
                        Public Replays ({pastPublicReplayCount})
                      </Button>
                    </Link>
</div>
{featuredReplays.length > 0 && (
                    <div>
                      <h3 className="mb-3 text-sm font-semibold text-zinc-300">Featured Replays</h3>
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {featuredReplays.map((s, index) => (
                          <div key={s.id} className="rounded-xl border border-emerald-500/30 bg-gradient-to-br from-zinc-900 to-zinc-950 p-5">
                            <div className="mb-3 flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <Badge className="border-emerald-500/30 bg-emerald-500/20 text-emerald-300">Replay</Badge>
                                {index === 0 && (
                                  <Badge className="border-amber-500/40 bg-amber-500/20 text-amber-300">Top attended</Badge>
                                )}
                              </div>
                              <span className="text-xs text-zinc-500">{formatDistanceToNow(new Date(s.scheduledAt), { addSuffix: true })}</span>
                            </div>
<h4 className="mb-2 line-clamp-2 text-base font-semibold text-white">{s.title}</h4>
                            <p className="mb-4 text-xs text-zinc-400">{s.duration || 60} min • {s._count?.participations || 0} attended</p>
                            <div className="grid grid-cols-2 gap-2">
                              <Link href={s.recordingUrl!} target="_blank">
                                <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">Watch Replay</Button>
                              </Link>
                              {s.visibility === "public" && s.slug ? (
                                <Link href={`/sessions/${s.slug}?ref=sessions_hub&src=featured_replay`} target="_blank">
                                  <Button variant="outline" className="w-full border-zinc-700 text-zinc-300 hover:bg-zinc-800">Public Link</Button>
                                </Link>
) : (
                                <Button variant="outline" disabled className="w-full border-zinc-800 text-zinc-600">Members-only</Button>
                              )}
                            </div>
</div>
                        ))}
                      </div>
                    </div>
                  )}

                  {filteredPast.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-950 p-8 text-center">
                      <p className="text-sm font-medium text-zinc-300">No sessions match this filter</p>
                      <p className="mt-1 text-xs text-zinc-500">
                        {pastFilter === "public"
                          ? "No public replays yet. Mark a replay as public to distribute it."
                          : pastFilter === "replay"
                          ? "No recordings available yet in this range."
                          : "Try another filter or host a new live session."}
                      </p>
                    </div>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {filteredPast.slice(0, 9).map((s) => (
                        <div
                          key={s.id}
                          className="group rounded-xl border border-zinc-800 bg-zinc-950 p-5 transition-all hover:border-zinc-700"
                        >
                          <div className="mb-3 flex items-center justify-between">
                            <span className="text-sm text-zinc-500">
                              {formatDistanceToNow(new Date(s.scheduledAt), { addSuffix: true })}
                            </span>
                            {s.recordingUrl && (
                              <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                                Recording available
                              </Badge>
                            )}
                          </div>

                          <h3 className="mb-2 text-base font-medium text-white">{s.title}</h3>
                          <p className="mb-4 text-xs text-zinc-500">{s.duration || 60} min • {s._count?.participations || 0} attended</p>

                          <div className="flex items-center gap-2">
                            {s.recordingUrl ? (
                              <>
                                <Link href={s.recordingUrl} target="_blank">
                                  <Button variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 flex items-center gap-2">
                                    <ArrowRight className="h-4 w-4" />
                                    Watch
                                  </Button>
                                </Link>
                                {s.visibility === "public" && s.slug && (
                                  <Link href={`/sessions/${s.slug}?ref=sessions_hub&src=past_card`} target="_blank">
                                    <Button variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
                                      Public Link
                                    </Button>
                                  </Link>
                                )}
</>
                            ) : (
                              <Link href={`/dashboard/sessions/${s.id}/room?src=sessions_hub_past_enter_room`}>
<Button variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
                                  Enter Room
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
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">
                    {format(monthStart, "MMMM yyyy")}
                  </h3>
                  <p className="text-sm text-zinc-400">
                    {sessionsThisMonth.length} {sessionsThisMonth.length === 1 ? "session" : "sessions"} this month
                  </p>
                </div>

                <div className="mb-2 grid grid-cols-7 gap-2 text-center text-xs text-zinc-500">
                  {[
                    "Mon",
                    "Tue",
                    "Wed",
                    "Thu",
                    "Fri",
                    "Sat",
                    "Sun",
                  ].map((d) => (
                    <div key={d} className="py-1 font-medium">
                      {d}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-2">
                  {calendarDays.map((day) => {
                    const daySessions = getSessionsForDay(day);
                    const isCurrentMonth = isSameMonth(day, monthStart);
                    const isTodayDate = isToday(day);

                    return (
                      <div
                        key={day.toISOString()}
                        className={`min-h-[92px] rounded-lg border p-2 ${
                          isCurrentMonth
                            ? "border-zinc-800 bg-zinc-950"
                            : "border-zinc-900 bg-zinc-950/40"
                        } ${isTodayDate ? "ring-1 ring-purple-500/70" : ""}`}
                      >
                        <div className={`text-xs font-medium ${isCurrentMonth ? "text-zinc-300" : "text-zinc-600"}`}>
                          {format(day, "d")}
                        </div>

                        <div className="mt-1 space-y-1">
                          {daySessions.slice(0, 2).map((s) => (
                            <Link key={s.id} href={`/dashboard/sessions/${s.id}?src=sessions_hub_calendar_day`}>
<div className="truncate rounded bg-purple-600/20 px-1.5 py-0.5 text-[10px] text-purple-300 hover:bg-purple-600/30">
                                {formatSessionTime(new Date(s.scheduledAt))} • {s.title}
                              </div>
                            </Link>
                          ))}
                          {daySessions.length > 2 && (
                            <div className="text-[10px] text-zinc-500">+{daySessions.length - 2} more</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
                <h3 className="mb-4 text-sm font-semibold text-white">Upcoming in this month</h3>
                {sessionsThisMonth.filter((s) => new Date(s.scheduledAt) >= now).length === 0 ? (
                  <p className="text-sm text-zinc-500">No upcoming sessions this month.</p>
                ) : (
                  <div className="space-y-2">
                    {sessionsThisMonth
                      .filter((s) => new Date(s.scheduledAt) >= now)
                      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
                      .slice(0, 8)
                      .map((s) => (
                        <Link key={s.id} href={`/dashboard/sessions/${s.id}?src=sessions_hub_calendar_list`}>
<div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 hover:border-zinc-700">
                            <div>
                              <p className="text-sm font-medium text-white">{s.title}</p>
                              <p className="text-xs text-zinc-500">
                                {format(new Date(s.scheduledAt), "EEE, MMM d • h:mm a")}
                              </p>
                            </div>
                            <Badge className="bg-zinc-800 text-zinc-300">{s.duration || 60} min</Badge>
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
  } catch (error) {
    console.error("Error in CommunitySessionsPage:", error);
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center p-8">
          <h1 className="text-xl font-semibold text-white mb-2">Something went wrong</h1>
          <p className="text-zinc-400 mb-4">Unable to load sessions</p>
          <Link href="/dashboard/communities">
            <Button variant="outline" className="border-zinc-700 text-zinc-300">
              Back to Communities
            </Button>
          </Link>
        </div>
      </div>
    );
  }
}
