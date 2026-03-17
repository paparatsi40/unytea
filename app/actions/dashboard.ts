"use server";

import { getCurrentUserId } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";

/**
 * Get dashboard metrics optimized for growth:
 * - Communities count
 * - Total members
 * - Sessions this week
 * - Engagement metrics
 */
export async function getDashboardMetrics() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    // Get user's communities
    const communities = await prisma.community.findMany({
      where: {
        members: {
          some: {
            userId: userId,
            role: { in: ["ADMIN", "OWNER", "MODERATOR"] },
          },
        },
      },
      include: {
        _count: {
          select: { members: true },
        },
      },
    });

    const communityIds = communities.map((c) => c.id);

    // Get sessions this week
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const sessionsThisWeek = await prisma.mentorSession.count({
      where: {
        OR: [
          { mentorId: userId },
          { communityId: { in: communityIds } },
        ],
        scheduledAt: {
          gte: weekStart,
        },
      },
    });

    // Get total members across all communities
    const totalMembers = communities.reduce(
      (sum, c) => sum + c._count.members,
      0
    );

    // Get new members this week
    const newMembersThisWeek = await prisma.member.count({
      where: {
        communityId: { in: communityIds },
        joinedAt: {
          gte: weekStart,
        },
      },
    });

    // Get average attendance rate (from completed sessions)
    const completedSessions = await prisma.mentorSession.findMany({
      where: {
        OR: [
          { mentorId: userId },
          { communityId: { in: communityIds } },
        ],
        status: "COMPLETED",
      },
      select: {
        attendeeCount: true,
        participations: {
          select: { id: true },
        },
      },
      take: 10,
      orderBy: { endedAt: "desc" },
    });

    let avgAttendance = 0;
    if (completedSessions.length > 0) {
      const totalAttendance = completedSessions.reduce(
        (sum, s) => sum + (s.attendeeCount || s.participations.length || 0),
        0
      );
      avgAttendance = Math.round(totalAttendance / completedSessions.length);
    }

    return {
      success: true,
      metrics: {
        communities: communities.length,
        members: totalMembers,
        newMembersThisWeek,
        sessionsThisWeek,
        avgAttendanceRate: avgAttendance,
      },
    };
  } catch (error) {
    console.error("Error getting dashboard metrics:", error);
    return { success: false, error: "Failed to load metrics" };
  }
}

/**
 * Get next upcoming live session
 */
export async function getNextLiveSession() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    const now = new Date();

    const nextSession = await prisma.mentorSession.findFirst({
      where: {
        OR: [
          { mentorId: userId },
          {
            community: {
              members: {
                some: {
                  userId: userId,
                  role: { in: ["ADMIN", "OWNER", "MODERATOR"] },
                },
              },
            },
          },
        ],
        scheduledAt: {
          gte: now,
        },
        status: { in: ["SCHEDULED", "IN_PROGRESS"] },
      },
      include: {
        mentor: { select: { id: true, name: true, image: true } },
        community: { select: { id: true, name: true, slug: true } },
        participations: {
          select: { id: true },
        },
        series: { select: { id: true, title: true } },
      },
      orderBy: { scheduledAt: "asc" },
    });

    if (!nextSession) {
      return { success: true, session: null };
    }

    return {
      success: true,
      session: {
        id: nextSession.id,
        title: nextSession.title,
        slug: nextSession.slug,
        description: nextSession.description,
        scheduledAt: nextSession.scheduledAt,
        duration: nextSession.duration,
        status: nextSession.status,
        mode: nextSession.mode,
        mentor: nextSession.mentor,
        community: nextSession.community,
        series: nextSession.series,
        attendeeCount: nextSession.participations.length,
        roomId: nextSession.roomId,
      },
    };
  } catch (error) {
    console.error("Error getting next session:", error);
    return { success: false, error: "Failed to load session" };
  }
}

/**
 * Get upcoming sessions list
 */
