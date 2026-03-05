"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

/**
 * Submit feedback for a session
 */
export async function submitSessionFeedback(
  sessionId: string,
  rating: number,
  comment?: string
) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  // Validate rating
  if (rating < 1 || rating > 5) {
    throw new Error("Invalid rating. Must be between 1 and 5");
  }

  // Check if session exists and user participated
  const mentorSession = await prisma.mentorSession.findUnique({
    where: { id: sessionId },
    include: {
      participation: {
        where: { userId: session.user.id },
      },
    },
  });

  if (!mentorSession) {
    throw new Error("Session not found");
  }

  // Check if user participated in the session
  if (mentorSession.participation.length === 0) {
    throw new Error("You did not participate in this session");
  }

  // Check if user already submitted feedback
  const existingFeedback = await prisma.sessionFeedback.findFirst({
    where: {
      sessionId,
      userId: session.user.id,
    },
  });

  if (existingFeedback) {
    // Update existing feedback
    const updated = await prisma.sessionFeedback.update({
      where: { id: existingFeedback.id },
      data: {
        rating,
        comment,
      },
    });

    revalidatePath(`/dashboard/sessions/${sessionId}`);
    return updated;
  }

  // Create new feedback
  const feedback = await prisma.sessionFeedback.create({
    data: {
      sessionId,
      userId: session.user.id,
      rating,
      comment,
    },
  });

  revalidatePath(`/dashboard/sessions/${sessionId}`);
  return feedback;
}

/**
 * Get feedback for a session (host only)
 */
export async function getSessionFeedback(sessionId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  // Check if user is the host of the session
  const mentorSession = await prisma.mentorSession.findUnique({
    where: { id: sessionId },
  });

  if (!mentorSession) {
    throw new Error("Session not found");
  }

  if (mentorSession.mentorId !== session.user.id) {
    throw new Error("Only the session host can view feedback");
  }

  // Get all feedback for the session
  const feedback = await prisma.sessionFeedback.findMany({
    where: { sessionId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  // Calculate statistics
  const totalFeedback = feedback.length;
  const averageRating =
    totalFeedback > 0
      ? feedback.reduce((sum, f) => sum + f.rating, 0) / totalFeedback
      : 0;

  const ratingDistribution = [1, 2, 3, 4, 5].map((rating) => ({
    rating,
    count: feedback.filter((f) => f.rating === rating).length,
  }));

  return {
    feedback,
    stats: {
      total: totalFeedback,
      average: averageRating,
      distribution: ratingDistribution,
    },
  };
}

/**
 * Check if user has submitted feedback for a session
 */
export async function hasSubmittedFeedback(sessionId: string): Promise<boolean> {
  const session = await auth();
  if (!session?.user?.id) {
    return false;
  }

  const feedback = await prisma.sessionFeedback.findFirst({
    where: {
      sessionId,
      userId: session.user.id,
    },
  });

  return !!feedback;
}
