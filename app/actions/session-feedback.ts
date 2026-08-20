"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { defineAction } from "@/lib/actions/define-action";
import { communityOfSession } from "@/lib/actions/resolvers";

/**
 * Submit feedback for a session
 */
export const submitSessionFeedback = defineAction(
  {
    name: "submitSessionFeedback",
    auth: "member",
    args: [
      z.string().min(1).max(64),
      z.number().int().min(1).max(5),
      z.string().max(5000).optional(),
    ],
    community: ([sessionId]) => communityOfSession(sessionId),
    rateLimit: "create",
  },
  async (ctx, sessionId: string, rating: number, comment?: string) => {
    const session = { user: { id: ctx.userId } };

    // Validate rating
    if (rating < 1 || rating > 5) {
      throw new Error("Invalid rating. Must be between 1 and 5");
    }

    // Check if session exists and user participated
    const mentorSession = await prisma.mentorSession.findUnique({
      where: { id: sessionId },
      include: {
        participations: {
          where: { userId: session.user.id },
        },
      },
    });

    if (!mentorSession) {
      throw new Error("Session not found");
    }

    // Check if user participated in the session
    if (mentorSession.participations.length === 0) {
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
);

/**
 * Get feedback for a session (host only)
 */
export const getSessionFeedback = defineAction(
  {
    name: "getSessionFeedback",
    auth: "member",
    args: [z.string().min(1).max(64)],
    community: ([sessionId]) => communityOfSession(sessionId),
  },
  async (ctx, sessionId: string) => {
    const session = { user: { id: ctx.userId } };

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
      totalFeedback > 0 ? feedback.reduce((sum, f) => sum + f.rating, 0) / totalFeedback : 0;

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
);

/**
 * Check if user has submitted feedback for a session
 */
export const hasSubmittedFeedback = defineAction(
  {
    name: "hasSubmittedFeedback",
    auth: "member",
    args: [z.string().min(1).max(64)],
    community: ([sessionId]) => communityOfSession(sessionId),
  },
  async (ctx, sessionId: string) => {
    const session = { user: { id: ctx.userId } };

    const feedback = await prisma.sessionFeedback.findFirst({
      where: {
        sessionId,
        userId: session.user.id,
      },
    });

    return !!feedback;
  }
);
