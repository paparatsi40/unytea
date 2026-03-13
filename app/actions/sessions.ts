"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserId } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { nanoid } from "nanoid";

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
  recurrence?: "weekly" | "monthly";
  recurrenceCount?: number;
  postToFeed?: boolean; // Whether to auto-post to community feed (default: true)
}) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return { success: false, error: "Not authenticated" };
    }

    // Generate unique room ID
    const roomId = `session-${nanoid(12)}`;

    // Create the session
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
        menteeId: userId,
        communityId: data.communityId, // Link to community
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
        community: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    // Auto-post to community feed if communityId exists and postToFeed is not false
    if (data.communityId && data.postToFeed !== false) {
      try {
        // Create a special post announcing the session
        await prisma.post.create({
          data: {
            title: `📅 New live session: ${data.title}`,
            content: `A new live session has been scheduled in this community.`,
            contentType: "SESSION_ANNOUNCEMENT",
            authorId: userId,
            communityId: data.communityId,
            // Store session data in attachments for the special card rendering
            attachments: {
              sessionId: session.id,
              sessionTitle: data.title,
              sessionDescription: data.description,
              scheduledAt: data.scheduledAt.toISOString(),
              duration: data.duration,
              mentorId: userId,
              mentorName: session.mentor.name,
              mentorImage: session.mentor.image,
            },
          },
        });

        // Also revalidate the community feed
        revalidatePath(`/dashboard/c/${session.community?.slug}/feed`);
        revalidatePath(`/dashboard/communities/${data.communityId}/sessions`);
      } catch (postError) {
        console.error("Error creating session announcement post:", postError);
        // Don't fail the session creation if the post fails
      }
    }

    revalidatePath("/dashboard/sessions");
    revalidatePath("/dashboard/agenda");
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
      select: {
        id: true,
        title: true,
        description: true,
        scheduledAt: true,
        duration: true,
        status: true,
        recordingUrl: true,
        mentorId: true,
        menteeId: true,
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

    const updatedSession = await prisma.mentorSession.update({
      where: { id: sessionId },
      data: {
        status: "COMPLETED",
        endedAt: new Date(),
        mentorNotes: notes,
      },
    });

    revalidatePath("/dashboard/sessions");
    return { success: true, session: updatedSession };
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