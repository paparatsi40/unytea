"use server";

import { getCurrentUserId } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { subDays, format } from "date-fns";

// ── Session Analytics ────────────────────────────────────────────────
export async function getSessionAnalytics(communityId?: string) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return { success: false, error: "Not authenticated" };

    const ownedCommunities = await prisma.community.findMany({
      where: { ownerId: userId },
      select: { id: true },
    });
    const allIds = ownedCommunities.map((c: { id: string }) => c.id);
    if (allIds.length === 0) return { success: true, data: null };

    const communityIds =
      communityId && allIds.includes(communityId) ? [communityId] : allIds;

    const last30Days = subDays(new Date(), 30);

    // Sessions count by status
    const [total, completed, scheduled, live] = await Promise.all([
      prisma.mentorSession.count({
        where: { communityId: { in: communityIds } },
      }),
      prisma.mentorSession.count({
        where: { communityId: { in: communityIds }, status: "COMPLETED" },
      }),
      prisma.mentorSession.count({
        where: { communityId: { in: communityIds }, status: "SCHEDULED" },
      }),
      prisma.mentorSession.count({
        where: { communityId: { in: communityIds }, status: "LIVE" },
      }),
    ]);

    // Sessions per day (last 30 days) for chart
    const recentSessions = await prisma.mentorSession.findMany({
      where: {
        communityId: { in: communityIds },
        scheduledAt: { gte: last30Days },
      },
      select: { scheduledAt: true, attendeeCount: true, status: true },
      orderBy: { scheduledAt: "asc" },
    });

    const dailyMap: Record<string, { sessions: number; attendees: number }> =
      {};
    for (let i = 0; i < 30; i++) {
      const day = format(subDays(new Date(), 29 - i), "yyyy-MM-dd");
      dailyMap[day] = { sessions: 0, attendees: 0 };
    }
    for (const s of recentSessions) {
      const day = format(new Date(s.scheduledAt), "yyyy-MM-dd");
      if (dailyMap[day]) {
        dailyMap[day].sessions++;
        dailyMap[day].attendees += s.attendeeCount || 0;
      }
    }

    const dailyChart = Object.entries(dailyMap).map(([date, v]) => ({
      date,
      label: format(new Date(date), "MMM d"),
      sessions: v.sessions,
      attendees: v.attendees,
    }));

    // Average attendance
    const completedSessions = recentSessions.filter(
      (s) => s.status === "COMPLETED"
    );
    const avgAttendance =
      completedSessions.length > 0
        ? Math.round(
            completedSessions.reduce(
              (sum, s) => sum + (s.attendeeCount || 0),
              0
            ) / completedSessions.length
          )
        : 0;

    // Average rating
    const feedback = await prisma.sessionFeedback.aggregate({
      where: {
        session: { communityId: { in: communityIds } },
      },
      _avg: { rating: true },
      _count: true,
    });

    return {
      success: true,
      data: {
        total,
        completed,
        scheduled,
        live,
        avgAttendance,
        avgRating: feedback._avg.rating
          ? Number(feedback._avg.rating.toFixed(1))
          : null,
        totalFeedback: feedback._count,
        dailyChart,
      },
    };
  } catch (error) {
    console.error("[getSessionAnalytics] Error:", error);
    return { success: false, error: "Failed to fetch session analytics" };
  }
}

