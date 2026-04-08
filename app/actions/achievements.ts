"use server";

import { prisma } from "@/lib/prisma";
import { ACHIEVEMENTS, AchievementType } from "@/lib/achievements-data";
import { revalidatePath } from "next/cache";
import { sendPushToUser, pushTemplates } from "@/lib/push";

const APPROXIMATED_CRITERIA = new Set([
  "post_streak",
  "unique_conversations",
  "conversations_started",
  "helpful_reactions",
  "check_in_streak",
]);

type AchievementStats = {
  postCount: number;
  commentCount: number;
  messageCount: number;
  communityCount: number;
  ownedCommunitiesCount: number;
  buddyCount: number;
  points: number;
  level: number;
  postStreak: number;
  helpfulReactions: number;
  uniqueConversations: number;
  conversationsStarted: number;
  questionPosts: number;
  earlyMorningPosts: number;
  lateNightPosts: number;
  buddyGoalsCompleted: number;
  checkInStreak: number;
};

function getDayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getLongestDailyStreak(dates: Date[]) {
  if (!dates.length) return 0;

  const days = Array.from(new Set(dates.map(getDayKey))).sort();
  let best = 1;
  let current = 1;

  for (let i = 1; i < days.length; i += 1) {
    const prev = new Date(`${days[i - 1]}T00:00:00.000Z`).getTime();
    const cur = new Date(`${days[i]}T00:00:00.000Z`).getTime();
    const diffDays = Math.round((cur - prev) / (24 * 60 * 60 * 1000));

    if (diffDays === 1) {
      current += 1;
      best = Math.max(best, current);
    } else {
      current = 1;
    }
  }

  return best;
}

