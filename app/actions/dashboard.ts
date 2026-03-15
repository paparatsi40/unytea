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
        status: { in: ["SCHEDULED", "LIVE"] },
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
        status: { in: ["SCHEDULED", "LIVE"] },
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
        communityName: s.community?.name,
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