"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth-utils";
import { revalidatePath } from "next/cache";
import { checkAndUnlockAchievements } from "./achievements";

/**
 * Find a buddy match for a user in a community
 */
export async function findBuddyMatch(communityId: string) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, error: "Not authenticated" };
    }

    // Check if user already has an active buddy in this community
    const existingPartnership = await prisma.buddyPartnership.findFirst({
      where: {
        communityId,
        status: "ACTIVE",
        OR: [{ user1Id: userId }, { user2Id: userId }],
      },
    });

    if (existingPartnership) {
      return { success: false, error: "You already have an active buddy" };
    }

    // Find users without a buddy (excluding current user)
    const availableUsers = await prisma.member.findMany({
      where: {
        communityId,
        status: "ACTIVE",
        userId: { not: userId },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
            level: true,
            skills: true,
            interests: true,
          },
        },
      },
    });

    // Filter users who don't have an active buddy
    const usersWithoutBuddy = [];
    for (const member of availableUsers) {
      const hasBuddy = await prisma.buddyPartnership.findFirst({
        where: {
          communityId,
          status: "ACTIVE",
          OR: [{ user1Id: member.userId }, { user2Id: member.userId }],
        },
      });
      if (!hasBuddy) {
        usersWithoutBuddy.push(member);
      }
    }

    if (usersWithoutBuddy.length === 0) {
      return { success: false, error: "No available buddies found" };
    }

    // Simple random match for MVP (can be improved with ML later)
    const randomMatch = usersWithoutBuddy[Math.floor(Math.random() * usersWithoutBuddy.length)];

    return { 
      success: true, 
      match: {
        id: randomMatch.userId,
        name: randomMatch.user.name,
        image: randomMatch.user.image,
        level: randomMatch.user.level,
        skills: randomMatch.user.skills,
        interests: randomMatch.user.interests,
      }
    };
  } catch (error) {
    console.error("Error finding buddy match:", error);
    return { success: false, error: "Failed to find buddy match" };
  }
}

/**
 * Create a buddy partnership
 */
export async function createBuddyPartnership(buddyId: string, communityId: string) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return { success: false, error: "Not authenticated" };
    }

    if (userId === buddyId) {
      return { success: false, error: "Cannot match with yourself" };
    }

    // Check if both users are members of the community
    const [member1, member2] = await Promise.all([
      prisma.member.findUnique({
        where: {
          userId_communityId: {
            userId,
            communityId,
          },
        },
      }),
      prisma.member.findUnique({
        where: {
          userId_communityId: {
            userId: buddyId,
            communityId,
          },
        },
      }),
    ]);

    if (!member1 || !member2 || member1.status !== "ACTIVE" || member2.status !== "ACTIVE") {
      return { success: false, error: "Both users must be active members" };
    }

    // Check if partnership already exists
    const existing = await prisma.buddyPartnership.findFirst({
      where: {
        communityId,
        OR: [
          { user1Id: userId, user2Id: buddyId },
          { user1Id: buddyId, user2Id: userId },
        ],
      },
    });

    if (existing) {
      return { success: false, error: "Partnership already exists" };
    }

    // Create partnership
    const partnership = await prisma.buddyPartnership.create({
      data: {
        user1Id: userId,
        user2Id: buddyId,
        communityId,
        status: "ACTIVE",
      },
      include: {
        user1: {
          select: {
            id: true,
            name: true,
            username: true,
            image: true,
          },
        },
        user2: {
          select: {
            id: true,
            name: true,
            username: true,
            image: true,
          },
        },
      },
    });

    // Check for achievements for both users (don't await)
    checkAndUnlockAchievements(userId).catch(console.error);
    checkAndUnlockAchievements(buddyId).catch(console.error);

    revalidatePath(`/dashboard/c/${communityId}/buddy`);

    return { success: true, partnership };
  } catch (error) {
    console.error("Error creating buddy partnership:", error);
    return { success: false, error: "Failed to create partnership" };
  }
}

/**
 * Get current user's buddy partnership
 */
export async function getMyBuddyPartnership(communityId: string) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, error: "Not authenticated", partnership: null };
    }

    const partnership = await prisma.buddyPartnership.findFirst({
      where: {
        communityId,
        status: "ACTIVE",
        OR: [{ user1Id: userId }, { user2Id: userId }],
      },
      include: {
        user1: {
          select: {
            id: true,
            name: true,
            image: true,
            level: true,
          },
        },
        user2: {
          select: {
            id: true,
            name: true,
            image: true,
            level: true,
          },
        },
        goals: {
          orderBy: { createdAt: "desc" },
        },
        checkIns: {
          orderBy: { createdAt: "desc" },
          take: 10,
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
        },
      },
    });

    if (!partnership) {
      return { success: true, partnership: null };
    }

    // Determine who is the buddy (the other person)
    const buddy = partnership.user1Id === userId ? partnership.user2 : partnership.user1;

    return { success: true, partnership, buddy };
  } catch (error) {
    console.error("Error getting buddy partnership:", error);
    return { success: false, error: "Failed to get partnership", partnership: null };
  }
}

/**
 * Create a shared goal
 */
export async function createBuddyGoal(partnershipId: string, title: string, description?: string, targetDate?: Date) {
  try {
    const goal = await prisma.buddyGoal.create({
      data: {
        partnershipId,
        title,
        description,
        targetDate,
      },
    });

    revalidatePath(`/dashboard/c/*/buddy`);

    return { success: true, goal };
  } catch (error) {
    console.error("Error creating buddy goal:", error);
    return { success: false, error: "Failed to create goal" };
  }
}

/**
 * Complete a goal
 */
export async function completeBuddyGoal(goalId: string) {
  try {
    const goal = await prisma.buddyGoal.update({
      where: { id: goalId },
      data: {
        completed: true,
        completedAt: new Date(),
      },
    });

    revalidatePath(`/dashboard/c/*/buddy`);

    return { success: true, goal };
  } catch (error) {
    console.error("Error completing buddy goal:", error);
    return { success: false, error: "Failed to complete goal" };
  }
}

/**
 * Create a check-in
 */
export async function createBuddyCheckIn(
  partnershipId: string,
  mood: number,
  notes?: string,
  completedGoals?: string[]
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, error: "Not authenticated" };
    }

    const checkIn = await prisma.buddyCheckIn.create({
      data: {
        partnershipId,
        userId,
        mood,
        notes,
        completedGoals: completedGoals || [],
      },
    });

    revalidatePath(`/dashboard/c/*/buddy`);

    return { success: true, checkIn };
  } catch (error) {
    console.error("Error creating buddy check-in:", error);
    return { success: false, error: "Failed to create check-in" };
  }
}

/**
 * End a buddy partnership
 */
export async function endBuddyPartnership(partnershipId: string) {
  try {
    const partnership = await prisma.buddyPartnership.update({
      where: { id: partnershipId },
      data: {
        status: "ENDED",
        endedAt: new Date(),
      },
    });

    revalidatePath(`/dashboard/c/*/buddy`);

    return { success: true, partnership };
  } catch (error) {
    console.error("Error ending buddy partnership:", error);
    return { success: false, error: "Failed to end partnership" };
  }
}
