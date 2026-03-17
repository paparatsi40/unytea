"use server";

import { getCurrentUserId } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { addWeeks, endOfWeek, startOfDay, startOfWeek, subDays } from "date-fns";

/**
 * Get overview analytics for dashboard
 */
export async function getOverviewAnalytics() {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return { success: false, error: "Not authenticated" };
    }

    // Get user's communities
    const ownedCommunities = await prisma.community.findMany({
      where: { ownerId: userId },
      select: { id: true },
    });

    const communityIds = ownedCommunities.map((c) => c.id);

    // Total members across all communities
    const totalMembers = await prisma.member.count({
      where: {
        communityId: { in: communityIds },
        status: "ACTIVE",
      },
    });

    // Total posts
    const totalPosts = await prisma.post.count({
      where: { communityId: { in: communityIds } },
    });

    // Total comments
    const totalComments = await prisma.comment.count({
      where: {
        post: {
          communityId: { in: communityIds },
        },
      },
    });

    // Total messages in community channels
    const totalMessages = await prisma.channelMessage.count({
      where: {
        channel: {
          communityId: { in: communityIds },
        },
      },
    });

    // Growth this month
    const startOfMonth = startOfDay(new Date(new Date().setDate(1)));
    
    const newMembersThisMonth = await prisma.member.count({
      where: {
        communityId: { in: communityIds },
        joinedAt: { gte: startOfMonth },
      },
    });

    const newPostsThisMonth = await prisma.post.count({
      where: {
        communityId: { in: communityIds },
        createdAt: { gte: startOfMonth },
      },
    });

    return {
      success: true,
      data: {
        totalCommunities: ownedCommunities.length,
        totalMembers,
        totalPosts,
        totalComments,
        totalMessages,
        newMembersThisMonth,
        newPostsThisMonth,
      },
    };
  } catch (error) {
    console.error("Error fetching overview analytics:", error);
    return { success: false, error: "Failed to fetch analytics" };
  }
}

/**
 * Get community-specific analytics
 */
export async function getCommunityAnalytics(communityId: string) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return { success: false, error: "Not authenticated" };
    }

    // Verify user owns the community
    const community = await prisma.community.findFirst({
      where: {
        id: communityId,
        ownerId: userId,
      },
    });

    if (!community) {
      return { success: false, error: "Community not found or unauthorized" };
    }

    // Get basic stats
    const memberCount = await prisma.member.count({
      where: { communityId, status: "ACTIVE" },
    });

    const postCount = await prisma.post.count({
      where: { communityId },
    });

    const commentCount = await prisma.comment.count({
      where: {
        post: { communityId },
      },
    });

    // Get growth data (last 30 days)
    const last30Days = subDays(new Date(), 30);
    
    const memberGrowth = await prisma.member.groupBy({
      by: ["joinedAt"],
      where: {
        communityId,
        joinedAt: { gte: last30Days },
      },
      _count: true,
    });

    const postGrowth = await prisma.post.groupBy({
      by: ["createdAt"],
      where: {
        communityId,
        createdAt: { gte: last30Days },
      },
      _count: true,
    });

    // Top contributors
    const topPosters = await prisma.post.groupBy({
      by: ["authorId"],
      where: { communityId },
      _count: true,
      orderBy: { _count: { authorId: "desc" } },
      take: 5,
    });

    const topPostersWithDetails = await Promise.all(
      topPosters.map(async (poster) => {
        const user = await prisma.user.findUnique({
          where: { id: poster.authorId },
          select: {
            id: true,
            name: true,
            username: true,
            image: true,
          },
        });
        return {
          user,
          postCount: poster._count,
        };
      })
    );

    // Active hours (posts by hour)
    const posts = await prisma.post.findMany({
      where: { communityId },
      select: { createdAt: true },
    });

    const hourDistribution = posts.reduce((acc, post) => {
      const hour = new Date(post.createdAt).getHours();
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    // Engagement rate
    const totalEngagement = commentCount + postCount;
    const engagementRate = memberCount > 0 
      ? ((totalEngagement / memberCount) * 100).toFixed(2)
      : "0";

    return {
      success: true,
      data: {
        overview: {
          memberCount,
          postCount,
          commentCount,
          engagementRate,
        },
        growth: {
          members: memberGrowth,
          posts: postGrowth,
        },
        topContributors: topPostersWithDetails,
        activeHours: hourDistribution,
      },
    };
  } catch (error) {
    console.error("Error fetching community analytics:", error);
    return { success: false, error: "Failed to fetch analytics" };
  }
}

