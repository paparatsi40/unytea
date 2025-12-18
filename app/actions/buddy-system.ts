"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

// =====================================================
// BUDDY MATCHING
// =====================================================

/**
 * Auto-match users in a community based on skills/interests
 */
export async function autoMatchBuddies(communityId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    // Verify user is owner/admin
    const community = await prisma.community.findUnique({
      where: { id: communityId },
      select: { ownerId: true },
    });

    if (!community || community.ownerId !== session.user.id) {
      return { success: false, error: "Not authorized" };
    }

    // Get all members without active buddy pairs
    const members = await prisma.member.findMany({
      where: {
        communityId,
        status: "ACTIVE",
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            skills: true,
            interests: true,
            level: true,
          },
        },
      },
    });

    // Simple matching algorithm: pair users with complementary skills
    const unmatched = members.filter(async (member) => {
      const existingPair = await prisma.buddyPair.findFirst({
        where: {
          communityId,
          OR: [
            { mentor: member.userId },
            { mentee: member.userId },
          ],
          status: "active",
        },
      });
      return !existingPair;
    });

    const pairs = [];
    for (let i = 0; i < unmatched.length - 1; i += 2) {
      const user1 = unmatched[i];
      const user2 = unmatched[i + 1];

      // Higher level user becomes mentor
      const mentor = user1.user.level >= user2.user.level ? user1.userId : user2.userId;
      const mentee = user1.user.level >= user2.user.level ? user2.userId : user1.userId;

      const pair = await prisma.buddyPair.create({
        data: {
          communityId,
          mentor,
          mentee,
          status: "active",
        },
      });

      pairs.push(pair);
    }

    revalidatePath(`/dashboard/communities/${communityId}/buddies`);
    return { success: true, pairs: pairs.length };
  } catch (error: any) {
    console.error("Error auto-matching buddies:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Create manual buddy pair
 */
export async function createBuddyPair(
  communityId: string,
  mentorId: string,
  menteeId: string
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    // Verify user is owner/admin or one of the users in the pair
    const community = await prisma.community.findUnique({
      where: { id: communityId },
      select: { ownerId: true },
    });

    const isOwner = community?.ownerId === session.user.id;
    const isParticipant = session.user.id === mentorId || session.user.id === menteeId;

    if (!isOwner && !isParticipant) {
      return { success: false, error: "Not authorized" };
    }

    // Check if pair already exists
    const existing = await prisma.buddyPair.findFirst({
      where: {
        communityId,
        OR: [
          { mentor: mentorId, mentee: menteeId },
          { mentor: menteeId, mentee: mentorId },
        ],
        status: "active",
      },
    });

    if (existing) {
      return { success: false, error: "Buddy pair already exists" };
    }

    const pair = await prisma.buddyPair.create({
      data: {
        communityId,
        mentor: mentorId,
        mentee: menteeId,
        status: "active",
      },
      include: {
        mentorUser: { select: { name: true, image: true } },
        menteeUser: { select: { name: true, image: true } },
      },
    });

    revalidatePath(`/dashboard/communities/${communityId}/buddies`);
    return { success: true, pair };
  } catch (error: any) {
    console.error("Error creating buddy pair:", error);
    return { success: false, error: error.message };
  }
}

/**
 * End buddy pair
 */
export async function endBuddyPair(pairId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const pair = await prisma.buddyPair.findUnique({
      where: { id: pairId },
      include: {
        community: { select: { ownerId: true } },
      },
    });

    if (!pair) {
      return { success: false, error: "Pair not found" };
    }

    // Verify user is owner/admin or one of the users in the pair
    const isOwner = pair.community.ownerId === session.user.id;
    const isParticipant = 
      session.user.id === pair.mentor || session.user.id === pair.mentee;

    if (!isOwner && !isParticipant) {
      return { success: false, error: "Not authorized" };
    }

    await prisma.buddyPair.update({
      where: { id: pairId },
      data: {
        status: "completed",
        endedAt: new Date(),
      },
    });

    revalidatePath(`/dashboard/communities/${pair.communityId}/buddies`);
    return { success: true };
  } catch (error: any) {
    console.error("Error ending buddy pair:", error);
    return { success: false, error: error.message };
  }
}

// =====================================================
// BUDDY INTERACTIONS
// =====================================================

/**
 * Get my buddy pair in a community
 */
export async function getMyBuddyPair(communityId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const pair = await prisma.buddyPair.findFirst({
      where: {
        communityId,
        OR: [
          { mentor: session.user.id },
          { mentee: session.user.id },
        ],
        status: "active",
      },
      include: {
        mentorUser: {
          select: {
            id: true,
            name: true,
            image: true,
            email: true,
            skills: true,
            level: true,
          },
        },
        menteeUser: {
          select: {
            id: true,
            name: true,
            image: true,
            email: true,
            interests: true,
            level: true,
          },
        },
      },
    });

    if (!pair) {
      return { success: true, pair: null };
    }

    // Determine role
    const isMentor = pair.mentor === session.user.id;
    const buddy = isMentor ? pair.menteeUser : pair.mentorUser;
    const role = isMentor ? "mentor" : "mentee";

    return {
      success: true,
      pair: {
        id: pair.id,
        role,
        buddy,
        startedAt: pair.startedAt,
        notes: pair.notes,
      },
    };
  } catch (error: any) {
    console.error("Error getting buddy pair:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all buddy pairs in a community (admin)
 */
export async function getAllBuddyPairs(communityId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    // Verify user is owner/admin
    const community = await prisma.community.findUnique({
      where: { id: communityId },
      select: { ownerId: true },
    });

    if (!community || community.ownerId !== session.user.id) {
      return { success: false, error: "Not authorized" };
    }

    const pairs = await prisma.buddyPair.findMany({
      where: { communityId },
      include: {
        mentorUser: {
          select: {
            id: true,
            name: true,
            image: true,
            level: true,
          },
        },
        menteeUser: {
          select: {
            id: true,
            name: true,
            image: true,
            level: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return { success: true, pairs };
  } catch (error: any) {
    console.error("Error getting buddy pairs:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Update buddy pair notes
 */
export async function updateBuddyNotes(pairId: string, notes: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const pair = await prisma.buddyPair.findUnique({
      where: { id: pairId },
    });

    if (!pair) {
      return { success: false, error: "Pair not found" };
    }

    // Verify user is in the pair
    if (pair.mentor !== session.user.id && pair.mentee !== session.user.id) {
      return { success: false, error: "Not authorized" };
    }

    await prisma.buddyPair.update({
      where: { id: pairId },
      data: { notes },
    });

    revalidatePath(`/dashboard/communities/${pair.communityId}/buddies`);
    return { success: true };
  } catch (error: any) {
    console.error("Error updating buddy notes:", error);
    return { success: false, error: error.message };
  }
}