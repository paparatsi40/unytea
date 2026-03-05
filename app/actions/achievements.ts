"use server";

import { prisma } from "@/lib/prisma";
import { ACHIEVEMENTS, AchievementType } from "@/lib/achievements-data";
import { revalidatePath } from "next/cache";

/**
 * Check if user has unlocked an achievement
 */
export async function checkUserAchievement(
  userId: string,
  achievementType: AchievementType
) {
  try {
    const existing = await prisma.userAchievement.findFirst({
      where: {
        userId,
        achievement: {
          name: ACHIEVEMENTS[achievementType].name,
        },
      },
    });

    return !!existing;
  } catch (error) {
    console.error("Error checking achievement:", error);
    return false;
  }
}

/**
 * Unlock an achievement for a user
 */
export async function unlockAchievement(
  userId: string,
  achievementType: AchievementType
) {
  try {
    // Check if already unlocked
    const hasAchievement = await checkUserAchievement(userId, achievementType);
    if (hasAchievement) {
      return { success: true, alreadyUnlocked: true };
    }

    const achievementDef = ACHIEVEMENTS[achievementType];

    // Find or create achievement in database
    let achievement = await prisma.achievement.findFirst({
      where: { name: achievementDef.name },
    });

    if (!achievement) {
      achievement = await prisma.achievement.create({
        data: {
          name: achievementDef.name,
          description: achievementDef.description,
          icon: achievementDef.icon,
          points: achievementDef.points,
          criteria: achievementDef.criteria as any,
        },
      });
    }

    // Create user achievement
    await prisma.userAchievement.create({
      data: {
        userId,
        achievementId: achievement.id,
      },
    });

    // Award points to user
    await prisma.user.update({
      where: { id: userId },
      data: {
        points: { increment: achievementDef.points },
      },
    });

    // Create notification
    await prisma.notification.create({
      data: {
        userId,
        type: "ACHIEVEMENT",
        title: "Achievement Unlocked! 🏆",
        message: `You've unlocked "${achievementDef.name}" and earned ${achievementDef.points} points!`,
        data: {
          achievementType,
          icon: achievementDef.icon,
          points: achievementDef.points,
        },
      },
    });

    revalidatePath("/dashboard/achievements");
    revalidatePath("/dashboard");

    return { success: true, alreadyUnlocked: false, achievement: achievementDef };
  } catch (error) {
    console.error("Error unlocking achievement:", error);
    return { success: false, error: "Failed to unlock achievement" };
  }
}

/**
 * Get all user achievements with progress
 */
export async function getUserAchievements(userId: string) {
  try {
    // Get unlocked achievements
    const userAchievements = await prisma.userAchievement.findMany({
      where: { userId },
      include: {
        achievement: true,
      },
      orderBy: { unlockedAt: "desc" },
    });

    // Get user stats for progress calculation
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        posts: { select: { id: true, createdAt: true } },
        comments: { select: { id: true } },
        sentMessages: { select: { id: true } },
        ownedCommunities: { select: { id: true } },
        memberships: { select: { id: true } },
        _count: {
          select: {
            buddyPartnerships1: true,
            buddyPartnerships2: true,
          },
        },
      },
    });

    if (!user) {
      return { success: false, error: "User not found" };
    }

    // Calculate stats
    const stats = {
      postCount: user.posts.length,
      commentCount: user.comments.length,
      messageCount: user.sentMessages.length,
      communityCount: user.memberships.length,
      ownedCommunitiesCount: user.ownedCommunities.length,
      buddyCount: user._count.buddyPartnerships1 + user._count.buddyPartnerships2,
      points: user.points,
      level: user.level,
    };

    // Build achievement progress
    const unlockedTypes = new Set(
      userAchievements.map((ua) => ua.achievement.name)
    );

    const allAchievements = Object.values(ACHIEVEMENTS).map((achievement) => {
      const isUnlocked = unlockedTypes.has(achievement.name);
      const unlockedData = userAchievements.find(
        (ua) => ua.achievement.name === achievement.name
      );

      // Calculate progress based on criteria
      let progress = 0;
      if (!isUnlocked) {
        const criteria = achievement.criteria;
        switch (criteria.type) {
          case "post_count":
            progress = Math.min((stats.postCount / (criteria.value || 1)) * 100, 100);
            break;
          case "comment_count":
            progress = Math.min((stats.commentCount / (criteria.value || 1)) * 100, 100);
            break;
          case "message_count":
            progress = Math.min((stats.messageCount / (criteria.value || 1)) * 100, 100);
            break;
          case "buddy_count":
            progress = Math.min((stats.buddyCount / (criteria.value || 1)) * 100, 100);
            break;
          case "level":
            progress = Math.min((stats.level / (criteria.value || 1)) * 100, 100);
            break;
          case "points":
            progress = Math.min((stats.points / (criteria.value || 1)) * 100, 100);
            break;
          case "owned_communities":
            progress = Math.min((stats.ownedCommunitiesCount / (criteria.value || 1)) * 100, 100);
            break;
          case "community_memberships":
            progress = Math.min((stats.communityCount / (criteria.value || 1)) * 100, 100);
            break;
          default:
            progress = 0;
        }
      } else {
        progress = 100;
      }

      return {
        ...achievement,
        isUnlocked,
        unlockedAt: unlockedData?.unlockedAt || null,
        progress: Math.round(progress),
      };
    });

    // Group by category
    const byCategory = allAchievements.reduce((acc, achievement) => {
      const category = achievement.category;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(achievement);
      return acc;
    }, {} as Record<string, typeof allAchievements>);

    return {
      success: true,
      achievements: allAchievements,
      byCategory,
      stats: {
        total: allAchievements.length,
        unlocked: userAchievements.length,
        totalPoints: userAchievements.reduce(
          (sum, ua) => sum + (ua.achievement.points || 0),
          0
        ),
      },
    };
  } catch (error) {
    console.error("Error fetching achievements:", error);
    return { success: false, error: "Failed to fetch achievements" };
  }
}