export async function getUpcomingSessions(limit: number = 5) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    const now = new Date();

    const sessions = await prisma.mentorSession.findMany({
      where: {
        OR: [
          { mentorId: userId },
          {
            community: {
              members: {
                some: {
                  userId: userId,
                  role: { in: ["ADMIN", "OWNER", "MODERATOR"] },
                },
              },
            },
          },
        ],
        scheduledAt: {
          gte: now,
        },
        status: { in: ["SCHEDULED", "IN_PROGRESS"] },
      },
      include: {
        mentor: { select: { id: true, name: true } },
        community: { select: { id: true, name: true } },
        participations: {
          select: { id: true },
        },
      },
      orderBy: { scheduledAt: "asc" },
      take: limit,
    });

    return {
      success: true,
      sessions: sessions.map((s) => ({
        id: s.id,
        title: s.title,
        slug: s.slug,
        scheduledAt: s.scheduledAt,
        duration: s.duration,
        status: s.status,
        mentorName: s.mentor?.name,
        communityName: s.community?.name ?? null,
        attendeeCount: s.participations.length,
      })),
    };
  } catch (error) {
    console.error("Error getting upcoming sessions:", error);
    return { success: false, error: "Failed to load sessions" };
  }
}

/**
 * Get recent community activity
 */
export async function getCommunityActivity(limit: number = 6) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    // Get user's communities
    const userCommunities = await prisma.member.findMany({
      where: { userId },
      select: { communityId: true },
    });
    const communityIds = userCommunities.map((m) => m.communityId);

    // Get recent members
    const recentMembers = await prisma.member.findMany({
      where: { communityId: { in: communityIds } },
      include: {
        user: { select: { id: true, name: true, image: true } },
        community: { select: { id: true, name: true } },
      },
      orderBy: { joinedAt: "desc" },
      take: 3,
    });

    // Get recent posts
    const recentPosts = await prisma.post.findMany({
      where: { communityId: { in: communityIds } },
      include: {
        author: { select: { id: true, name: true } },
        community: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 3,
    });

    // Get recent completed sessions with recordings
    const recentSessions = await prisma.mentorSession.findMany({
      where: {
        communityId: { in: communityIds },
        status: "COMPLETED",
        recording: { isNot: null },
      },
      include: {
        mentor: { select: { name: true } },
        community: { select: { name: true } },
      },
      orderBy: { endedAt: "desc" },
      take: 2,
    });

    // Combine and format activities
    const activities = [
      ...recentMembers.map((m) => ({
        id: `member-${m.id}`,
        type: "member_joined" as const,
        userName: m.user.name || "Someone",
        communityName: m.community.name ?? null,
        time: m.joinedAt,
        message: `${m.user.name || "Someone"} joined ${m.community.name || "a community"}`,
      })),
      ...recentPosts.map((p) => ({
        id: `post-${p.id}`,
        type: "post_created" as const,
        userName: p.author.name || "Someone",
        communityName: p.community.name ?? null,
        time: p.createdAt,
        message: `${p.author.name || "Someone"} posted in ${p.community.name || "a community"}`,
      })),
      ...recentSessions.map((s) => ({
        id: `session-${s.id}`,
        type: "recording_ready" as const,
        userName: s.mentor?.name || "Host",
        communityName: s.community?.name ?? null,
        time: s.endedAt || s.updatedAt,
        message: `Recording ready: ${s.title}`,
      })),
    ]
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      .slice(0, limit);

    return {
      success: true,
      activities,
    };
  } catch (error) {
    console.error("Error getting community activity:", error);
    return { success: false, error: "Failed to load activity" };
  }
}

/**
 * Get recent members for social proof
 */