/**
 * Get engagement analytics
 */
export async function getEngagementAnalytics(communityId: string) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return { success: false, error: "Not authenticated" };
    }

    // Verify ownership
    const community = await prisma.community.findFirst({
      where: { id: communityId, ownerId: userId },
    });

    if (!community) {
      return { success: false, error: "Unauthorized" };
    }

    const last7Days = subDays(new Date(), 7);
    const last30Days = subDays(new Date(), 30);

    // Daily active users (users who posted/commented)
    const activeUsers7Days = await prisma.user.findMany({
      where: {
        OR: [
          {
            posts: {
              some: {
                communityId,
                createdAt: { gte: last7Days },
              },
            },
          },
          {
            comments: {
              some: {
                post: { communityId },
                createdAt: { gte: last7Days },
              },
            },
          },
        ],
      },
      select: { id: true },
    });

    const activeUsers30Days = await prisma.user.findMany({
      where: {
        OR: [
          {
            posts: {
              some: {
                communityId,
                createdAt: { gte: last30Days },
              },
            },
          },
          {
            comments: {
              some: {
                post: { communityId },
                createdAt: { gte: last30Days },
              },
            },
          },
        ],
      },
      select: { id: true },
    });

    // Posts with most engagement
    const topPosts = await prisma.post.findMany({
      where: { communityId },
      include: {
        _count: {
          select: {
            comments: true,
            reactions: true,
          },
        },
        author: {
          select: {
            id: true,
            name: true,
            username: true,
            image: true,
          },
        },
      },
      orderBy: [
        { viewCount: "desc" },
      ],
      take: 10,
    });

    // Reaction breakdown
    const reactions = await prisma.reaction.groupBy({
      by: ["type"],
      where: {
        post: { communityId },
      },
      _count: true,
    });

    return {
      success: true,
      data: {
        activeUsers: {
          last7Days: activeUsers7Days.length,
          last30Days: activeUsers30Days.length,
        },
        topPosts: topPosts.map((post) => ({
          id: post.id,
          title: post.title,
          content: post.content.substring(0, 100),
          author: post.author,
          commentCount: post._count.comments,
          reactionCount: post._count.reactions,
          viewCount: post.viewCount,
          createdAt: post.createdAt,
        })),
        reactions: reactions.map((r) => ({
          type: r.type,
          count: r._count,
        })),
      },
    };
  } catch (error) {
    console.error("Error fetching engagement analytics:", error);
    return { success: false, error: "Failed to fetch engagement analytics" };
  }
}

/**
 * Get member analytics
 */
export async function getMemberAnalytics(communityId: string) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return { success: false, error: "Not authenticated" };
    }

    // Verify ownership
    const community = await prisma.community.findFirst({
      where: { id: communityId, ownerId: userId },
    });

    if (!community) {
      return { success: false, error: "Unauthorized" };
    }

    // Members by role
    const membersByRole = await prisma.member.groupBy({
      by: ["role"],
      where: { communityId, status: "ACTIVE" },
      _count: true,
    });

    // Members by level
    const membersByLevel = await prisma.member.findMany({
      where: { communityId, status: "ACTIVE" },
      select: { level: true },
    });

    const levelDistribution = membersByLevel.reduce((acc, member) => {
      const levelBucket = Math.floor(member.level / 10) * 10;
      acc[levelBucket] = (acc[levelBucket] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    // Recent joins (last 30 days)
    const recentJoins = await prisma.member.findMany({
      where: {
        communityId,
        joinedAt: { gte: subDays(new Date(), 30) },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            image: true,
          },
        },
      },
      orderBy: { joinedAt: "desc" },
      take: 20,
    });

    // Top members by points
    const topMembers = await prisma.member.findMany({
      where: { communityId, status: "ACTIVE" },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            image: true,
          },
        },
      },
      orderBy: { points: "desc" },
      take: 10,
    });

    return {
      success: true,
      data: {
        byRole: membersByRole,
        byLevel: levelDistribution,
        recentJoins: recentJoins.map((m) => ({
          user: m.user,
          joinedAt: m.joinedAt,
          level: m.level,
          points: m.points,
        })),
        topMembers: topMembers.map((m) => ({
          user: m.user,
          level: m.level,
          points: m.points,
          role: m.role,
        })),
      },
    };
  } catch (error) {
    console.error("Error fetching member analytics:", error);
    return { success: false, error: "Failed to fetch member analytics" };
  }
}

