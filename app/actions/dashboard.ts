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

export async function getActivationEngineSnapshot() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return { success: false, error: "Unauthorized" };

    const now = new Date();
    const in14Days = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    const activeMemberships = await prisma.member.findMany({
      where: { userId, status: "ACTIVE" },
      select: { communityId: true },
    });

    const communityIds = activeMemberships.map((m) => m.communityId);

    const [user, firstAttendance, nextSession] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { createdAt: true } }),
      prisma.sessionParticipation.findFirst({
        where: {
          userId,
          session: { status: "COMPLETED" },
        },
        orderBy: { createdAt: "asc" },
        include: {
          session: {
            select: {
              id: true,
              endedAt: true,
            },
          },
        },
      }),
      communityIds.length
        ? prisma.mentorSession.findFirst({
            where: {
              communityId: { in: communityIds },
              status: "SCHEDULED",
              scheduledAt: { gte: now, lte: in14Days },
            },
            orderBy: { scheduledAt: "asc" },
            select: {
              id: true,
              title: true,
              slug: true,
              scheduledAt: true,
              community: { select: { name: true, slug: true } },
              _count: {
                select: {
                  participations: true,
                },
              },
            },
          })
        : Promise.resolve(null),
    ]);

    const hasAttendedFirstSession = !!firstAttendance;
    const timeToFirstSessionHours =
      firstAttendance?.session?.endedAt && user?.createdAt
        ? Math.max(
            0,
            Math.round(
              (new Date(firstAttendance.session.endedAt).getTime() -
                new Date(user.createdAt).getTime()) /
                (1000 * 60 * 60)
            )
          )
        : null;

    let rsvpStatus: "attending" | "interested" | null = null;
    if (nextSession) {
      const participation = await prisma.sessionParticipation.findUnique({
        where: {
          sessionId_userId: {
            userId,
            sessionId: nextSession.id,
          },
        },
        select: { eventsData: true },
      });

      const rawStatus =
        participation?.eventsData &&
        typeof participation.eventsData === "object" &&
        !Array.isArray(participation.eventsData)
          ? (participation.eventsData as Record<string, unknown>).rsvpStatus
          : null;

      if (rawStatus === "attending") rsvpStatus = "attending";
      if (rawStatus === "interested") rsvpStatus = "interested";
    }

    const missedSession =
      !hasAttendedFirstSession && communityIds.length
        ? await prisma.mentorSession.findFirst({
            where: {
              communityId: { in: communityIds },
              status: "COMPLETED",
              endedAt: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) },
              recording: { isNot: null },
            },
            orderBy: { endedAt: "desc" },
            select: {
              id: true,
              title: true,
              slug: true,
              community: { select: { slug: true } },
            },
          })
        : null;

    const nextSessionPayload = nextSession
      ? {
          id: nextSession.id,
          title: nextSession.title,
          scheduledAt: nextSession.scheduledAt,
          communityName: nextSession.community?.name || "Community",
          communitySlug: nextSession.community?.slug || "",
          attendingCount: nextSession._count.participations,
        }
      : null;

    return {
      success: true,
      activation: {
        hasAttendedFirstSession,
        timeToFirstSessionHours,
        target24h: hasAttendedFirstSession
          ? (timeToFirstSessionHours ?? 999) <= 24
          : false,
        nextSession: nextSessionPayload,
        rsvpStatus,
        missedSession,
      },
    };
  } catch (error) {
    console.error("Error getting activation engine snapshot:", error);
    return { success: false, error: "Failed to load activation snapshot" };
  }
}