export async function getRecentMembers(limit: number = 4) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    const userCommunities = await prisma.member.findMany({
      where: { userId },
      select: { communityId: true },
    });
    const communityIds = userCommunities.map((m) => m.communityId);

    const members = await prisma.member.findMany({
      where: { communityId: { in: communityIds } },
      include: {
        user: { select: { id: true, name: true, image: true } },
        community: { select: { name: true } },
      },
      orderBy: { joinedAt: "desc" },
      take: limit,
    });

    return {
      success: true,
      members: members.map((m) => ({
        id: m.id,
        name: m.user.name || "Anonymous",
        image: m.user.image,
        communityName: m.community.name,
        joinedAt: m.joinedAt,
      })),
    };
  } catch (error) {
    console.error("Error getting recent members:", error);
    return { success: false, error: "Failed to load members" };
  }
}

/**
 * Get community performance snapshot
 */
export async function getPerformanceSnapshot() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    const userCommunities = await prisma.member.findMany({
      where: { userId },
      select: { communityId: true },
    });
    const communityIds = userCommunities.map((m) => m.communityId);

    // Get week date range
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);

    // Sessions hosted
    const sessionsHosted = await prisma.mentorSession.count({
      where: {
        OR: [
          { mentorId: userId },
          { communityId: { in: communityIds } },
        ],
        startedAt: {
          gte: weekStart,
        },
      },
    });

    // Posts this week
    const postsThisWeek = await prisma.post.count({
      where: {
        communityId: { in: communityIds },
        createdAt: {
          gte: weekStart,
        },
      },
    });

    // New members this week
    const newMembersThisWeek = await prisma.member.count({
      where: {
        communityId: { in: communityIds },
        joinedAt: {
          gte: weekStart,
        },
      },
    });

    // Calculate growth percentage
    const previousWeekStart = new Date(weekStart);
    previousWeekStart.setDate(previousWeekStart.getDate() - 7);

    const previousMembers = await prisma.member.count({
      where: {
        communityId: { in: communityIds },
        joinedAt: {
          gte: previousWeekStart,
          lt: weekStart,
        },
      },
    });

    const growthRate =
      previousMembers === 0
        ? 100
        : Math.round(
            ((newMembersThisWeek - previousMembers) / previousMembers) * 100
          );

    return {
      success: true,
      snapshot: {
        sessionsHosted,
        postsThisWeek,
        newMembersThisWeek,
        growthRate,
      },
    };
  } catch (error) {
    console.error("Error getting performance snapshot:", error);
    return { success: false, error: "Failed to load snapshot" };
  }
}

export async function getHostAnalyticsV1() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    const hostMemberships = await prisma.member.findMany({
      where: {
        userId,
        role: { in: ["OWNER", "ADMIN", "MODERATOR"] },
      },
      select: { communityId: true },
    });

    const communityIds = hostMemberships.map((m) => m.communityId);

    const completedSessionWhere = {
      OR: [{ mentorId: userId }, { communityId: { in: communityIds } }],
      status: "COMPLETED" as const,
    };

    const [sessionsHosted, completedSessions, recordingReadyCount, recordingViews, activeMembers] =
      await Promise.all([
        prisma.mentorSession.count({ where: completedSessionWhere }),
        prisma.mentorSession.findMany({
          where: completedSessionWhere,
          select: {
            attendeeCount: true,
            participations: {
              select: {
                id: true,
                eventsData: true,
              },
            },
          },
          take: 50,
          orderBy: { endedAt: "desc" },
        }),
        prisma.recording.count({
          where: {
            status: "READY",
            session: {
              OR: [{ mentorId: userId }, { communityId: { in: communityIds } }],
            },
          },
        }),
        prisma.post.aggregate({
          where: {
            communityId: { in: communityIds },
            contentType: "SESSION_ANNOUNCEMENT",
          },
          _sum: { viewCount: true },
        }),
        prisma.sessionParticipation.findMany({
          where: {
            createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
            session: {
              communityId: { in: communityIds },
            },
          },
          distinct: ["userId"],
          select: { userId: true },
        }),
      ]);

    const avgAttendance = completedSessions.length
      ? Math.round(
          completedSessions.reduce(
            (sum, s) => sum + (s.attendeeCount || s.participations.length || 0),
            0
          ) / completedSessions.length
        )
      : 0;

    const totalRsvps = completedSessions.reduce((sum, session) => {
      const count = session.participations.filter((p: any) => {
        const data = (p.eventsData || {}) as Record<string, unknown>;
        return data.rsvp === true || data.rsvpStatus === "attending";
      }).length;
      return sum + count;
    }, 0);

    const totalAttended = completedSessions.reduce(
      (sum, s) => sum + (s.attendeeCount || s.participations.length || 0),
      0
    );

    const rsvpToAttendanceRate = totalRsvps > 0 ? Math.round((totalAttended / totalRsvps) * 100) : 0;

    return {
      success: true,
      analytics: {
        sessionsHosted,
        avgAttendance,
        rsvpToAttendanceRate,
        recordingViews: recordingViews._sum.viewCount || 0,
        activeMembers: activeMembers.length,
        recordingsReady: recordingReadyCount,
      },
    };
  } catch (error) {
    console.error("Error getting host analytics v1:", error);
    return { success: false, error: "Failed to load host analytics" };
  }
}