async function buildAchievementStats(userId: string): Promise<AchievementStats | null> {
  const [
    user,
    posts,
    commentsCount,
    sentMessages,
    membershipsCount,
    ownedCommunitiesCount,
    buddyPartnershipsCount,
    helpfulReactions,
    conversations,
    buddyGoalsCompleted,
    buddyCheckIns,
  ] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { points: true, level: true },
    }),
    prisma.post.findMany({
      where: { authorId: userId },
      select: { id: true, createdAt: true, contentType: true },
    }),
    prisma.comment.count({ where: { authorId: userId } }),
    prisma.directMessage.findMany({
      where: { senderId: userId },
      select: { id: true, receiverId: true, createdAt: true, conversationId: true },
    }),
    prisma.member.count({ where: { userId } }),
    prisma.community.count({ where: { ownerId: userId } }),
    prisma.buddyPartnership.count({
      where: {
        OR: [{ user1Id: userId }, { user2Id: userId }],
      },
    }),
    prisma.reaction.count({
      where: {
        type: { in: ["LOVE", "CLAP", "IDEA", "CELEBRATE"] },
        OR: [{ post: { authorId: userId } }, { comment: { authorId: userId } }],
      },
    }),
    prisma.conversation.findMany({
      where: {
        OR: [{ participant1Id: userId }, { participant2Id: userId }],
      },
      select: {
        id: true,
        messages: {
          select: { senderId: true },
          orderBy: { createdAt: "asc" },
          take: 1,
        },
      },
    }),
    prisma.buddyGoal.count({
      where: {
        completed: true,
        partnership: {
          OR: [{ user1Id: userId }, { user2Id: userId }],
        },
      },
    }),
    prisma.buddyCheckIn.findMany({
      where: { userId },
      select: { createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  if (!user) return null;

  const questionPosts = posts.filter((post) => post.contentType === "QUESTION").length;
  const earlyMorningPosts = posts.filter((post) => {
    const hour = post.createdAt.getHours();
    return hour < 6;
  }).length;
  const lateNightPosts = posts.filter((post) => {
    const hour = post.createdAt.getHours();
    return hour >= 23;
  }).length;

  const uniqueConversations = new Set(
    sentMessages.map((message) => message.conversationId).filter(Boolean)
  ).size;

  const conversationsStarted = conversations.filter(
    (conversation) => conversation.messages[0]?.senderId === userId
  ).length;

  return {
    postCount: posts.length,
    commentCount: commentsCount,
    messageCount: sentMessages.length,
    communityCount: membershipsCount,
    ownedCommunitiesCount,
    buddyCount: buddyPartnershipsCount,
    points: user.points,
    level: user.level,
    postStreak: getLongestDailyStreak(posts.map((post) => post.createdAt)),
    helpfulReactions,
    uniqueConversations,
    conversationsStarted,
    questionPosts,
    earlyMorningPosts,
    lateNightPosts,
    buddyGoalsCompleted,
    checkInStreak: getLongestDailyStreak(buddyCheckIns.map((checkIn) => checkIn.createdAt)),
  };
}

function getProgressForCriteria(
  criteria: { type: string; value?: number },
  stats: AchievementStats
) {
  const target = criteria.value || 1;

  switch (criteria.type) {
    case "post_count":
      return Math.min((stats.postCount / target) * 100, 100);
    case "comment_count":
      return Math.min((stats.commentCount / target) * 100, 100);
    case "message_count":
      return Math.min((stats.messageCount / target) * 100, 100);
    case "buddy_count":
      return Math.min((stats.buddyCount / target) * 100, 100);
    case "level":
      return Math.min((stats.level / target) * 100, 100);
    case "points":
      return Math.min((stats.points / target) * 100, 100);
    case "owned_communities":
      return Math.min((stats.ownedCommunitiesCount / target) * 100, 100);
    case "community_memberships":
      return Math.min((stats.communityCount / target) * 100, 100);
    case "post_streak":
      return Math.min((stats.postStreak / target) * 100, 100);
    case "helpful_reactions":
      return Math.min((stats.helpfulReactions / target) * 100, 100);
    case "unique_conversations":
      return Math.min((stats.uniqueConversations / target) * 100, 100);
    case "conversations_started":
      return Math.min((stats.conversationsStarted / target) * 100, 100);
    case "question_posts":
      return Math.min((stats.questionPosts / target) * 100, 100);
    case "early_morning_posts":
      return Math.min((stats.earlyMorningPosts / target) * 100, 100);
    case "late_night_posts":
      return Math.min((stats.lateNightPosts / target) * 100, 100);
    case "buddy_goals_completed":
      return Math.min((stats.buddyGoalsCompleted / target) * 100, 100);
    case "check_in_streak":
      return Math.min((stats.checkInStreak / target) * 100, 100);
    default:
      return 0;
  }
}

function shouldUnlockCriteria(
  criteria: { type: string; value?: number },
  stats: AchievementStats
) {
  return getProgressForCriteria(criteria, stats) >= 100;
}

async function findAchievementRecord(achievementType: AchievementType) {
  const achievementDef = ACHIEVEMENTS[achievementType];
  return prisma.achievement.findFirst({
    where: {
      OR: [
        { name: achievementDef.name },
        {
          criteria: {
            path: ["achievementType"],
            equals: achievementType,
          },
        },
      ],
    },
  });
}

/**
 * Check if user has unlocked an achievement
 */
export async function checkUserAchievement(
  userId: string,
  achievementType: AchievementType
) {
  try {
    const achievement = await findAchievementRecord(achievementType);

    if (!achievement) return false;

    const existing = await prisma.userAchievement.findUnique({
      where: {
        userId_achievementId: {
          userId,
          achievementId: achievement.id,
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
    const hasAchievement = await checkUserAchievement(userId, achievementType);
    if (hasAchievement) {
      return { success: true, alreadyUnlocked: true };
    }

    const achievementDef = ACHIEVEMENTS[achievementType];

    let achievement = await findAchievementRecord(achievementType);

    if (!achievement) {
      achievement = await prisma.achievement.create({
        data: {
          name: achievementDef.name,
          description: achievementDef.description,
          icon: achievementDef.icon,
          points: achievementDef.points,
          criteria: {
            ...(achievementDef.criteria as any),
            achievementType,
          } as any,
        },
      });
    }

    await prisma.userAchievement.create({
      data: {
        userId,
        achievementId: achievement.id,
      },
    });

    await prisma.user.update({
      where: { id: userId },
      data: {
        points: { increment: achievementDef.points },
      },
    });

    // Send push notification for achievement
    sendPushToUser(
      userId,
      pushTemplates.achievementUnlocked(`${achievementDef.name} — ${achievementDef.description}`)
    ).catch(console.error);

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
    const userAchievements = await prisma.userAchievement.findMany({
      where: { userId },
      include: {
        achievement: true,
      },
      orderBy: { unlockedAt: "desc" },
    });

    const stats = await buildAchievementStats(userId);
    if (!stats) {
      return { success: false, error: "User not found" };
    }

    const unlockedNames = new Set(userAchievements.map((ua) => ua.achievement.name));

    const allAchievements = Object.values(ACHIEVEMENTS).map((achievement) => {
      const isUnlocked = unlockedNames.has(achievement.name);
      const unlockedData = userAchievements.find(
        (ua) => ua.achievement.name === achievement.name
      );

      const progress = isUnlocked
        ? 100
        : Math.round(getProgressForCriteria(achievement.criteria, stats));

      return {
        ...achievement,
        isUnlocked,
        unlockedAt: unlockedData?.unlockedAt || null,
        progress,
        isApproximate: APPROXIMATED_CRITERIA.has(achievement.criteria.type),
      };
    });

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
    const stats = await buildAchievementStats(userId);
    if (!stats) return { success: false, error: "User not found" };

    const unlockedAchievements: AchievementType[] = [];

    for (const [type, achievement] of Object.entries(ACHIEVEMENTS)) {
      const achievementType = type as AchievementType;
      const hasAchievement = await checkUserAchievement(userId, achievementType);
      if (hasAchievement) continue;

      if (shouldUnlockCriteria(achievement.criteria, stats)) {
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
