"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserId } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { nanoid } from "nanoid";
import { canStartVideoCall } from "@/lib/subscription-plans";
import { trackVideoUsage, updateMemberCount } from "@/lib/usage-tracking";
import { notifySessionStarted } from "@/lib/notifications";

/**
 * Create a new video session
 */
export async function createSession(data: {
  title: string;
  description?: string;
  scheduledAt: Date;
  duration: number; // in minutes
  communityId?: string;
  isPrivate?: boolean;
}) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return { success: false, error: "Not authenticated" };
    }

    // 🔐 CHECK IF USER IS COMMUNITY OWNER OR HAS PERMISSION (if communityId provided)
    if (data.communityId) {
      const community = await prisma.community.findUnique({
        where: { id: data.communityId },
        select: { 
          ownerId: true,
          members: {
            where: { userId },
            select: { 
              role: true,
              permissions: true,
            },
          },
        },
      });

      if (!community) {
        return { success: false, error: "Community not found" };
      }

      const isOwner = community.ownerId === userId;
      const member = community.members[0];
      
      // Check if user has permission to create sessions
      const canCreateSessions = 
        isOwner || 
        member?.role === "ADMIN" || 
        member?.role === "MODERATOR" || 
        member?.role === "MENTOR" ||
        (member?.permissions as any)?.canCreateSessions === true;

      if (!canCreateSessions) {
        return { 
          success: false, 
          error: "You don't have permission to create sessions in this community" 
        };
      }
    }

    // 🔐 CHECK VIDEO CALL LIMIT
    const callLimitCheck = await canStartVideoCall(userId);
    if (!callLimitCheck.allowed) {
      return { 
        success: false, 
        error: callLimitCheck.reason || "Video call limit reached for this month",
        limitReached: true,
        currentCount: callLimitCheck.currentCount,
        limit: callLimitCheck.limit,
      };
    }

    // Generate unique room ID
    const roomId = `session-${nanoid(12)}`;

    const session = await prisma.mentorSession.create({
      data: {
        title: data.title,
        description: data.description,
        scheduledAt: data.scheduledAt,
        duration: data.duration,
        timezone: "UTC",
        roomId,
        status: "SCHEDULED",
        mentorId: userId,
        menteeId: userId, // For now, creator is both mentor and mentee
        communityId: data.communityId, // Add communityId
      },
      include: {
        mentor: {
          select: {
            id: true,
            name: true,
            image: true,
            username: true,
          },
        },
      },
    });

    // Revalidate both global and community-specific pages
    revalidatePath("/dashboard/sessions");
    if (data.communityId) {
      revalidatePath(`/dashboard/communities/${data.communityId}/sessions`);
    }
    
    return { success: true, session };
  } catch (error) {
    console.error("Error creating session:", error);
    return { success: false, error: "Failed to create session" };
  }
}

/**
 * Get user's sessions
 */
export async function getUserSessions() {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return { success: false, error: "Not authenticated" };
    }

    const sessions = await prisma.mentorSession.findMany({
      where: {
        OR: [
          { mentorId: userId },
          { menteeId: userId },
        ],
      },
      include: {
        mentor: {
          select: {
            id: true,
            name: true,
            image: true,
            username: true,
          },
        },
        mentee: {
          select: {
            id: true,
            name: true,
            image: true,
            username: true,
          },
        },
      },
      orderBy: {
        scheduledAt: "asc",
      },
    });

    // Separate upcoming and past sessions
    const now = new Date();
    const upcoming = sessions.filter((s) => new Date(s.scheduledAt) > now);
    const past = sessions.filter((s) => new Date(s.scheduledAt) <= now);

    return { success: true, sessions: { upcoming, past } };
  } catch (error) {
    console.error("Error fetching sessions:", error);
    return { success: false, error: "Failed to fetch sessions" };
  }
}

/**
 * Get a specific session
 */
export async function getSession(sessionId: string) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return { success: false, error: "Not authenticated" };
    }

    const session = await prisma.mentorSession.findUnique({
      where: { id: sessionId },
      include: {
        mentor: {
          select: {
            id: true,
            name: true,
            image: true,
            username: true,
          },
        },
        mentee: {
          select: {
            id: true,
            name: true,
            image: true,
            username: true,
          },
        },
      },
    });

    if (!session) {
      return { success: false, error: "Session not found" };
    }

    // Check if user is participant
    if (session.mentorId !== userId && session.menteeId !== userId) {
      return { success: false, error: "Not authorized to view this session" };
    }

    return { success: true, session };
  } catch (error) {
    console.error("Error fetching session:", error);
    return { success: false, error: "Failed to fetch session" };
  }
}