export async function getNextRecommendedAction() {
  try {
    const [metricsRes, nextSessionRes, hostAnalyticsRes] = await Promise.all([
      getDashboardMetrics(),
      getNextLiveSession(),
      getHostAnalyticsV1(),
    ]);

    if (!metricsRes.success) {
      return { success: false, error: "Failed to evaluate recommendation" };
    }

    const metrics = metricsRes.metrics!;
    const hostAnalytics = hostAnalyticsRes.success ? hostAnalyticsRes.analytics : null;

    if (metrics.communities === 0) {
      return {
        success: true,
        recommendation: {
          title: "Create your first community",
          description: "Start your network layer by launching a focused community hub.",
          href: "/dashboard/communities/new",
          cta: "Create community",
          priority: "high",
        },
      };
    }

    if (!nextSessionRes.success || !nextSessionRes.session) {
      return {
        success: true,
        recommendation: {
          title: "Schedule your next live session",
          description: "Consistency drives attendance. Publish the next live now.",
          href: "/dashboard/sessions/create",
          cta: "Schedule session",
          priority: "high",
        },
      };
    }

    if ((hostAnalytics?.recordingsReady || 0) > 0 && (hostAnalytics?.recordingViews || 0) < 25) {
      return {
        success: true,
        recommendation: {
          title: "Boost replay distribution",
          description: "Your recordings are ready—share recap posts to increase replay views.",
          href: "/dashboard/recordings",
          cta: "Promote recordings",
          priority: "medium",
        },
      };
    }

    if ((hostAnalytics?.activeMembers || 0) < 5) {
      return {
        success: true,
        recommendation: {
          title: "Activate more members this week",
          description: "Invite inactive members to the next live and encourage RSVP.",
          href: "/dashboard/communities",
          cta: "Invite members",
          priority: "medium",
        },
      };
    }

    return {
      success: true,
      recommendation: {
        title: "Keep momentum with a themed session",
        description: "You are trending well—launch a focused topic session this week.",
        href: "/dashboard/sessions/create",
        cta: "Create themed session",
        priority: "low",
      },
    };
  } catch (error) {
    console.error("Error getting next recommended action:", error);
    return { success: false, error: "Failed to load recommendation" };
  }
}

