"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import {
  LiveSessionEventType,
  LIVE_SESSION_POINTS,
  SessionParticipationData,
  DEFAULT_PARTICIPATION_DATA,
  calculateEventPoints,
} from "@/lib/live-gamification";

/**
 * Track when a user joins a live session
 */
export async function trackSessionJoin(sessionId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      throw new Error("Unauthorized");
    }

    const userId = session.user.id;

    // Check if participation record already exists
    const existing = await prisma.sessionParticipation.findUnique({
      where: {
        sessionId_userId: {
          sessionId,
          userId,
        },
      },
    });

    if (existing) {
      return { success: true, alreadyTracked: true };
    }

    // Get session details to check if joined early
    const mentorSession = await prisma.mentorSession.findUnique({
      where: { id: sessionId },
      select: { scheduledAt: true, duration: true },
    });

    if (!mentorSession) {
      throw new Error("Session not found");
    }

    const now = new Date();
    const scheduledStart = new Date(mentorSession.scheduledAt);
    const minutesFromStart = (now.getTime() - scheduledStart.getTime()) / (1000 * 60);
    const joinedEarly = minutesFromStart <= 5;

    // Calculate points for joining
    const points = LIVE_SESSION_POINTS.JOIN_SESSION + (joinedEarly ? 5 : 0);

    // Create participation record
    const participation = await prisma.sessionParticipation.create({
      data: {
        sessionId,
        userId,
        pointsEarned: points,
        eventsData: {
          ...DEFAULT_PARTICIPATION_DATA,
          joinedEarly,
        },
      },
    });

    // Update user points
    await prisma.user.update({
      where: { id: userId },
      data: {
        points: {
          increment: points,
        },
      },
    });

    // Check for "First Live Session" achievement
    const totalSessions = await prisma.sessionParticipation.count({
      where: { userId },
    });

    if (totalSessions === 1) {
      // Trigger first session achievement
      // (You can integrate with your existing achievements system here)
    }

    return {
      success: true,
      pointsEarned: points,
      totalPoints: participation.pointsEarned,
      joinedEarly,
    };
  } catch (error) {
    console.error("Error tracking session join:", error);
    throw error;
  }
}

/**
 * Track a live session event and award points
 */
export async function trackLiveEvent(
  sessionId: string,
  eventType: LiveSessionEventType
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      throw new Error("Unauthorized");
    }

    const userId = session.user.id;

    // Get current participation data
    const participation = await prisma.sessionParticipation.findUnique({
      where: {
        sessionId_userId: {
          sessionId,
          userId,
        },
      },
    });

    if (!participation) {
      throw new Error("Participation not found. User must join session first.");
    }

    const currentData = (participation.eventsData as SessionParticipationData) ||
      DEFAULT_PARTICIPATION_DATA;

    // Calculate points for this event
    const points = calculateEventPoints(eventType, currentData);

    if (points === 0) {
      return { success: true, pointsEarned: 0, message: "Event limit reached" };
    }

    // Update participation data based on event type
    const updatedData = { ...currentData };
    
    switch (eventType) {
      case "ASK_QUESTION":
        updatedData.questionsAsked++;
        break;
      case "ANSWER_QUESTION":
        updatedData.questionsAnswered++;
        break;
      case "COMPLETE_POLL":
        updatedData.pollsCompleted++;
        break;
      case "COMPLETE_TASK":
        updatedData.tasksCompleted++;
        break;
      case "SHARE_RESOURCE":
        updatedData.resourcesShared++;
        break;
      case "REACT_TO_CONTENT":
        updatedData.reactionsGiven++;
        break;
      case "SPEAK_ON_STAGE":
        updatedData.spokeOnStage = true;
        break;
    }

    // Update participation record
    await prisma.sessionParticipation.update({
      where: {
        sessionId_userId: {
          sessionId,
          userId,
        },
      },
      data: {
        pointsEarned: {
          increment: points,
        },
        eventsData: updatedData,
      },
    });

    // Update user total points
    await prisma.user.update({
      where: { id: userId },
      data: {
        points: {
          increment: points,
        },
      },
    });

    return {
      success: true,
      pointsEarned: points,
      eventType,
    };
  } catch (error) {
    console.error("Error tracking live event:", error);
    throw error;
  }
}

/**
 * Track when user leaves session and calculate final points
 */
export async function trackSessionLeave(sessionId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      throw new Error("Unauthorized");
    }

    const userId = session.user.id;

    // Get participation record
    const participation = await prisma.sessionParticipation.findUnique({
      where: {
        sessionId_userId: {
          sessionId,
          userId,
        },
      },
    });

    if (!participation) {
      return { success: true, message: "No participation record found" };
    }

    // Get session details
    const mentorSession = await prisma.mentorSession.findUnique({
      where: { id: sessionId },
      select: { scheduledAt: true, duration: true },
    });

    if (!mentorSession) {
      throw new Error("Session not found");
    }

    const now = new Date();
    const joinedAt = new Date(participation.joinedAt);
    const minutesAttended = (now.getTime() - joinedAt.getTime()) / (1000 * 60);
    const requiredMinutes = mentorSession.duration * 0.9; // 90% of session
    const stayedFull = minutesAttended >= requiredMinutes;

    let bonusPoints = 0;
    const currentData = (participation.eventsData as SessionParticipationData) ||
      DEFAULT_PARTICIPATION_DATA;
    const updatedData = { ...currentData, stayedFull };

    if (stayedFull) {
      bonusPoints = LIVE_SESSION_POINTS.STAY_FULL_SESSION;
    }

    // Update participation record
    await prisma.sessionParticipation.update({
      where: {
        sessionId_userId: {
          sessionId,
          userId,
        },
      },
      data: {
        leftAt: now,
        pointsEarned: {
          increment: bonusPoints,
        },
        eventsData: updatedData,
      },
    });

    if (bonusPoints > 0) {
      // Update user points
      await prisma.user.update({
        where: { id: userId },
        data: {
          points: {
            increment: bonusPoints,
          },
        },
      });
    }

    return {
      success: true,
      bonusPoints,
      stayedFull,
      minutesAttended: Math.round(minutesAttended),
    };
  } catch (error) {
    console.error("Error tracking session leave:", error);
    throw error;
  }
}

/**
 * Get user's participation stats for current session
 */
export async function getSessionParticipationStats(sessionId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      throw new Error("Unauthorized");
    }

    const participation = await prisma.sessionParticipation.findUnique({
      where: {
        sessionId_userId: {
          sessionId,
          userId: session.user.id,
        },
      },
    });

    if (!participation) {
      return null;
    }

    return {
      pointsEarned: participation.pointsEarned,
      eventsData: participation.eventsData as SessionParticipationData,
      joinedAt: participation.joinedAt,
    };
  } catch (error) {
    console.error("Error getting participation stats:", error);
    return null;
  }
}
