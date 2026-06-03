import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCommunityAttendanceMetrics, toggleSessionRSVP } from "@/app/actions/sessions";
import {
  isToday,
  isSameMonth,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
} from "date-fns";
import {
  CommunitySessionsView,
  type SessionSummary,
} from "@/components/community/CommunitySessionsView";
import { CommunitySessionsErrorView } from "@/components/community/CommunitySessionsErrorView";

interface CommunitySessionsPageProps {
  params: Promise<{ communityId: string }>;
  searchParams: Promise<{ filter?: string; pastFilter?: string; window?: string }>;
}

interface AttendanceMetrics {
  rsvpToJoinRate: number;
  avgAttendance: number;
  completedSessions: number;
  replayRate: number;
  trend?: { avgAttendanceDelta?: number; rsvpToJoinRateDelta?: number };
}

// The shape selected from prisma.mentorSession.findMany below.
interface SessionRow {
  id: string;
  title: string;
  description: string | null;
  scheduledAt: Date;
  duration: number | null;
  status: string;
  visibility: string | null;
  slug: string | null;
  recordingUrl: string | null;
  mentorId: string;
  mentor: { id: string; name: string | null; image: string | null; username: string | null } | null;
  participations: { id: string }[];
  _count: { participations: number };
}

// Returns a translation key + tone (resolved client-side). English text lives
// in dashboard.communityAdmin.sessions.recommendation.* — not generated here.
function getAttendanceRecommendation(
  attendance: AttendanceMetrics | null | undefined
): { key: string; tone: "warning" | "positive" } | null {
  if (!attendance) return null;
  if (attendance.rsvpToJoinRate < 50) return { key: "lowRsvp", tone: "warning" };
  if (attendance.avgAttendance < 5 && attendance.completedSessions >= 3)
    return { key: "lowAttendance", tone: "warning" };
  if (attendance.replayRate < 60 && attendance.completedSessions >= 2)
    return { key: "lowReplay", tone: "warning" };
  if (
    (attendance.trend?.avgAttendanceDelta || 0) > 0 ||
    (attendance.trend?.rsvpToJoinRateDelta || 0) > 0
  )
    return { key: "momentum", tone: "positive" };
  return null;
}

const toSummary = (s: SessionRow): SessionSummary => ({
  id: s.id,
  title: s.title,
  scheduledAt: new Date(s.scheduledAt).toISOString(),
  duration: s.duration ?? null,
  status: s.status,
  visibility: s.visibility ?? null,
  slug: s.slug ?? null,
  recordingUrl: s.recordingUrl ?? null,
  mentorName: s.mentor?.name ?? null,
  isRsvped: (s.participations?.length ?? 0) > 0,
  attendeeCount: s._count?.participations ?? 0,
});

export default async function CommunitySessionsPage({
  params,
  searchParams,
}: CommunitySessionsPageProps) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      redirect("/auth/signin");
    }

    const { communityId } = await params;
    const { filter = "all", pastFilter = "all", window = "30" } = await searchParams;
    const metricWindow = ["7", "30", "90"].includes(window) ? Number(window) : 30;

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

    let allSessions: SessionRow[] = [];
    try {
      allSessions = await prisma.mentorSession.findMany({
        where: { communityId: community.id },
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
          mentor: { select: { id: true, name: true, image: true, username: true } },
          participations: { where: { userId: session.user.id }, select: { id: true } },
          _count: { select: { participations: true } },
        },
        orderBy: { scheduledAt: "asc" },
      });
    } catch (dbError) {
      console.error("Database error fetching sessions:", dbError);
    }

    const attendanceResult = await getCommunityAttendanceMetrics(communityId, metricWindow);
    const attendance = attendanceResult.success ? attendanceResult.metrics : null;
    const recommendation = getAttendanceRecommendation(attendance);
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
      (s) =>
        s.status !== "IN_PROGRESS" && !(s.status === "SCHEDULED" && new Date(s.scheduledAt) >= now)
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
    const pastPublicReplayCount = pastSorted.filter(
      (s) => Boolean(s.recordingUrl) && s.visibility === "public" && Boolean(s.slug)
    ).length;

    const thisWeek = [...liveSessions, ...upcoming].filter((s) => {
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
      allSessions.filter((s) => {
        const d = new Date(s.scheduledAt);
        return (
          d.getFullYear() === day.getFullYear() &&
          d.getMonth() === day.getMonth() &&
          d.getDate() === day.getDate()
        );
      });

    const calendarCells = calendarDays.map((day) => ({
      dayNum: day.getDate(),
      isCurrentMonth: isSameMonth(day, monthStart),
      isToday: isToday(day),
      sessions: getSessionsForDay(day).map((s) => ({
        id: s.id,
        title: s.title,
        scheduledAt: new Date(s.scheduledAt).toISOString(),
      })),
    }));

    const upcomingThisMonth = sessionsThisMonth
      .filter((s) => new Date(s.scheduledAt) >= now)
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
      .slice(0, 8)
      .map((s) => ({
        id: s.id,
        title: s.title,
        scheduledAt: new Date(s.scheduledAt).toISOString(),
        duration: s.duration ?? null,
      }));

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
      <CommunitySessionsView
        communityId={communityId}
        communityName={community.name}
        communitySlug={community.slug}
        canCreateSessions={canCreateSessions}
        totalSessions={allSessions.length}
        liveCount={liveSessions.length}
        thisWeekCount={thisWeek.length}
        upcomingTabCount={liveSessions.length + upcoming.length}
        pastTabCount={past.length}
        filter={filter}
        upcomingAllCount={upcomingAllCount}
        upcomingLiveCount={upcomingLiveCount}
        upcomingTodayCount={upcomingTodayCount}
        upcomingWeekCount={upcomingWeekCount}
        filteredUpcoming={filteredUpcoming.map(toSummary)}
        pastFilter={pastFilter}
        pastAllCount={pastAllCount}
        pastReplayCount={pastReplayCount}
        pastPublicReplayCount={pastPublicReplayCount}
        hasPast={past.length > 0}
        featuredReplays={featuredReplays.map(toSummary)}
        filteredPast={filteredPast.map(toSummary)}
        primarySession={primarySession ? toSummary(primarySession) : null}
        attendance={attendance ?? null}
        recommendation={recommendation}
        rsvpJoinTarget={rsvpJoinTarget}
        rsvpJoinProgress={rsvpJoinProgress}
        rsvpJoinGap={rsvpJoinGap}
        metricWindow={metricWindow}
        monthStart={monthStart.toISOString()}
        sessionsThisMonthCount={sessionsThisMonth.length}
        calendarCells={calendarCells}
        upcomingThisMonth={upcomingThisMonth}
        onRSVP={handleRSVP}
      />
    );
  } catch (error) {
    console.error("Error in CommunitySessionsPage:", error);
    return <CommunitySessionsErrorView />;
  }
}