export async function getUserIdentitySnapshot(limitCommunities: number = 6) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    const now = new Date();

    const [user, memberships, sessionsAttended, sessionsHosted, postsCreated, commentsCreated] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          username: true,
          email: true,
          image: true,
          bio: true,
          tagline: true,
          interests: true,
          skills: true,
          location: true,
          createdAt: true,
        },
      }),
      prisma.member.findMany({
        where: { userId, status: "ACTIVE" },
        include: {
          community: {
            select: {
              id: true,
              name: true,
              slug: true,
              imageUrl: true,
              isPaid: true,
              _count: { select: { members: true } },
              sessions: {
                where: {
                  status: "SCHEDULED",
                  scheduledAt: { gte: now },
                },
                orderBy: { scheduledAt: "asc" },
                take: 1,
                select: {
                  id: true,
                  title: true,
                  scheduledAt: true,
                },
              },
            },
          },
        },
        orderBy: { joinedAt: "desc" },
        take: limitCommunities,
      }),
      prisma.sessionParticipation.count({
        where: {
          userId,
        },
      }),
      prisma.mentorSession.count({
        where: {
          mentorId: userId,
          status: "COMPLETED",
        },
      }),
      prisma.post.count({ where: { authorId: userId } }),
      prisma.comment.count({ where: { authorId: userId } }),
    ]);

    if (!user) {
      return { success: false, error: "User not found" };
    }

    const joinedCommunities = memberships.map((m) => ({
      membershipId: m.id,
      role: m.role,
      joinedAt: m.joinedAt,
      community: {
        id: m.community.id,
        name: m.community.name,
        slug: m.community.slug,
        imageUrl: m.community.imageUrl,
        isPaid: m.community.isPaid,
        membersCount: m.community._count.members,
        nextSession: m.community.sessions[0] || null,
      },
    }));

    return {
      success: true,
      identity: {
        user,
        stats: {
          communitiesJoined: joinedCommunities.length,
          sessionsAttended,
          sessionsHosted,
          contributions: postsCreated + commentsCreated,
        },
        communities: joinedCommunities,
      },
    };
  } catch (error) {
    console.error("Error getting user identity snapshot:", error);
    return { success: false, error: "Failed to load user identity" };
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

export async function getHostScoreSystem() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    const now = new Date();
    const last14Days = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const next14Days = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    const hostMemberships = await prisma.member.findMany({
      where: {
        userId,
        role: { in: ["OWNER", "ADMIN", "MODERATOR"] },
      },
      select: { communityId: true },
    });

    const communityIds = hostMemberships.map((m) => m.communityId);

    const [completedSessions, upcomingSessions, recentPosts, recentComments, recapPosts, resourcesAdded] =
      await Promise.all([
        prisma.mentorSession.findMany({
          where: {
            OR: [{ mentorId: userId }, { communityId: { in: communityIds } }],
            status: "COMPLETED",
            endedAt: { gte: last14Days },
          },
          select: {
            attendeeCount: true,
            participations: {
              select: { eventsData: true, id: true },
            },
          },
        }),
        prisma.mentorSession.count({
          where: {
            OR: [{ mentorId: userId }, { communityId: { in: communityIds } }],
            status: "SCHEDULED",
            scheduledAt: { gte: now, lte: next14Days },
          },
        }),
        prisma.post.count({
          where: {
            communityId: { in: communityIds },
            createdAt: { gte: last7Days },
          },
        }),
        prisma.comment.count({
          where: {
            post: {
              communityId: { in: communityIds },
            },
            createdAt: { gte: last7Days },
          },
        }),
        prisma.post.count({
          where: {
            communityId: { in: communityIds },
            contentType: "SESSION_ANNOUNCEMENT",
            createdAt: { gte: last14Days },
          },
        }),
        prisma.sessionResource.count({
          where: {
            session: {
              OR: [{ mentorId: userId }, { communityId: { in: communityIds } }],
            },
            createdAt: { gte: last14Days },
          },
        }),
      ]);

    const sessionsCount = completedSessions.length;
    const cadenceScore = Math.max(0, Math.min(100, Math.round((sessionsCount / 3) * 100)));

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
    const attendanceScore = Math.max(0, Math.min(100, rsvpToAttendanceRate));

    const engagementEvents = recentPosts + recentComments;
    const engagementScore = Math.max(0, Math.min(100, Math.round((engagementEvents / 20) * 100)));

    const consistencyRaw = Math.round((upcomingSessions / 2) * 100);
    const consistencyScore = Math.max(0, Math.min(100, consistencyRaw));

    const contentUnits = recapPosts + resourcesAdded;
    const contentScore = Math.max(0, Math.min(100, Math.round((contentUnits / 6) * 100)));

    const hostScore = Math.round(
      cadenceScore * 0.25 +
      attendanceScore * 0.25 +
      engagementScore * 0.2 +
      consistencyScore * 0.15 +
      contentScore * 0.15
    );

    const level = hostScore >= 85 ? "Elite" : hostScore >= 70 ? "Strong" : hostScore >= 50 ? "Growing" : "At risk";

    const components = [
      { key: "cadence", label: "Cadence", score: cadenceScore, href: "/dashboard/sessions/create" },
      { key: "attendance", label: "Attendance", score: attendanceScore, href: "/dashboard/sessions" },
      { key: "engagement", label: "Engagement", score: engagementScore, href: "/dashboard/communities" },
      { key: "consistency", label: "Consistency", score: consistencyScore, href: "/dashboard/sessions/create" },
      { key: "content", label: "Content Reuse", score: contentScore, href: "/dashboard/knowledge-library" },
    ];

    const weakest = [...components].sort((a, b) => a.score - b.score).slice(0, 2);

    const actions = weakest.map((item) => {
      if (item.key === "cadence") {
        return {
          title: "Schedule 2 sessions for next week",
          description: "Communities that schedule ahead keep attendance stable.",
          href: "/dashboard/sessions/create",
          cta: "Schedule sessions",
        };
      }
      if (item.key === "attendance") {
        return {
          title: "Push RSVP + reminders",
          description: "Set clear session titles and remind members 24h/1h/10m before live.",
          href: "/dashboard/sessions",
          cta: "Improve attendance",
        };
      }
      if (item.key === "engagement") {
        return {
          title: "Post one discussion prompt",
          description: "Ask one question in feed before each live session.",
          href: "/dashboard/communities",
          cta: "Post in feed",
        };
      }
      if (item.key === "content") {
        return {
          title: "Publish recap to library",
          description: "Turn last session into reusable content this week.",
          href: "/dashboard/knowledge-library",
          cta: "Publish recap",
        };
      }
      return {
        title: "Create a weekly rhythm",
        description: "Set a fixed weekly slot to increase habit and predictability.",
        href: "/dashboard/sessions/create",
        cta: "Set weekly slot",
      };
    });

    return {
      success: true,
      hostScore,
      level,
      summary: {
        completedSessions: sessionsCount,
        rsvpToAttendanceRate,
        engagementEvents,
        upcomingSessions,
        contentUnits,
      },
      components,
      actions,
    };
  } catch (error) {
    console.error("Error getting host score system:", error);
    return { success: false, error: "Failed to load host score" };
  }
}