/**
 * Start a session
 */
export async function startSession(sessionId: string) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return { success: false, error: "Not authenticated" };
    }

    const session = await prisma.mentorSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return { success: false, error: "Session not found" };
    }

    // Check if user is mentor
    if (session.mentorId !== userId) {
      return { success: false, error: "Only the host can start the session" };
    }

    const updatedSession = await prisma.mentorSession.update({
      where: { id: sessionId },
      data: {
        status: "IN_PROGRESS",
        startedAt: new Date(),
      },
    });

    await notifySessionStarted(sessionId);

    revalidatePath("/dashboard/sessions");
    return { success: true, session: updatedSession };
  } catch (error) {
    console.error("Error starting session:", error);
    return { success: false, error: "Failed to start session" };
  }
}

/**
 * End a session
 */
export async function endSession(sessionId: string, notes?: string) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return { success: false, error: "Not authenticated" };
    }

    const session = await prisma.mentorSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return { success: false, error: "Session not found" };
    }

    // Check if user is mentor
    if (session.mentorId !== userId) {
      return { success: false, error: "Only the host can end the session" };
    }

    const endTime = new Date();
    const startTime = session.startedAt || session.scheduledAt;
    const durationMinutes = Math.ceil((endTime.getTime() - startTime.getTime()) / (1000 * 60));

    const updatedSession = await prisma.mentorSession.update({
      where: { id: sessionId },
      data: {
        status: "COMPLETED",
        endedAt: endTime,
        mentorNotes: notes,
      },
    });

    // 📊 TRACK VIDEO USAGE
    try {
      const usageResult = await trackVideoUsage(userId, durationMinutes);
      
      // Log if approaching limits or has overage
      if (usageResult.shouldAlert) {
        console.log(`⚠️ User ${userId} approaching video limits:`, {
          currentUsage: usageResult.currentUsage,
          limit: usageResult.limit,
          overageCost: usageResult.overageCost,
        });
        
        // TODO: Send notification to user
        // await createNotification({
        //   userId,
        //   type: "USAGE_ALERT",
        //   title: "Approaching Video Hour Limit",
        //   message: `You've used ${usageResult.currentUsage.toFixed(1)}/${usageResult.limit} video hours this billing cycle.`
        // });
      }
    } catch (trackingError) {
      // Don't fail the session end if tracking fails
      console.error("Error tracking video usage:", trackingError);
    }

    revalidatePath("/dashboard/sessions");
    return { 
      success: true, 
      session: updatedSession,
      durationMinutes, // Return duration for client-side display
    };
  } catch (error) {
    console.error("Error ending session:", error);
    return { success: false, error: "Failed to end session" };
  }
}

/**
 * Cancel a session
 */
export async function cancelSession(sessionId: string) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return { success: false, error: "Not authenticated" };
    }

    const session = await prisma.mentorSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return { success: false, error: "Session not found" };
    }

    // Check if user is mentor or mentee
    if (session.mentorId !== userId && session.menteeId !== userId) {
      return { success: false, error: "Not authorized to cancel this session" };
    }

    const updatedSession = await prisma.mentorSession.update({
      where: { id: sessionId },
      data: {
        status: "CANCELLED",
      },
    });

    revalidatePath("/dashboard/sessions");
    return { success: true, session: updatedSession };
  } catch (error) {
    console.error("Error cancelling session:", error);
    return { success: false, error: "Failed to cancel session" };
  }
}

/**
 * Delete a session
 */
export async function deleteSession(sessionId: string) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return { success: false, error: "Not authenticated" };
    }

    const session = await prisma.mentorSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return { success: false, error: "Session not found" };
    }

    // Check if user is mentor
    if (session.mentorId !== userId) {
      return { success: false, error: "Only the host can delete the session" };
    }

    await prisma.mentorSession.delete({
      where: { id: sessionId },
    });

    revalidatePath("/dashboard/sessions");
    return { success: true };
  } catch (error) {
    console.error("Error deleting session:", error);
    return { success: false, error: "Failed to delete session" };
  }
}