export async function getLiveCommunityHealthMetrics(communityId?: string) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, error: "Not authenticated" };
    }

    const ownedCommunities = await prisma.community.findMany({
      where: { ownerId: userId },
      select: { id: true, name: true, slug: true },
      orderBy: { createdAt: "desc" },
    });

    const allCommunityIds = ownedCommunities.map((c) => c.id);
    if (allCommunityIds.length === 0) {
      return {
        success: true,
        communities: [],
        selectedCommunityId: null,
        metrics: {
          returningAttendeesRate: 0,
          feedParticipationRate: 0,
          returningAttendeesCount: 0,
          uniqueAttendeesCount: 0,
          feedActiveMembersCount: 0,
          activeMembersCount: 0,
        },
      };
    }

    const selectedCommunityId =
      communityId && allCommunityIds.includes(communityId) ? communityId : null;
    const communityIds = selectedCommunityId ? [selectedCommunityId] : allCommunityIds;

    const [activeMembersCount, attendeeRows, postRows, commentRows] = await Promise.all([
      prisma.member.count({
        where: {
          communityId: { in: communityIds },
          status: "ACTIVE",
        },
      }),
      prisma.sessionParticipation.groupBy({
        by: ["userId"],
        where: {
          session: {
            communityId: { in: communityIds },
            status: "COMPLETED",
          },
        },
        _count: { userId: true },
      }),
      prisma.post.findMany({
        where: {
          communityId: { in: communityIds },
          createdAt: { gte: subDays(new Date(), 30) },
        },
        select: { authorId: true },
        distinct: ["authorId"],
      }),
      prisma.comment.findMany({
        where: {
          createdAt: { gte: subDays(new Date(), 30) },
          post: {
            communityId: { in: communityIds },
          },
        },
        select: { authorId: true },
        distinct: ["authorId"],
      }),
    ]);

    const uniqueAttendeesCount = attendeeRows.length;
    const returningAttendeesCount = attendeeRows.filter((row) => (row._count?.userId || 0) > 1).length;
    const returningAttendeesRate =
      uniqueAttendeesCount > 0
        ? Math.round((returningAttendeesCount / uniqueAttendeesCount) * 100)
        : 0;

    const feedActiveSet = new Set<string>([
      ...postRows.map((row) => row.authorId),
      ...commentRows.map((row) => row.authorId),
    ]);

    const feedActiveMembersCount = feedActiveSet.size;
    const feedParticipationRate =
      activeMembersCount > 0
        ? Math.round((feedActiveMembersCount / activeMembersCount) * 100)
        : 0;

    return {
      success: true,
      communities: ownedCommunities,
      selectedCommunityId,
      metrics: {
        returningAttendeesRate,
        feedParticipationRate,
        returningAttendeesCount,
        uniqueAttendeesCount,
        feedActiveMembersCount,
        activeMembersCount,
      },
    };
  } catch (error) {
    console.error("Error fetching live community health metrics:", error);
    return { success: false, error: "Failed to fetch live community health metrics" };
  }
}

