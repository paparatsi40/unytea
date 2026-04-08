"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth-utils";

export interface OnboardingProgress {
  hasProfile: boolean;
  hasJoinedCommunity: boolean;
  hasCreatedPost: boolean;
  hasAttendedSession: boolean;
  hasCompletedLesson: boolean;
  hasBuddy: boolean;
}

export async function getOnboardingProgress(): Promise<{
  success: boolean;
  progress?: OnboardingProgress;
  showChecklist?: boolean;
}> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return { success: false };

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        bio: true,
        image: true,
        interests: true,
        isOnboarded: true,
        createdAt: true,
      },
    });

    if (!user) return { success: false };

    // Only show checklist for users created in last 30 days
    const daysSinceCreation = Math.floor(
      (Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSinceCreation > 30) return { success: true, showChecklist: false };

    const [membership, post, sessionParticipation, lessonProgress, buddy] =
      await Promise.all([
        prisma.member.findFirst({ where: { userId, status: "ACTIVE" } }),
        prisma.post.findFirst({ where: { authorId: userId } }),
        prisma.sessionParticipation.findFirst({ where: { userId } }),
        prisma.lessonProgress.findFirst({
          where: { enrollment: { userId }, isCompleted: true },
        }),
        prisma.buddyPartnership.findFirst({
          where: {
            status: "ACTIVE",
            OR: [{ user1Id: userId }, { user2Id: userId }],
          },
        }),
      ]);

    const progress: OnboardingProgress = {
      hasProfile: !!(user.name && user.bio && (user.interests as string[]).length > 0),
      hasJoinedCommunity: !!membership,
      hasCreatedPost: !!post,
      hasAttendedSession: !!sessionParticipation,
      hasCompletedLesson: !!lessonProgress,
      hasBuddy: !!buddy,
    };

    const allDone = Object.values(progress).every(Boolean);

    return {
      success: true,
      progress,
      showChecklist: !allDone,
    };
  } catch (error) {
    console.error("[getOnboardingProgress] Error:", error);
    return { success: false };
  }
}