// ── Course Analytics ─────────────────────────────────────────────────
export async function getCourseAnalytics(communityId?: string) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return { success: false, error: "Not authenticated" };

    const ownedCommunities = await prisma.community.findMany({
      where: { ownerId: userId },
      select: { id: true },
    });
    const allIds = ownedCommunities.map((c: { id: string }) => c.id);
    if (allIds.length === 0) return { success: true, data: null };

    const communityIds =
      communityId && allIds.includes(communityId) ? [communityId] : allIds;

    // Course counts
    const courses = await prisma.course.findMany({
      where: { communityId: { in: communityIds } },
      include: {
        _count: {
          select: { enrollments: true, modules: true },
        },
        enrollments: {
          select: { progress: true, completedAt: true },
        },
      },
    });

    const totalCourses = courses.length;
    const totalEnrollments = courses.reduce(
      (sum, c) => sum + c._count.enrollments,
      0
    );
    const completedEnrollments = courses.reduce(
      (sum, c) =>
        sum + c.enrollments.filter((e: { completedAt: Date | null }) => e.completedAt !== null).length,
      0
    );
    const completionRate =
      totalEnrollments > 0
        ? Math.round((completedEnrollments / totalEnrollments) * 100)
        : 0;
    const avgProgress =
      totalEnrollments > 0
        ? Math.round(
            courses.reduce(
              (sum, c) =>
                sum +
                c.enrollments.reduce(
                  (s: number, e: { progress: number }) => s + e.progress,
                  0
                ),
              0
            ) / totalEnrollments
          )
        : 0;

    // Per-course breakdown
    const courseBreakdown = courses.map((c) => ({
      id: c.id,
      title: c.title,
      enrollments: c._count.enrollments,
      modules: c._count.modules,
      completionRate:
        c._count.enrollments > 0
          ? Math.round(
              (c.enrollments.filter((e: { completedAt: Date | null }) => e.completedAt !== null).length /
                c._count.enrollments) *
                100
            )
          : 0,
      avgProgress:
        c._count.enrollments > 0
          ? Math.round(
              c.enrollments.reduce(
                (s: number, e: { progress: number }) => s + e.progress,
                0
              ) / c._count.enrollments
            )
          : 0,
    }));

    // Enrollments over time (last 30 days)
    const last30Days = subDays(new Date(), 30);
    const recentEnrollments = await prisma.enrollment.findMany({
      where: {
        course: { communityId: { in: communityIds } },
        enrolledAt: { gte: last30Days },
      },
      select: { enrolledAt: true },
      orderBy: { enrolledAt: "asc" },
    });

    const enrollmentDailyMap: Record<string, number> = {};
    for (let i = 0; i < 30; i++) {
      const day = format(subDays(new Date(), 29 - i), "yyyy-MM-dd");
      enrollmentDailyMap[day] = 0;
    }
    for (const e of recentEnrollments) {
      const day = format(new Date(e.enrolledAt), "yyyy-MM-dd");
      if (enrollmentDailyMap[day] !== undefined) {
        enrollmentDailyMap[day]++;
      }
    }
    const enrollmentChart = Object.entries(enrollmentDailyMap).map(
      ([date, count]) => ({
        date,
        label: format(new Date(date), "MMM d"),
        enrollments: count,
      })
    );

    // Certificate count
    const certificateCount = await prisma.certificate.count({
      where: {
        enrollment: {
          course: { communityId: { in: communityIds } },
        },
      },
    });

    return {
      success: true,
      data: {
        totalCourses,
        totalEnrollments,
        completedEnrollments,
        completionRate,
        avgProgress,
        certificateCount,
        courseBreakdown,
        enrollmentChart,
      },
    };
  } catch (error) {
    console.error("[getCourseAnalytics] Error:", error);
    return { success: false, error: "Failed to fetch course analytics" };
  }
}

// ── Revenue Analytics ────────────────────────────────────────────────
export async function getRevenueAnalytics(communityId?: string) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return { success: false, error: "Not authenticated" };

    const ownedCommunities = await prisma.community.findMany({
      where: { ownerId: userId },
      select: { id: true },
    });
    const allIds = ownedCommunities.map((c: { id: string }) => c.id);
    if (allIds.length === 0) return { success: true, data: null };

    const communityIds =
      communityId && allIds.includes(communityId) ? [communityId] : allIds;

    // Paid course enrollments as revenue proxy
    const paidCourses = await prisma.course.findMany({
      where: {
        communityId: { in: communityIds },
        isPaid: true,
      },
      select: {
        id: true,
        title: true,
        price: true,
        _count: { select: { enrollments: true } },
      },
    });

    const totalRevenue = paidCourses.reduce(
      (sum, c) => sum + (c.price || 0) * c._count.enrollments,
      0
    );

    const courseRevenue = paidCourses.map((c) => ({
      title: c.title,
      price: c.price || 0,
      enrollments: c._count.enrollments,
      revenue: (c.price || 0) * c._count.enrollments,
    }));

    // Paid community memberships
    const paidMembers = await prisma.member.count({
      where: {
        communityId: { in: communityIds },
        status: "ACTIVE",
        community: { isPaid: true },
      },
    });

    const paidCommunities = await prisma.community.findMany({
      where: {
        id: { in: communityIds },
        isPaid: true,
      },
      select: {
        name: true,
        price: true,
        _count: { select: { members: true } },
      },
    });

    const membershipRevenue = paidCommunities.reduce(
      (sum, c) => sum + (c.price || 0) * c._count.members,
      0
    );

    return {
      success: true,
      data: {
        totalRevenue: totalRevenue + membershipRevenue,
        courseRevenue: totalRevenue,
        membershipRevenue,
        paidMembers,
        courseBreakdown: courseRevenue,
        communityBreakdown: paidCommunities.map((c) => ({
          name: c.name,
          price: c.price || 0,
          members: c._count.members,
          revenue: (c.price || 0) * c._count.members,
        })),
      },
    };
  } catch (error) {
    console.error("[getRevenueAnalytics] Error:", error);
    return { success: false, error: "Failed to fetch revenue analytics" };
  }
}