/**
 * Check and auto-unlock achievements based on user activity
 */
export async function checkAndUnlockAchievements(userId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        posts: { select: { id: true, createdAt: true } },
        comments: { select: { id: true } },
        sentMessages: { select: { id: true } },
        ownedCommunities: { select: { id: true } },
        memberships: { select: { id: true } },
        _count: {
          select: {
            buddyPartnerships1: true,
            buddyPartnerships2: true,
          },
        },
      },
    });

    if (!user) return { success: false, error: "User not found" };

    const stats = {
      postCount: user.posts.length,
      commentCount: user.comments.length,
      messageCount: user.sentMessages.length,
      communityCount: user.memberships.length,
      ownedCommunitiesCount: user.ownedCommunities.length,
      buddyCount: user._count.buddyPartnerships1 + user._count.buddyPartnerships2,
      points: user.points,
      level: user.level,
    };

    const unlockedAchievements: AchievementType[] = [];

    // Check each achievement
    for (const [type, achievement] of Object.entries(ACHIEVEMENTS)) {
      const achievementType = type as AchievementType;
      const hasAchievement = await checkUserAchievement(userId, achievementType);
      
      if (hasAchievement) continue;

      let shouldUnlock = false;
      const criteria = achievement.criteria;

      switch (criteria.type) {
        case "post_count":
          shouldUnlock = stats.postCount >= (criteria.value || 0);
          break;
        case "comment_count":
          shouldUnlock = stats.commentCount >= (criteria.value || 0);
          break;
        case "message_count":
          shouldUnlock = stats.messageCount >= (criteria.value || 0);
          break;
        case "buddy_count":
          shouldUnlock = stats.buddyCount >= (criteria.value || 0);
          break;
        case "level":
          shouldUnlock = stats.level >= (criteria.value || 0);
          break;
        case "points":
          shouldUnlock = stats.points >= (criteria.value || 0);
          break;
        case "owned_communities":
          shouldUnlock = stats.ownedCommunitiesCount >= (criteria.value || 0);
          break;
        case "community_memberships":
          shouldUnlock = stats.communityCount >= (criteria.value || 0);
          break;
      }

      if (shouldUnlock) {
        const result = await unlockAchievement(userId, achievementType);
        if (result.success && !result.alreadyUnlocked) {
          unlockedAchievements.push(achievementType);
        }
      }
    }

    return {
      success: true,
      unlockedCount: unlockedAchievements.length,
      unlocked: unlockedAchievements,
    };
  } catch (error) {
    console.error("Error checking achievements:", error);
    return { success: false, error: "Failed to check achievements" };
  }
}