export async function getHostAlerts() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    const now = new Date();
    const in14Days = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const communities = await prisma.community.findMany({
      where: { ownerId: userId },
      select: { id: true, name: true, slug: true },
      orderBy: { createdAt: "desc" },
    });

    const alerts: Array<{
      type: "warning" | "info";
      title: string;
      description: string;
      href: string;
      cta: string;
      priority: "high" | "medium" | "low";
      communityName?: string;
    }> = [];

    const avg = (rows: Array<{ attendeeCount: number; participations: { id: string }[] }>) => {
      if (!rows.length) return 0;
      return (
        rows.reduce((sum, s) => sum + (s.attendeeCount || s.participations.length || 0), 0) /
        rows.length
      );
    };

    for (const community of communities) {
      const [upcomingCount, recentSessions, previousSessions, completedLast30Days] = await Promise.all([
        prisma.mentorSession.count({
          where: {
            mentorId: userId,
            communityId: community.id,
            status: { in: ["SCHEDULED", "IN_PROGRESS"] },
            scheduledAt: { gte: now, lte: in14Days },
          },
        }),
        prisma.mentorSession.findMany({
          where: { mentorId: userId, communityId: community.id, status: "COMPLETED" },
          select: { attendeeCount: true, participations: { select: { id: true } } },
          orderBy: { endedAt: "desc" },
          take: 3,
        }),
        prisma.mentorSession.findMany({
          where: { mentorId: userId, communityId: community.id, status: "COMPLETED" },
          select: { attendeeCount: true, participations: { select: { id: true } } },
          orderBy: { endedAt: "desc" },
          skip: 3,
          take: 3,
        }),
        prisma.mentorSession.count({
          where: {
            mentorId: userId,
            communityId: community.id,
            status: "COMPLETED",
            endedAt: { gte: last30Days },
          },
        }),
      ]);

      if (upcomingCount === 0) {
        alerts.push({
          type: "warning",
          title: "No upcoming sessions",
          description: `No live sessions in the next 14 days for ${community.name}.`,
          href: "/dashboard/sessions/create",
          cta: "Schedule now",
          priority: "high",
          communityName: community.name,
        });
      }

      const recentAvg = avg(recentSessions);
      const previousAvg = avg(previousSessions);
      if (previousAvg > 0 && recentAvg < previousAvg * 0.7) {
        const dropPct = Math.round(((previousAvg - recentAvg) / previousAvg) * 100);
        alerts.push({
          type: "warning",
          title: "Attendance trending down",
          description: `${community.name} dropped ${dropPct}% vs previous sessions.`,
          href: "/dashboard/analytics",
          cta: "Review analytics",
          priority: "medium",
          communityName: community.name,
        });
      }

      if (completedLast30Days === 0) {
        alerts.push({
          type: "info",
          title: "No completed sessions in 30 days",
          description: `Run a session in ${community.name} to reactivate momentum.`,
          href: "/dashboard/sessions/create",
          cta: "Create session",
          priority: "low",
          communityName: community.name,
        });
      }
    }

    const priorityRank = { high: 3, medium: 2, low: 1 } as const;
    const ordered = alerts
      .sort((a, b) => {
        const p = priorityRank[b.priority] - priorityRank[a.priority];
        if (p !== 0) return p;
        if (a.type !== b.type) return a.type === "warning" ? -1 : 1;
        return a.title.localeCompare(b.title);
      })
      .slice(0, 4);

    if (ordered.length === 0) {
      ordered.push({
        type: "info",
        title: "No urgent alerts",
        description: "Your session cadence and attendance look healthy this week.",
        href: "/dashboard/sessions",
        cta: "View sessions",
        priority: "low",
      });
    }

    return { success: true, alerts: ordered };
  } catch (error) {
    console.error("Error getting host alerts:", error);
    return { success: false, error: "Failed to load host alerts" };
  }
}