export async function getNorthStarDecisionSnapshot(communityId?: string) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return { success: false, error: "Not authenticated" };

    const ownedCommunities = await prisma.community.findMany({
      where: { ownerId: userId },
      select: { id: true, name: true, slug: true },
      orderBy: { createdAt: "desc" },
    });

    const allCommunityIds = ownedCommunities.map((c) => c.id);
    if (allCommunityIds.length === 0) {
      return {
        success: true,
        communities: [],
        selectedCommunityId: null,
        northStar: {
          waa: 0,
          avgLiveAttendance: 0,
          returningAttendeesRate: 0,
          feedParticipationRate: 0,
          contentReuseRate: 0,
        },
        diagnosis: "No communities yet",
        actions: [
          {
            title: "Create your first community",
            why: "You need one active community to start generating weekly active attendees.",
            href: "/dashboard/communities/new",
            cta: "Create community",
          },
        ],
      };
    }

    const selectedCommunityId =
      communityId && allCommunityIds.includes(communityId) ? communityId : null;
    const communityIds = selectedCommunityId ? [selectedCommunityId] : allCommunityIds;

    const now = new Date();
    const last7Days = subDays(now, 7);

    const [activeMembersCount, postUsers, commentUsers, participationRows, completedSessions7d, recordingBackedSessions, attendeeRows] = await Promise.all([
      prisma.member.count({
        where: {
          communityId: { in: communityIds },
          status: "ACTIVE",
        },
      }),
      prisma.post.findMany({
        where: {
          communityId: { in: communityIds },
          createdAt: { gte: last7Days },
        },
        select: { authorId: true },
        distinct: ["authorId"],
      }),
      prisma.comment.findMany({
        where: {
          createdAt: { gte: last7Days },
          post: { communityId: { in: communityIds } },
        },
        select: { authorId: true },
        distinct: ["authorId"],
      }),
      prisma.sessionParticipation.findMany({
        where: {
          createdAt: { gte: last7Days },
          session: { communityId: { in: communityIds } },
        },
        select: { userId: true },
        distinct: ["userId"],
      }),
      prisma.mentorSession.findMany({
        where: {
          communityId: { in: communityIds },
          status: "COMPLETED",
          scheduledAt: { gte: last7Days },
        },
        select: { id: true, attendeeCount: true, recording: { select: { id: true } } },
      }),
      prisma.mentorSession.count({
        where: {
          communityId: { in: communityIds },
          status: "COMPLETED",
          scheduledAt: { gte: last7Days },
          recording: { isNot: null },
        },
      }),
      prisma.sessionParticipation.groupBy({
        by: ["userId"],
        where: {
          session: {
            communityId: { in: communityIds },
            status: "COMPLETED",
            scheduledAt: { gte: last7Days },
          },
        },
        _count: { userId: true },
      }),
    ]);

    const waaSet = new Set<string>([
      ...postUsers.map((u) => u.authorId),
      ...commentUsers.map((u) => u.authorId),
      ...participationRows.map((u) => u.userId),
    ]);

    const waa = waaSet.size;
    const avgLiveAttendance = completedSessions7d.length
      ? Math.round(
          completedSessions7d.reduce((sum, s) => sum + (s.attendeeCount || 0), 0) /
            completedSessions7d.length
        )
      : 0;

    const uniqueAttendees = attendeeRows.length;
    const returningAttendees = attendeeRows.filter((r) => (r._count?.userId || 0) > 1).length;
    const returningAttendeesRate = uniqueAttendees
      ? Math.round((returningAttendees / uniqueAttendees) * 100)
      : 0;

    const feedParticipationRate = activeMembersCount
      ? Math.round((postUsers.length + commentUsers.length > 0 ? new Set([...postUsers.map((p) => p.authorId), ...commentUsers.map((c) => c.authorId)]).size : 0) / activeMembersCount * 100)
      : 0;

    const contentReuseRate = completedSessions7d.length
      ? Math.round((recordingBackedSessions / completedSessions7d.length) * 100)
      : 0;

    const weakSignals: string[] = [];
    if (waa < 20) weakSignals.push("weekly active attendees are low");
    if (avgLiveAttendance < 12) weakSignals.push("average live attendance is low");
    if (returningAttendeesRate < 35) weakSignals.push("returning attendees are weak");
    if (feedParticipationRate < 10) weakSignals.push("feed participation is low");
    if (contentReuseRate < 50) weakSignals.push("session-to-content reuse is low");

    const actions = [] as Array<{ title: string; why: string; href: string; cta: string }>;

    if (avgLiveAttendance < 12) {
      actions.push({
        title: "Improve attendance this week",
        why: "Low attendance usually improves with earlier reminders and clearer session promise.",
        href: "/dashboard/sessions",
        cta: "Optimize next session",
      });
    }
    if (feedParticipationRate < 10) {
      actions.push({
        title: "Trigger pre-session discussion",
        why: "Communities with pre-live discussion convert better to attendance.",
        href: "/dashboard/communities",
        cta: "Post discussion prompt",
      });
    }
    if (contentReuseRate < 50) {
      actions.push({
        title: "Publish recaps and recordings",
        why: "Reused content increases retention and monetization opportunities.",
        href: "/dashboard/knowledge-library",
        cta: "Publish to library",
      });
    }

    if (actions.length === 0) {
      actions.push({
        title: "Scale your best format",
        why: "Your key drivers are healthy; next gain comes from more weekly sessions and distribution.",
        href: "/dashboard/sessions",
        cta: "Schedule next session",
      });
    }

    return {
      success: true,
      communities: ownedCommunities,
      selectedCommunityId,
      northStar: {
        waa,
        avgLiveAttendance,
        returningAttendeesRate,
        feedParticipationRate,
        contentReuseRate,
      },
      diagnosis: weakSignals.length
        ? `Main bottleneck: ${weakSignals.slice(0, 2).join(" + ")}`
        : "Healthy growth momentum across all core drivers",
      actions: actions.slice(0, 3),
    };
  } catch (error) {
    console.error("Error fetching north star decision snapshot:", error);
    return { success: false, error: "Failed to fetch north star snapshot" };
  }
}