// ── Gamification Analytics ───────────────────────────────────────────
export async function getGamificationAnalytics(communityId?: string) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return { success: false, error: "Not authenticated" };

    const ownedCommunities = await prisma.community.findMany({
      where: { ownerId: userId },
      select: { id: true },
    });
    const allIds = ownedCommunities.map((c: { id: string }) => c.id);
    if (allIds.length === 0) return { success: true, data: null };

    const communityIds =
      communityId && allIds.includes(communityId) ? [communityId] : allIds;

    // Members with streaks
    const membersWithStreaks = await prisma.member.findMany({
      where: {
        communityId: { in: communityIds },
        status: "ACTIVE",
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            image: true,
            currentStreak: true,
            longestStreak: true,
            level: true,
            xp: true,
          },
        },
      },
      orderBy: { points: "desc" },
    });

    // Leaderboard (top 10)
    const leaderboard = membersWithStreaks.slice(0, 10).map((m) => ({
      user: {
        id: m.user.id,
        name: m.user.name,
        username: m.user.username,
        image: m.user.image,
      },
      points: m.points,
      level: m.user.level,
      xp: m.user.xp,
      streak: m.user.currentStreak,
      longestStreak: m.user.longestStreak,
    }));

    // Streak distribution
    const streakBuckets = { none: 0, "1-3": 0, "4-7": 0, "8-30": 0, "30+": 0 };
    for (const m of membersWithStreaks) {
      const s = m.user.currentStreak;
      if (s === 0) streakBuckets.none++;
      else if (s <= 3) streakBuckets["1-3"]++;
      else if (s <= 7) streakBuckets["4-7"]++;
      else if (s <= 30) streakBuckets["8-30"]++;
      else streakBuckets["30+"]++;
    }

    // Level distribution
    const levelBuckets: Record<string, number> = {};
    for (const m of membersWithStreaks) {
      const bucket = `Lvl ${Math.floor(m.user.level / 5) * 5}-${Math.floor(m.user.level / 5) * 5 + 4}`;
      levelBuckets[bucket] = (levelBuckets[bucket] || 0) + 1;
    }

    // Achievements unlocked count
    const achievementCount = await prisma.userAchievement.count({
      where: {
        user: {
          memberships: {
            some: { communityId: { in: communityIds } },
          },
        },
      },
    });

    return {
      success: true,
      data: {
        leaderboard,
        streakDistribution: Object.entries(streakBuckets).map(
          ([range, count]) => ({ range, count })
        ),
        levelDistribution: Object.entries(levelBuckets).map(
          ([range, count]) => ({ range, count })
        ),
        totalAchievements: achievementCount,
        avgStreak:
          membersWithStreaks.length > 0
            ? Math.round(
                membersWithStreaks.reduce(
                  (sum, m) => sum + m.user.currentStreak,
                  0
                ) / membersWithStreaks.length
              )
            : 0,
      },
    };
  } catch (error) {
    console.error("[getGamificationAnalytics] Error:", error);
    return { success: false, error: "Failed to fetch gamification analytics" };
  }
}
