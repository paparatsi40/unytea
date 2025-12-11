"use server";

import { prisma } from "@/lib/prisma";

/**
 * Get leaderboard for a community
 */
export async function getLeaderboard(
  communityId: string,
  timeframe: "weekly" | "monthly" | "alltime" = "alltime",
  limit: number = 10
) {
  try {
    let dateFilter: Date | undefined;
    
    if (timeframe === "weekly") {
      dateFilter = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    } else if (timeframe === "monthly") {
      dateFilter = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    }

    const members = await prisma.member.findMany({
      where: {
        communityId,
        status: "ACTIVE",
        ...(dateFilter ? { joinedAt: { gte: dateFilter } } : {}),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
            level: true,
            points: true,
          },
        },
      },
      orderBy: [
        { points: "desc" },
        { level: "desc" },
      ],
      take: limit,
    });

    // Add ranking
    const leaderboard = members.map((member, index) => ({
      rank: index + 1,
      userId: member.user.id,
      name: member.user.name,
      image: member.user.image,
      level: member.user.level,
      points: member.points,
      globalPoints: member.user.points,
    }));

    return { success: true, leaderboard };
  } catch (error) {
    console.error("Error getting leaderboard:", error);
    return { success: false, error: "Failed to get leaderboard", leaderboard: [] };
  }
}

/**
 * Get user rank in community
 */
export async function getUserRank(communityId: string, userId: string) {
  try {
    const members = await prisma.member.findMany({
      where: {
        communityId,
        status: "ACTIVE",
      },
      orderBy: [
        { points: "desc" },
        { level: "desc" },
      ],
      select: {
        userId: true,
        points: true,
      },
    });

    const rank = members.findIndex(m => m.userId === userId) + 1;

    return { success: true, rank, total: members.length };
  } catch (error) {
    console.error("Error getting user rank:", error);
    return { success: false, error: "Failed to get rank", rank: 0, total: 0 };
  }
}

/**
 * Award points to user
 */
export async function awardPoints(
  userId: string,
  communityId: string,
  points: number
) {
  try {
    // Update member points
    const member = await prisma.member.update({
      where: {
        userId_communityId: {
          userId,
          communityId,
        },
      },
      data: {
        points: { increment: points },
      },
    });

    // Update user global points
    await prisma.user.update({
      where: { id: userId },
      data: {
        points: { increment: points },
      },
    });

    // Check for level up
    const newLevel = calculateLevel(member.points + points);
    if (newLevel > member.level) {
      await prisma.member.update({
        where: {
          userId_communityId: {
            userId,
            communityId,
          },
        },
        data: { level: newLevel },
      });

      await prisma.user.update({
        where: { id: userId },
        data: { level: newLevel },
      });

      return { success: true, levelUp: true, newLevel, points: member.points + points };
    }

    return { success: true, levelUp: false, points: member.points + points };
  } catch (error) {
    console.error("Error awarding points:", error);
    return { success: false, error: "Failed to award points" };
  }
}

/**
 * Calculate level from points
 */
function calculateLevel(points: number): number {
  // Level formula: level = floor(points / 100) + 1
  // Level 1: 0-99 pts
  // Level 2: 100-199 pts
  // Level 3: 200-299 pts
  // etc.
  return Math.floor(points / 100) + 1;
}

/**
 * Get points needed for next level
 */
export async function getPointsToNextLevel(userId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { points: true, level: true },
    });

    if (!user) {
      return { success: false, error: "User not found" };
    }

    const currentLevelMinPoints = (user.level - 1) * 100;
    const nextLevelMinPoints = user.level * 100;
    const pointsToNext = nextLevelMinPoints - user.points;
    const progressPercent = ((user.points - currentLevelMinPoints) / 100) * 100;

    return {
      success: true,
      currentPoints: user.points,
      currentLevel: user.level,
      pointsToNext,
      progressPercent,
      nextLevel: user.level + 1,
    };
  } catch (error) {
    console.error("Error getting points to next level:", error);
    return { success: false, error: "Failed to get progress" };
  }
}

/**
 * Get available achievements
 */
export async function getAchievements() {
  try {
    const achievements = await prisma.achievement.findMany({
      orderBy: { points: "asc" },
    });

    return { success: true, achievements };
  } catch (error) {
    console.error("Error getting achievements:", error);
    return { success: false, error: "Failed to get achievements", achievements: [] };
  }
}

/**
 * Get user achievements
 */
export async function getUserAchievements(userId: string) {
  try {
    const userAchievements = await prisma.userAchievement.findMany({
      where: { userId },
      include: {
        achievement: true,
      },
      orderBy: { unlockedAt: "desc" },
    });

    return { success: true, achievements: userAchievements };
  } catch (error) {
    console.error("Error getting user achievements:", error);
    return { success: false, error: "Failed to get achievements", achievements: [] };
  }
}

/**
 * Unlock achievement for user
 */
export async function unlockAchievement(userId: string, achievementId: string) {
  try {
    // Check if already unlocked
    const existing = await prisma.userAchievement.findUnique({
      where: {
        userId_achievementId: {
          userId,
          achievementId,
        },
      },
    });

    if (existing) {
      return { success: false, error: "Achievement already unlocked" };
    }

    // Get achievement details
    const achievement = await prisma.achievement.findUnique({
      where: { id: achievementId },
    });

    if (!achievement) {
      return { success: false, error: "Achievement not found" };
    }

    // Unlock achievement
    const userAchievement = await prisma.userAchievement.create({
      data: {
        userId,
        achievementId,
      },
      include: {
        achievement: true,
      },
    });

    // Award points
    await prisma.user.update({
      where: { id: userId },
      data: {
        points: { increment: achievement.points },
      },
    });

    return { success: true, achievement: userAchievement };
  } catch (error) {
    console.error("Error unlocking achievement:", error);
    return { success: false, error: "Failed to unlock achievement" };
  }
}

/**
 * Get user activity stats
 */
export async function getUserActivityStats(userId: string, communityId?: string) {
  try {
    const where = communityId ? { authorId: userId, communityId } : { authorId: userId };

    const [posts, comments, messages] = await Promise.all([
      prisma.post.count({ where }),
      prisma.comment.count({ where: { authorId: userId } }),
      prisma.channelMessage.count({ where: { authorId: userId } }),
    ]);

    return {
      success: true,
      stats: {
        posts,
        comments,
        messages,
        total: posts + comments + messages,
      },
    };
  } catch (error) {
    console.error("Error getting activity stats:", error);
    return { success: false, error: "Failed to get stats" };
  }
}