export async function getHostGamificationSnapshot() {
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

    const hostMemberships = await prisma.member.findMany({
      where: {
        userId,
        role: { in: ["OWNER", "ADMIN", "MODERATOR"] },
      },
      select: { communityId: true },
    });

    const communityIds = hostMemberships.map((m) => m.communityId);

    const completedWhere = {
      OR: [{ mentorId: userId }, { communityId: { in: communityIds } }],
      status: "COMPLETED" as const,
    };

    const [completedSessions, weeklyCompletedSessions, weeklyAttendedSessions, weeklyDiscussionPosts, activeMembers] =
      await Promise.all([
        prisma.mentorSession.findMany({
          where: completedWhere,
          select: {
            id: true,
            endedAt: true,
            attendeeCount: true,
            participations: { select: { id: true } },
          },
          orderBy: { endedAt: "desc" },
          take: 200,
        }),
        prisma.mentorSession.count({
          where: {
            ...completedWhere,
            endedAt: { gte: weekStart, lt: weekEnd },
          },
        }),
        prisma.mentorSession.findMany({
          where: {
            ...completedWhere,
            endedAt: { gte: weekStart, lt: weekEnd },
          },
          select: {
            attendeeCount: true,
            participations: { select: { id: true } },
          },
        }),
        prisma.post.count({
          where: {
            authorId: userId,
            communityId: { in: communityIds },
            createdAt: { gte: weekStart, lt: weekEnd },
          },
        }),
        prisma.member.count({
          where: {
            communityId: { in: communityIds },
            status: "ACTIVE",
          },
        }),
      ]);

    const getWeekKey = (date: Date) => {
      const d = new Date(date);
      d.setDate(d.getDate() - d.getDay());
      d.setHours(0, 0, 0, 0);
      return d.toISOString();
    };

    const activeWeeks = new Set(
      completedSessions
        .map((s) => s.endedAt)
        .filter((d): d is Date => !!d)
        .map((d) => getWeekKey(d))
    );

    let streakWeeks = 0;
    const cursor = new Date(weekStart);
    for (let i = 0; i < 52; i++) {
      if (!activeWeeks.has(cursor.toISOString())) break;
      streakWeeks += 1;
      cursor.setDate(cursor.getDate() - 7);
    }

    const totalSessionsHosted = completedSessions.length;
    const totalAttendees = completedSessions.reduce(
      (sum, s) => sum + (s.attendeeCount || s.participations.length || 0),
      0
    );

    const weeklyAttendees = weeklyAttendedSessions.reduce(
      (sum, s) => sum + (s.attendeeCount || s.participations.length || 0),
      0
    );

    const milestones = [
      {
        key: "first_session",
        label: "First session hosted",
        target: 1,
        current: totalSessionsHosted,
      },
      {
        key: "sessions_10",
        label: "10 sessions hosted",
        target: 10,
        current: totalSessionsHosted,
      },
      {
        key: "attendees_100",
        label: "100 total attendees",
        target: 100,
        current: totalAttendees,
      },
      {
        key: "active_members_50",
        label: "50 active members",
        target: 50,
        current: activeMembers,
      },
    ].map((m) => ({
      ...m,
      completed: m.current >= m.target,
      progress: Math.min(100, Math.round((m.current / m.target) * 100)),
    }));

    const nextMilestone = milestones.find((m) => !m.completed) || milestones[milestones.length - 1];

    const weeklyGoals = [
      {
        key: "host_session",
        label: "Host 1 session",
        target: 1,
        current: weeklyCompletedSessions,
      },
      {
        key: "get_attendees",
        label: "Get 10 attendees",
        target: 10,
        current: weeklyAttendees,
      },
      {
        key: "post_discussion",
        label: "Post 1 discussion",
        target: 1,
        current: weeklyDiscussionPosts,
      },
    ].map((g) => ({
      ...g,
      completed: g.current >= g.target,
    }));

    return {
      success: true,
      streak: {
        weeks: streakWeeks,
        isActiveThisWeek: weeklyCompletedSessions > 0,
      },
      milestones,
      nextMilestone,
      weeklyGoals,
      totals: {
        sessionsHosted: totalSessionsHosted,
        attendees: totalAttendees,
        activeMembers,
      },
    };
  } catch (error) {
    console.error("Error getting host gamification snapshot:", error);
    return { success: false, error: "Failed to load gamification snapshot" };
  }
}