export async function getCommunityOSSnapshot() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);

    const hostCommunities = await prisma.member.findMany({
      where: { userId, role: { in: ["OWNER", "ADMIN", "MODERATOR"] } },
      select: { communityId: true },
    });

    const communityIds = hostCommunities.map((m) => m.communityId);

    const [weeklySessions, questionsSubmitted, recapPosts, recordingViews] = await Promise.all([
      prisma.mentorSession.findMany({
        where: {
          communityId: { in: communityIds },
          status: "SCHEDULED",
          scheduledAt: { gte: weekStart, lt: weekEnd },
        },
        orderBy: { scheduledAt: "asc" },
        select: {
          id: true,
          title: true,
          scheduledAt: true,
          series: {
            select: { title: true, frequency: true, dayOfWeek: true, startTime: true },
          },
        },
      }),
      prisma.post.count({
        where: {
          communityId: { in: communityIds },
          contentType: "QUESTION",
          createdAt: { gte: weekStart, lt: weekEnd },
        },
      }),
      prisma.post.count({
        where: {
          communityId: { in: communityIds },
          contentType: "SESSION_ANNOUNCEMENT",
          createdAt: { gte: weekStart, lt: weekEnd },
        },
      }),
      prisma.post.aggregate({
        where: {
          communityId: { in: communityIds },
          contentType: "SESSION_ANNOUNCEMENT",
          createdAt: { gte: weekStart, lt: weekEnd },
        },
        _sum: { viewCount: true },
      }),
    ]);

    const weeklyProgram = weeklySessions.slice(0, 6).map((s) => ({
      id: s.id,
      title: s.title,
      scheduledAt: s.scheduledAt,
      seriesTitle: s.series?.title || null,
      seriesFrequency: s.series?.frequency || null,
      seriesDayOfWeek: s.series?.dayOfWeek ?? null,
      seriesStartTime: s.series?.startTime || null,
    }));

    const checklist = {
      plan: weeklySessions.length > 0,
      promote: questionsSubmitted > 0,
      host: false,
      capture: recapPosts > 0,
      reuse: (recordingViews._sum.viewCount || 0) > 0,
    };

    return {
      success: true,
      snapshot: {
        weeklyProgram,
        stats: {
          sessionsScheduled: weeklySessions.length,
          questionsSubmitted,
          recapPosts,
          recordingViews: recordingViews._sum.viewCount || 0,
        },
        checklist,
      },
    };
  } catch (error) {
    console.error("Error getting community OS snapshot:", error);
    return { success: false, error: "Failed to load community OS snapshot" };
  }
}

export async function getMemberLeaderboard(limit: number = 5) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    const hostCommunities = await prisma.member.findMany({
      where: {
        userId,
        role: { in: ["OWNER", "ADMIN", "MODERATOR"] },
      },
      select: { communityId: true },
    });

    const communityIds = hostCommunities.map((m) => m.communityId);
    if (communityIds.length === 0) {
      return { success: true, contributors: [], attendees: [] };
    }

    const [contributorsRaw, attendeesRaw] = await Promise.all([
      prisma.member.findMany({
        where: { communityId: { in: communityIds }, status: "ACTIVE" },
        select: {
          userId: true,
          points: true,
          user: { select: { name: true, image: true } },
        },
        orderBy: { points: "desc" },
        take: limit,
      }),
      prisma.sessionParticipation.groupBy({
        by: ["userId"],
        where: {
          session: { communityId: { in: communityIds } },
        },
        _count: { userId: true },
        orderBy: { _count: { userId: "desc" } },
        take: limit,
      }),
    ]);

    const attendeeUsers = await prisma.user.findMany({
      where: { id: { in: attendeesRaw.map((a) => a.userId) } },
      select: { id: true, name: true, image: true },
    });
    const attendeeMap = new Map(attendeeUsers.map((u) => [u.id, u]));

    return {
      success: true,
      contributors: contributorsRaw.map((m) => ({
        userId: m.userId,
        name: m.user.name || "Member",
        image: m.user.image,
        score: m.points,
      })),
      attendees: attendeesRaw.map((a) => ({
        userId: a.userId,
        name: attendeeMap.get(a.userId)?.name || "Member",
        image: attendeeMap.get(a.userId)?.image || null,
        score: a._count.userId,
      })),
    };
  } catch (error) {
    console.error("Error getting member leaderboard:", error);
    return { success: false, error: "Failed to load leaderboard" };
  }
}