export async function getRetentionCohorts(communityId?: string) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, error: "Not authenticated" };
    }

    const ownedCommunities = await prisma.community.findMany({
      where: { ownerId: userId },
      select: { id: true, name: true, slug: true },
      orderBy: { createdAt: "desc" },
    });

    const allCommunityIds = ownedCommunities.map((c) => c.id);
    if (allCommunityIds.length === 0) {
      return { success: true, cohorts: [], communities: [], selectedCommunityId: null, trend: 0 };
    }

    const selectedCommunityId =
      communityId && allCommunityIds.includes(communityId) ? communityId : null;
    const communityIds = selectedCommunityId ? [selectedCommunityId] : allCommunityIds;

    const oldestCohortStart = startOfWeek(subDays(new Date(), 7 * 8), { weekStartsOn: 1 });

    const members = await prisma.member.findMany({
      where: {
        communityId: { in: communityIds },
        joinedAt: { gte: oldestCohortStart },
      },
      select: {
        userId: true,
        joinedAt: true,
      },
    });

    const cohortBuckets = new Map<string, Set<string>>();
    for (const member of members) {
      const cohortKey = startOfWeek(member.joinedAt, { weekStartsOn: 1 })
        .toISOString()
        .slice(0, 10);

      if (!cohortBuckets.has(cohortKey)) {
        cohortBuckets.set(cohortKey, new Set());
      }
      cohortBuckets.get(cohortKey)!.add(member.userId);
    }

    const cohortEntries = Array.from(cohortBuckets.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, 8);

    const cohorts = [] as Array<{
      cohort: string;
      size: number;
      week0: number;
      week1: number;
      week2: number;
      week3: number;
    }>;

    for (const [cohort, users] of cohortEntries) {
      const cohortStart = startOfWeek(new Date(cohort), { weekStartsOn: 1 });
      const userIds = Array.from(users);
      const size = userIds.length;

      const retention = [] as number[];
      for (let weekOffset = 0; weekOffset <= 3; weekOffset++) {
        const windowStart = addWeeks(cohortStart, weekOffset);
        const windowEnd = endOfWeek(windowStart, { weekStartsOn: 1 });

        const [postUsers, commentUsers, participationUsers] = await Promise.all([
          prisma.post.findMany({
            where: {
              communityId: { in: communityIds },
              authorId: { in: userIds },
              createdAt: { gte: windowStart, lte: windowEnd },
            },
            select: { authorId: true },
            distinct: ["authorId"],
          }),
          prisma.comment.findMany({
            where: {
              authorId: { in: userIds },
              createdAt: { gte: windowStart, lte: windowEnd },
              post: {
                communityId: { in: communityIds },
              },
            },
            select: { authorId: true },
            distinct: ["authorId"],
          }),
          prisma.sessionParticipation.findMany({
            where: {
              userId: { in: userIds },
              createdAt: { gte: windowStart, lte: windowEnd },
              session: {
                communityId: { in: communityIds },
              },
            },
            select: { userId: true },
            distinct: ["userId"],
          }),
        ]);

        const activeSet = new Set<string>([
          ...postUsers.map((u) => u.authorId),
          ...commentUsers.map((u) => u.authorId),
          ...participationUsers.map((u) => u.userId),
        ]);

        retention.push(size > 0 ? Math.round((activeSet.size / size) * 100) : 0);
      }

      cohorts.push({
        cohort,
        size,
        week0: retention[0] || 0,
        week1: retention[1] || 0,
        week2: retention[2] || 0,
        week3: retention[3] || 0,
      });
    }

    const trend = cohorts.length
      ? Math.round(cohorts.reduce((acc, c) => acc + (c.week3 - c.week1), 0) / cohorts.length)
      : 0;

    return {
      success: true,
      cohorts,
      communities: ownedCommunities,
      selectedCommunityId,
      trend,
    };
  } catch (error) {
    console.error("Error fetching retention cohorts:", error);
    return { success: false, error: "Failed to fetch retention cohorts" };
  }
}