export async function getAIPlaybookRecommendations() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    const now = new Date();
    const last14Days = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const next7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const hostMemberships = await prisma.member.findMany({
      where: {
        userId,
        role: { in: ["OWNER", "ADMIN", "MODERATOR"] },
      },
      select: { communityId: true },
    });

    const communityIds = hostMemberships.map((m) => m.communityId);

    const [completedSessions, upcomingSessions, postsLast7d, newMembersLast7d, recordingViewsAgg, activeMembers] =
      await Promise.all([
        prisma.mentorSession.findMany({
          where: {
            OR: [{ mentorId: userId }, { communityId: { in: communityIds } }],
            status: "COMPLETED",
            endedAt: { gte: last14Days },
          },
          select: {
            attendeeCount: true,
            participations: { select: { id: true, eventsData: true } },
            endedAt: true,
          },
          orderBy: { endedAt: "desc" },
          take: 50,
        }),
        prisma.mentorSession.count({
          where: {
            OR: [{ mentorId: userId }, { communityId: { in: communityIds } }],
            status: { in: ["SCHEDULED", "IN_PROGRESS"] },
            scheduledAt: { gte: now, lte: next7Days },
          },
        }),
        prisma.post.count({
          where: {
            communityId: { in: communityIds },
            createdAt: { gte: last7Days },
          },
        }),
        prisma.member.count({
          where: {
            communityId: { in: communityIds },
            joinedAt: { gte: last7Days },
          },
        }),
        prisma.post.aggregate({
          where: {
            communityId: { in: communityIds },
            contentType: "SESSION_ANNOUNCEMENT",
            createdAt: { gte: last14Days },
          },
          _sum: { viewCount: true },
        }),
        prisma.member.count({
          where: {
            communityId: { in: communityIds },
            status: "ACTIVE",
          },
        }),
      ]);

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

    const attendanceRate = totalRsvps > 0 ? totalAttended / totalRsvps : 0;
    const sessionsPerWeek = completedSessions.length / 2;

    const getWeekKey = (date: Date) => {
      const d = new Date(date);
      d.setDate(d.getDate() - d.getDay());
      d.setHours(0, 0, 0, 0);
      return d.toISOString();
    };

    const currentWeekStart = new Date(now);
    currentWeekStart.setDate(now.getDate() - now.getDay());
    currentWeekStart.setHours(0, 0, 0, 0);

    const activeWeeks = new Set(
      completedSessions
        .map((s) => s.endedAt)
        .filter((d): d is Date => !!d)
        .map((d) => getWeekKey(d))
    );

    let streak = 0;
    const cursor = new Date(currentWeekStart);
    for (let i = 0; i < 52; i++) {
      if (!activeWeeks.has(cursor.toISOString())) break;
      streak += 1;
      cursor.setDate(cursor.getDate() - 7);
    }

    const signals = {
      attendanceRate,
      sessionsPerWeek,
      upcomingSessions,
      postsLast7d,
      newMembersLast7d,
      recordingViews: recordingViewsAgg._sum.viewCount || 0,
      streak,
      activeMembers,
      lastSessionAttended: completedSessions[0]
        ? completedSessions[0].attendeeCount || completedSessions[0].participations.length || 0
        : 0,
    };

    const recommendations: Array<{
      id: string;
      priority: "critical" | "high" | "medium" | "low";
      title: string;
      problem: string;
      action: string;
      cta: string;
      href: string;
      explainability: string;
    }> = [];

    if (signals.upcomingSessions === 0) {
      recommendations.push({
        id: "no-sessions",
        priority: "critical",
        title: "No sessions scheduled next week",
        problem: "Without upcoming sessions, community momentum drops quickly.",
        action: "Schedule at least one live session this week to keep members active.",
        cta: "Schedule session now",
        href: "/dashboard/sessions/create",
        explainability: `Upcoming sessions: ${signals.upcomingSessions}`,
      });
    }

    if (signals.attendanceRate < 0.1) {
      recommendations.push({
        id: "low-attendance",
        priority: "high",
        title: "Attendance is low",
        problem: "Your live attendance is below healthy benchmarks.",
        action: "Ask members for questions before the session and trigger reminders 1h and 10m before live.",
        cta: "Create question post",
        href: "/dashboard/communities",
        explainability: `Last session: ${signals.lastSessionAttended} attendees · Your attendance rate: ${Math.round(
          signals.attendanceRate * 100
        )}% · Top communities average: 22%`,
      });
    }

    if (signals.postsLast7d < 3) {
      recommendations.push({
        id: "low-engagement",
        priority: "medium",
        title: "Your community is getting quiet",
        problem: "Low discussion volume usually reduces RSVP and attendance.",
        action: "Start one discussion prompt to reactivate members before your next session.",
        cta: "Ask your community a question",
        href: "/dashboard/communities",
        explainability: `Posts in last 7 days: ${signals.postsLast7d}`,
      });
    }

    if (signals.newMembersLast7d === 0) {
      recommendations.push({
        id: "no-growth",
        priority: "medium",
        title: "No new members this week",
        problem: "Growth stalled this week.",
        action: "Share your next session link and invite at least 5 new members.",
        cta: "Invite members",
        href: "/dashboard/communities",
        explainability: `New members in last 7 days: ${signals.newMembersLast7d}`,
      });
    }

    if (signals.recordingViews < 25) {
      recommendations.push({
        id: "low-replay",
        priority: "low",
        title: "Replay views can be stronger",
        problem: "Your recap content is under-leveraged.",
        action: "Share recap highlights to turn each session into reusable growth content.",
        cta: "Promote recordings",
        href: "/dashboard/recordings",
        explainability: `Recording views (14d): ${signals.recordingViews}`,
      });
    }

    if (recommendations.length === 0 || (signals.attendanceRate > 0.25 && signals.sessionsPerWeek >= 2)) {
      recommendations.push({
        id: "strong-performance",
        priority: "low",
        title: "Strong engagement this week",
        problem: "Your fundamentals are working.",
        action: "Keep your weekly cadence and preserve your momentum streak.",
        cta: "Keep momentum",
        href: "/dashboard/sessions",
        explainability: `Attendance: ${Math.round(signals.attendanceRate * 100)}% · Sessions/week: ${signals.sessionsPerWeek.toFixed(1)} · Streak: ${signals.streak}`,
      });
    }

    const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 } as const;
    const topRecommendations = recommendations
      .sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority])
      .slice(0, 3);

    return {
      success: true,
      signals,
      recommendations: topRecommendations,
    };
  } catch (error) {
    console.error("Error getting AI playbook recommendations:", error);
    return { success: false, error: "Failed to load AI recommendations" };
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

    const [weeklySessions, questionsSubmitted, recapPosts, recordingViews, weeklyHostedSessions, lastCompletedSession, activeMembers] = await Promise.all([
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
      prisma.mentorSession.count({
        where: {
          communityId: { in: communityIds },
          status: "COMPLETED",
          endedAt: { gte: weekStart, lt: weekEnd },
        },
      }),
      prisma.mentorSession.findFirst({
        where: {
          communityId: { in: communityIds },
          status: "COMPLETED",
        },
        orderBy: { endedAt: "desc" },
        select: {
          attendeeCount: true,
          participations: { select: { id: true } },
        },
      }),
      prisma.member.count({
        where: {
          communityId: { in: communityIds },
          status: "ACTIVE",
        },
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

    const lastAttendance = lastCompletedSession
      ? lastCompletedSession.attendeeCount || lastCompletedSession.participations.length || 0
      : 0;

    const noSessionsThisWeek = weeklySessions.length === 0;
    const lowAttendance = lastCompletedSession ? lastAttendance < 5 : false;
    const newCommunity = activeMembers > 0 && activeMembers <= 5;

    const baseSteps = [
      {
        id: "plan",
        day: "Monday",
        action: "Schedule your next session",
        description: "Create at least 1 live session so members know what’s coming this week.",
        cta: "Schedule session",
        href: "/dashboard/sessions/create",
        completed: weeklySessions.length > 0,
      },
      {
        id: "promote",
        day: "Tuesday",
        action: "Ask your community a question before your session",
        description: "Collect member questions early to increase RSVPs and attendance.",
        cta: "Ask question in feed",
        href: "/dashboard/communities",
        completed: questionsSubmitted > 0,
      },
      {
        id: "host",
        day: "Day of session",
        action: "Host your live session",
        description: "Go live and engage members in real time.",
        cta: "Open sessions",
        href: "/dashboard/sessions",
        completed: weeklyHostedSessions > 0,
      },
      {
        id: "capture",
        day: "After session",
        action: "Share recap and key takeaways",
        description: "Publish recap so members who missed live can still benefit.",
        cta: "Share recap",
        href: "/dashboard/recordings",
        completed: recapPosts > 0,
      },
      {
        id: "review",
        day: "End of week",
        action: "Review attendance and engagement",
        description: "Use analytics to decide what to improve next week.",
        cta: "Review analytics",
        href: "/dashboard/analytics",
        completed: (recordingViews._sum.viewCount || 0) > 0,
      },
    ];

    const dynamicBanner = noSessionsThisWeek
      ? {
          icon: "⚠️",
          title: "You don’t have sessions this week",
          description: "Schedule your first session to start momentum.",
          cta: "Schedule your first session",
          href: "/dashboard/sessions/create",
        }
      : lowAttendance
      ? {
          icon: "⚠️",
          title: "Low attendance in your last session",
          description: "Ask questions before live and push reminders to recover attendance.",
          cta: "Create question post",
          href: "/dashboard/communities",
        }
      : newCommunity
      ? {
          icon: "🌱",
          title: "Grow your first members",
          description: "Invite 5 members and share your upcoming session link.",
          cta: "Invite members",
          href: "/dashboard/communities",
        }
      : {
          icon: "✅",
          title: "You’re on track this week",
          description: "Keep following your weekly playbook to maintain momentum.",
          cta: "View sessions",
          href: "/dashboard/sessions",
        };

    const completedSteps = baseSteps.filter((s) => s.completed).length;

    const checklist = {
      plan: baseSteps[0].completed,
      promote: baseSteps[1].completed,
      host: baseSteps[2].completed,
      capture: baseSteps[3].completed,
      reuse: baseSteps[4].completed,
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
        playbook: {
          title: "This week plan",
          completedSteps,
          totalSteps: baseSteps.length,
          steps: baseSteps,
          dynamicBanner,
        },
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

export async function getDashboardSnapshot() {
  try {
    const [
      metricsRes,
      nextSessionRes,
      upcomingRes,
      activityRes,
      membersRes,
      performanceRes,
      hostAnalyticsRes,
      nextActionRes,
      hostAlertsRes,
      leaderboardRes,
      communityOSRes,
      hostScoreRes,
      gamificationRes,
      aiPlaybookRes,
      autopilotRes,
      identityRes,
      activationRes,
    ] = await Promise.all([
      getDashboardMetrics(),
      getNextLiveSession(),
      getUpcomingSessions(5),
      getCommunityActivity(6),
      getRecentMembers(4),
      getPerformanceSnapshot(),
      getHostAnalyticsV1(),
      getNextRecommendedAction(),
      getHostAlerts(),
      getMemberLeaderboard(5),
      getCommunityOSSnapshot(),
      getHostScoreSystem(),
      getHostGamificationSnapshot(),
      getAIPlaybookRecommendations(),
      getAutopilotDashboardSnapshot(),
      getUserIdentitySnapshot(8),
      getActivationEngineSnapshot(),
    ]);

    return {
      success: true,
      payload: {
        metricsRes,
        nextSessionRes,
        upcomingRes,
        activityRes,
        membersRes,
        performanceRes,
        hostAnalyticsRes,
        nextActionRes,
        hostAlertsRes,
        leaderboardRes,
        communityOSRes,
        hostScoreRes,
        gamificationRes,
        aiPlaybookRes,
        autopilotRes,
        identityRes,
        activationRes,
      },
    };
  } catch (error) {
    console.error("Error getting dashboard snapshot:", error);
    return { success: false, error: "Failed to load dashboard snapshot" };
  }
}

export async function getAutopilotDashboardSnapshot() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    const hostCommunities = await prisma.member.findMany({
      where: { userId, role: { in: ["OWNER", "ADMIN", "MODERATOR"] } },
      select: { communityId: true },
    });

    const communityIds = hostCommunities.map((m) => m.communityId);
    if (communityIds.length === 0) {
      return {
        success: true,
        health: { completionRate: 100, totalJobs: 0, queued: 0, failed: 0 },
        queue: [],
      };
    }

    const events = await prisma.sessionEvent.findMany({
      where: {
        communityId: { in: communityIds },
        payload: {
          path: ["autopilot", "kind"],
          equals: "job",
        },
      },
      orderBy: { createdAt: "desc" },
      take: 500,
      include: {
        session: {
          select: {
            id: true,
            title: true,
            scheduledAt: true,
            community: { select: { name: true, slug: true } },
          },
        },
      },
    });

    const jobs = events
      .map((event) => {
        const ap = (event.payload as any)?.autopilot;
        if (!ap) return null;
        return {
          id: event.id,
          status: ap.status as "queued" | "running" | "done" | "failed",
          jobType: (ap.jobType as string) || "unknown",
          runAt: ap.runAt ? new Date(ap.runAt) : null,
          retries: Number(ap.retries || 0),
          error: ap.error as string | undefined,
          sessionId: ap.sessionId as string,
          sessionTitle: event.session?.title || "Session",
          communityName: event.session?.community?.name || "Community",
        };
      })
      .filter(Boolean) as Array<{
      id: string;
      status: "queued" | "running" | "done" | "failed";
      jobType: string;
      runAt: Date | null;
      retries: number;
      error?: string;
      sessionId: string;
      sessionTitle: string;
      communityName: string;
    }>;

    const done = jobs.filter((j) => j.status === "done").length;
    const failed = jobs.filter((j) => j.status === "failed").length;
    const queued = jobs.filter((j) => j.status === "queued").length;

    const completionRate = done + failed > 0 ? Math.round((done / (done + failed)) * 100) : 100;

    const queue = jobs
      .filter((j) => j.status === "queued" || j.status === "running" || j.status === "failed")
      .sort((a, b) => {
        const aTime = a.runAt ? a.runAt.getTime() : Number.MAX_SAFE_INTEGER;
        const bTime = b.runAt ? b.runAt.getTime() : Number.MAX_SAFE_INTEGER;
        return aTime - bTime;
      })
      .slice(0, 8)
      .map((j) => ({
        id: j.id,
        status: j.status,
        jobType: j.jobType,
        runAt: j.runAt?.toISOString() || null,
        retries: j.retries,
        error: j.error,
        sessionTitle: j.sessionTitle,
        communityName: j.communityName,
      }));

    return {
      success: true,
      health: {
        completionRate,
        totalJobs: jobs.length,
        queued,
        failed,
      },
      queue,
    };
  } catch (error) {
    console.error("Error getting autopilot dashboard snapshot:", error);
    return { success: false, error: "Failed to load autopilot snapshot" };
  }
}