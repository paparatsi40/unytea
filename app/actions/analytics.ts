"use server";

import { getCurrentUserId } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { startOfDay, subDays } from "date-fns";

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