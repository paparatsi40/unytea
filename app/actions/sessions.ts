"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { defineAction } from "@/lib/actions/define-action";
import { communityById, communityOfSeries, communityOfSession } from "@/lib/actions/resolvers";
import { assertCommunityMemberIfScoped } from "@/lib/actions/guards";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { nanoid } from "nanoid";
import { startSessionAutopilot } from "@/lib/jobs/autopilot";
import { generateUpcomingSessions } from "@/lib/jobs/session-schedule";

/** Sesión con el mentor incluido (shape de las acciones de creación). */
type SessionWithMentor = Prisma.MentorSessionGetPayload<{
  include: { mentor: { select: { id: true; name: true; image: true; username: true } } };
}>;

/** Sesión de detalle: mentor + mentee + community + notes + recording + _count (retorno de getSession). */
export type SessionDetail = Prisma.MentorSessionGetPayload<{
  include: {
    mentor: { select: { id: true; name: true; image: true; username: true } };
    mentee: { select: { id: true; name: true; image: true; username: true } };
    community: { select: { id: true; name: true; slug: true } };
    notes: true;
    recording: { select: { url: true; status: true; durationSeconds: true } };
    _count: { select: { participations: true } };
  };
}>;

/**
 * Create a new video session
 */
export const createSession = defineAction(
  {
    name: "createSession",
    auth: "user",
    args: [
      z.object({
        title: z.string().min(1).max(300),
        description: z.string().max(10_000).optional(),
        scheduledAt: z.coerce.date(),
        duration: z.number().int().min(1).max(1440),
        communityId: z.string().min(1).max(64).optional(),
        isPrivate: z.boolean().optional(),
        recurrence: z.enum(["weekly", "monthly"]).optional(),
        recurrenceCount: z.number().int().min(1).max(52).optional(),
        postToFeed: z.boolean().optional(),
      }),
    ],
    rateLimit: "create",
  },
  async (ctx, data: { title: string; description?: string; scheduledAt: Date; duration: number; communityId?: string; isPrivate?: boolean; recurrence?: "weekly" | "monthly"; recurrenceCount?: number; postToFeed?: boolean; }) => {
    // The session — and the SESSION_ANNOUNCEMENT feed post it creates — is
    // attached to a caller-supplied communityId. Without this, any
    // authenticated non-member could inject content into an arbitrary tenant's
    // feed (M2). communityId is nullable for standalone sessions, so the check
    // applies only when one is supplied.
    await assertCommunityMemberIfScoped(ctx, data.communityId);
  try {
    const userId = ctx.userId;

    // Generate unique room ID
    const roomId = `session-${nanoid(12)}`;

    // Create the session - handle case where communityId field doesn't exist in DB yet
    const sessionData: Prisma.MentorSessionUncheckedCreateInput = {
      title: data.title,
      description: data.description,
      scheduledAt: data.scheduledAt,
      duration: data.duration,
      timezone: "UTC",
      roomId,
      status: "SCHEDULED",
      mentorId: userId,
      menteeId: userId,
    };

    // Assign communityId — fall back to user's first community if not provided
    if (data.communityId) {
      sessionData.communityId = data.communityId;
    } else {
      const fallbackCommunity = await prisma.community.findFirst({
        where: {
          OR: [{ ownerId: userId }, { members: { some: { userId, status: "ACTIVE" } } }],
        },
        select: { id: true },
        orderBy: { createdAt: "asc" },
      });
      if (fallbackCommunity) {
        sessionData.communityId = fallbackCommunity.id;
      }
    }

    // Create the session
    const session = await prisma.mentorSession.create({
      data: sessionData,
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

    // Auto-post to community feed if communityId exists and postToFeed is not false
    if (data.communityId && data.postToFeed !== false) {
      try {
        // Create a special post announcing the session
        await prisma.post.create({
          data: {
            title: `ðŸ“… New live session: ${data.title}`,
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
        revalidatePath(`/dashboard/communities/${data.communityId}/sessions`);

        // Try to get community slug for feed revalidation if communityId exists
        try {
          const community = await prisma.community.findUnique({
            where: { id: data.communityId },
            select: { slug: true },
          });
          if (community?.slug) {
            revalidatePath(`/dashboard/c/${community.slug}/feed`);
          }
        } catch {
          // Ignore if community lookup fails
        }
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
);

/**
 * Get user's sessions
 */
export const getUserSessions = defineAction(
  {
    name: "getUserSessions",
    auth: "user",
    args: [],
  },
  async (ctx) => {
  try {

    const userId = ctx.userId;

    // Get community IDs where the user is an active member
    const userMemberships = await prisma.member.findMany({
      where: {
        userId,
        status: "ACTIVE",
      },
      select: { communityId: true },
    });
    const memberCommunityIds = userMemberships.map((m) => m.communityId);

    const sessions = await prisma.mentorSession.findMany({
      where: {
        OR: [
          { mentorId: userId },
          { menteeId: userId },
          // Include community sessions where user is an active member
          ...(memberCommunityIds.length > 0 ? [{ communityId: { in: memberCommunityIds } }] : []),
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
);

/**
 * Get a specific session
 */
export const getSession = defineAction(
  {
    name: "getSession",
    auth: "member",
    args: [z.string().min(1).max(64)],
    community: ([sessionId]) => communityOfSession(sessionId),
  },
  async (ctx, sessionId: string) => {
  try {

    const userId = ctx.userId;

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
        // Incluidos para el detail page (notes tab, nombre de comunidad,
        // redirect de reutilización). Antes faltaban → 3 features degradadas.
        community: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        notes: true,
        // recording + _count para PostSessionFlow (detail de sesión COMPLETED):
        // antes ausentes → recordingStatus caía a "PROCESSING" hardcoded y el
        // conteo de participantes no estaba disponible.
        recording: {
          select: {
            url: true,
            status: true,
            durationSeconds: true,
          },
        },
        _count: {
          select: {
            participations: true,
          },
        },
      },
    });

    if (!session) {
      return { success: false, error: "Session not found" };
    }

    // Check if user is participant
    // Check if user is participant or community member
    let isAuthorized = session.mentorId === userId || session.menteeId === userId;

    // Also allow community members to access community sessions
    if (!isAuthorized && session.communityId) {
      const membership = await prisma.member.findFirst({
        where: {
          userId,
          communityId: session.communityId,
          status: "ACTIVE",
        },
      });
      isAuthorized = !!membership;
    }

    if (!isAuthorized) {
      return { success: false, error: "Not authorized to view this session" };
    }

    return { success: true, session };
  } catch (error) {
    console.error("Error fetching session:", error);
    return { success: false, error: "Failed to fetch session" };
  }
}
);

/**
 * Start a session
 */
export const startSession = defineAction(
  {
    name: "startSession",
    auth: "member",
    args: [z.string().min(1).max(64)],
    community: ([sessionId]) => communityOfSession(sessionId),
  },
  async (ctx, sessionId: string) => {
  try {

    const userId = ctx.userId;

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
);


/**
 * Cancel a session
 */
export const cancelSession = defineAction(
  {
    name: "cancelSession",
    auth: "member",
    args: [z.string().min(1).max(64)],
    community: ([sessionId]) => communityOfSession(sessionId),
  },
  async (ctx, sessionId: string) => {
  try {

    const userId = ctx.userId;

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
);

/**
 * Delete a session
 */
export const getCommunityAttendanceMetrics = defineAction(
  {
    name: "getCommunityAttendanceMetrics",
    auth: "member",
    args: [z.string().min(1).max(64), z.number().int().min(1).max(365).default(30)],
    community: ([communityId]) => communityById(communityId),
  },
  async (_ctx, communityId: string, days: number = 30) => {
  try {


    const now = Date.now();
    const since = new Date(now - days * 24 * 60 * 60 * 1000);
    const previousSince = new Date(now - days * 2 * 24 * 60 * 60 * 1000);

    const [sessionsCurrent, sessionsPrevious] = await Promise.all([
      prisma.mentorSession.findMany({
        where: {
          communityId,
          scheduledAt: { gte: since },
        },
        select: {
          id: true,
          status: true,
          scheduledAt: true,
          recordingUrl: true,
          _count: { select: { participations: true } },
        },
      }),
      prisma.mentorSession.findMany({
        where: {
          communityId,
          scheduledAt: { gte: previousSince, lt: since },
        },
        select: {
          id: true,
          status: true,
          scheduledAt: true,
          recordingUrl: true,
          _count: { select: { participations: true } },
        },
      }),
    ]);

    const computeMetrics = async (sessions: typeof sessionsCurrent, start: Date, end?: Date) => {
      const completedSessions = sessions.filter((s) => s.status === "COMPLETED");
      const scheduledSessions = sessions.filter((s) => s.status === "SCHEDULED");
      const completedIds = completedSessions.map((s) => s.id);
      const completedWithReplay = completedSessions.filter((s) => Boolean(s.recordingUrl)).length;

      const attendance = completedIds.length
        ? await prisma.sessionParticipation.groupBy({
            by: ["sessionId"],
            where: { sessionId: { in: completedIds } },
            _count: { _all: true },
          })
        : [];

      const attendanceMap = new Map(attendance.map((a) => [a.sessionId, a._count._all]));
      const totalAttendance = completedSessions.reduce(
        (sum, s) => sum + (attendanceMap.get(s.id) || 0),
        0
      );
      const avgAttendance = completedSessions.length
        ? totalAttendance / completedSessions.length
        : 0;

      const notificationWhere: Prisma.NotificationWhereInput = {
        type: "SESSION_REMINDER",
        createdAt: end ? { gte: start, lt: end } : { gte: start },
      };

      const reminderNotifications = await prisma.notification.findMany({
        where: notificationWhere,
        select: { data: true },
      });

      const sessionIdSet = new Set(sessions.map((s) => s.id));
      const remindersSent = reminderNotifications.filter((n) => {
        const payload = n.data as { sessionId?: string } | null;
        return payload?.sessionId && sessionIdSet.has(payload.sessionId);
      }).length;

      const uniqueRsvps = await prisma.sessionParticipation.count({
        where: { sessionId: { in: sessions.map((s) => s.id) } },
      });

      const rsvpToJoinRate = uniqueRsvps > 0 ? (totalAttendance / uniqueRsvps) * 100 : 0;
      const replayRate =
        completedSessions.length > 0 ? (completedWithReplay / completedSessions.length) * 100 : 0;

      return {
        totalSessions: sessions.length,
        scheduledSessions: scheduledSessions.length,
        completedSessions: completedSessions.length,
        totalAttendance,
        avgAttendance: Number(avgAttendance.toFixed(1)),
        remindersSent,
        rsvpToJoinRate: Number(Math.min(100, rsvpToJoinRate).toFixed(1)),
        replayRate: Number(Math.min(100, replayRate).toFixed(1)),
      };
    };

    const [currentMetrics, previousMetrics] = await Promise.all([
      computeMetrics(sessionsCurrent, since),
      computeMetrics(sessionsPrevious, previousSince, since),
    ]);

    const trend = {
      avgAttendanceDelta: Number(
        (currentMetrics.avgAttendance - previousMetrics.avgAttendance).toFixed(1)
      ),
      rsvpToJoinRateDelta: Number(
        (currentMetrics.rsvpToJoinRate - previousMetrics.rsvpToJoinRate).toFixed(1)
      ),
      remindersSentDelta: currentMetrics.remindersSent - previousMetrics.remindersSent,
      completedSessionsDelta: currentMetrics.completedSessions - previousMetrics.completedSessions,
      replayRateDelta: Number((currentMetrics.replayRate - previousMetrics.replayRate).toFixed(1)),
    };

    return {
      success: true,
      metrics: {
        periodDays: days,
        ...currentMetrics,
        trend,
      },
    };
  } catch (error) {
    console.error("Error getting community attendance metrics:", error);
    return { success: false, error: "Failed to load attendance metrics" };
  }
}
);

export const deleteSession = defineAction(
  {
    name: "deleteSession",
    auth: "member",
    args: [z.string().min(1).max(64)],
    community: ([sessionId]) => communityOfSession(sessionId),
  },
  async (ctx, sessionId: string) => {
  try {

    const userId = ctx.userId;

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
);

// ============================================
// RECURRING SESSIONS V1
// ============================================

type SessionFrequency = "WEEKLY" | "MONTHLY";

interface CreateSessionOrSeriesInput {
  title: string;
  description?: string;
  scheduledAt: Date;
  duration: number;
  timezone: string;
  communityId?: string;
  postToFeed?: boolean;
  mode?: "VIDEO" | "AUDIO"; // Session mode: video or audio-only
  // Recurrence fields
  repeat?: "once" | SessionFrequency;
  interval?: number; // every 1 week, every 2 weeks, etc.
  dayOfWeek?: number; // 0-6 for weekly
  dayOfMonth?: number; // 1-31 for monthly
  generateCount?: number; // how many instances to generate upfront (default: 8)
}

/**
 * Create a single session or a recurring series
 * This is the main entry point for V1 recurring sessions
 */
export const createSessionOrSeries = defineAction(
  {
    name: "createSessionOrSeries",
    auth: "user",
    args: [
      z.object({
        title: z.string().min(1).max(300),
        description: z.string().max(10_000).optional(),
        scheduledAt: z.coerce.date(),
        duration: z.number().int().min(1).max(1440),
        timezone: z.string().max(64),
        communityId: z.string().min(1).max(64).optional(),
        postToFeed: z.boolean().optional(),
        mode: z.enum(["VIDEO", "AUDIO"]).optional(),
        repeat: z.enum(["once", "WEEKLY", "MONTHLY"]).optional(),
        interval: z.number().int().min(1).max(52).optional(),
        dayOfWeek: z.number().int().min(0).max(6).optional(),
        dayOfMonth: z.number().int().min(1).max(31).optional(),
        generateCount: z.number().int().min(1).max(52).optional(),
      }),
    ],
    rateLimit: "create",
  },
  async (ctx, data: CreateSessionOrSeriesInput) => {
    // Same cross-tenant hole as createSession: the series, its generated
    // sessions, the feed post and the autopilot jobs all land in a
    // caller-supplied community (M3).
    await assertCommunityMemberIfScoped(ctx, data.communityId);
  try {
    const userId = ctx.userId;

    // Default to "once" if not specified
    const repeat = data.repeat || "once";

    if (repeat === "once") {
      // Create single session (existing behavior)
      return await createSingleSession({
        ...data,
        mentorId: userId,
        menteeId: userId,
      });
    }

    // Create recurring series
    return await createRecurringSeries({
      ...data,
      frequency: repeat,
      hostId: userId,
    });
  } catch (error) {
    console.error("Error creating session/series:", error);
    return { success: false, error: "Failed to create session" };
  }
}
);

/**
 * Create a single one-time session
 */
async function createSingleSession(
  data: CreateSessionOrSeriesInput & { mentorId: string; menteeId: string }
) {
  const roomId = `session-${nanoid(12)}`;

  const sessionData: Prisma.MentorSessionUncheckedCreateInput = {
    title: data.title,
    description: data.description,
    scheduledAt: data.scheduledAt,
    duration: data.duration,
    timezone: data.timezone || "UTC",
    roomId,
    status: "SCHEDULED",
    mode: data.mode || "VIDEO", // Default to VIDEO if not specified
    mentorId: data.mentorId,
    menteeId: data.menteeId,
    seriesId: null, // explicitly null for one-time sessions
  };

  if (data.communityId) {
    sessionData.communityId = data.communityId;
  } else {
    const fallbackCommunity = await prisma.community.findFirst({
      where: {
        OR: [
          { ownerId: data.mentorId },
          { members: { some: { userId: data.mentorId, status: "ACTIVE" } } },
        ],
      },
      select: { id: true },
      orderBy: { createdAt: "asc" },
    });
    if (fallbackCommunity) {
      sessionData.communityId = fallbackCommunity.id;
    }
  }

  const session = await prisma.mentorSession.create({
    data: sessionData,
    include: {
      mentor: {
        select: { id: true, name: true, image: true, username: true },
      },
    },
  });

  // Auto-post to feed if enabled
  if (data.communityId && data.postToFeed !== false) {
    await createSessionFeedPost(session, data);
  }

  revalidatePath("/dashboard/sessions");
  revalidatePath("/dashboard/agenda");

  if (data.communityId) {
    await startSessionAutopilot(session.id, "session_created");
  }

  return { success: true, session, type: "single" };
}

/**
 * Create a recurring session series
 */
async function createRecurringSeries(
  data: CreateSessionOrSeriesInput & { frequency: SessionFrequency; hostId: string }
) {
  const { frequency, hostId, communityId } = data;

  // 1. Create the series record
  const series = await prisma.sessionSeries.create({
    data: {
      communityId,
      hostId,
      title: data.title,
      description: data.description,
      frequency,
      interval: data.interval || 1,
      dayOfWeek: data.dayOfWeek,
      dayOfMonth: data.dayOfMonth,
      startTime: formatTime(data.scheduledAt),
      durationMinutes: data.duration,
      timezone: data.timezone || "UTC",
      mode: data.mode || "VIDEO", // Default to VIDEO
      startsAt: data.scheduledAt,
      isActive: true,
      autoPostToFeed: data.postToFeed !== false,
    },
  });

  // 2. Generate initial instances (default: 8 for weekly, 6 for monthly)
  const generateCount = data.generateCount || (frequency === "WEEKLY" ? 8 : 6);
  const instances = await generateUpcomingSessions(series, generateCount);

  // 3. Create the instances in the database
  const createdSessions = await Promise.all(
    instances.map(async (instanceData, index) => {
      const roomId = `session-${nanoid(12)}`;

      const session = await prisma.mentorSession.create({
        data: {
          title: data.title,
          description: data.description,
          scheduledAt: instanceData.scheduledAt,
          duration: data.duration,
          timezone: data.timezone || "UTC",
          roomId,
          status: "SCHEDULED",
          mode: data.mode || "VIDEO", // Same mode as series
          mentorId: hostId,
          menteeId: hostId,
          communityId,
          seriesId: series.id,
        },
        include: {
          mentor: {
            select: { id: true, name: true, image: true, username: true },
          },
        },
      });

      // Auto-post only the first session to feed (not all 8!)
      if (communityId && data.postToFeed !== false && index === 0) {
        await createSessionFeedPost(session, data);
      }

      if (communityId) {
        await startSessionAutopilot(session.id, "series_instance_created");
      }

      return session;
    })
  );

  revalidatePath("/dashboard/sessions");
  revalidatePath("/dashboard/agenda");
  if (communityId) {
    revalidatePath(`/dashboard/communities/${communityId}/sessions`);
  }

  return {
    success: true,
    series,
    sessions: createdSessions,
    type: "recurring",
    generatedCount: createdSessions.length,
  };
}



/**
 * Edit a single session instance
 * Use when user selects "This session only"
 */
export const editSession = defineAction(
  {
    name: "editSession",
    auth: "member",
    args: [
      z.string().min(1).max(64),
      z.object({
        title: z.string().min(1).max(300).optional(),
        description: z.string().max(10_000).optional(),
        scheduledAt: z.coerce.date().optional(),
        duration: z.number().int().min(1).max(1440).optional(),
        status: z.enum(["SCHEDULED", "CANCELLED"]).optional(),
      }),
    ],
    community: ([sessionId]) => communityOfSession(sessionId),
  },
  async (ctx, sessionId: string, data: { title?: string; description?: string; scheduledAt?: Date; duration?: number; status?: "SCHEDULED" | "CANCELLED"; }) => {
  try {

    const userId = ctx.userId;

    const session = await prisma.mentorSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return { success: false, error: "Session not found" };
    }

    if (session.mentorId !== userId) {
      return { success: false, error: "Only the host can edit this session" };
    }

    // Mark as exception if it's part of a series
    const isException = !!session.seriesId;

    const updatedSession = await prisma.mentorSession.update({
      where: { id: sessionId },
      data: {
        ...data,
        isException,
        exceptionData: isException
          ? {
              editedAt: new Date().toISOString(),
              originalTitle: session.title,
              originalScheduledAt: session.scheduledAt,
              changes: Object.keys(data),
            }
          : undefined,
      },
    });

    revalidatePath("/dashboard/sessions");
    return { success: true, session: updatedSession };
  } catch (error) {
    console.error("Error editing session:", error);
    return { success: false, error: "Failed to edit session" };
  }
}
);

/**
 * Edit series from a session instance
 * Use when user selects "This and future sessions"
 * Updates the series rules and regenerates future instances
 */
export const editSeriesFromSession = defineAction(
  {
    name: "editSeriesFromSession",
    auth: "member",
    args: [
      z.string().min(1).max(64),
      z.object({
        title: z.string().min(1).max(300).optional(),
        description: z.string().max(10_000).optional(),
        scheduledAt: z.coerce.date().optional(),
        duration: z.number().int().min(1).max(1440).optional(),
        interval: z.number().int().min(1).max(52).optional(),
        isActive: z.boolean().optional(),
      }),
    ],
    community: ([sessionId]) => communityOfSession(sessionId),
  },
  async (ctx, sessionId: string, data: { title?: string; description?: string; scheduledAt?: Date; duration?: number; interval?: number; isActive?: boolean; }) => {
  try {

    const userId = ctx.userId;

    const session = await prisma.mentorSession.findUnique({
      where: { id: sessionId },
      include: { series: true },
    });

    if (!session || !session.series) {
      return { success: false, error: "Session not part of a series" };
    }

    if (session.mentorId !== userId) {
      return { success: false, error: "Only the host can edit this series" };
    }

    const series = session.series;

    // 1. Update the series rules
    await prisma.sessionSeries.update({
      where: { id: series.id },
      data: {
        title: data.title || series.title,
        description: data.description || series.description,
        startTime: data.scheduledAt ? formatTime(data.scheduledAt) : series.startTime,
        durationMinutes: data.duration || series.durationMinutes,
        interval: data.interval || series.interval,
        isActive: data.isActive ?? series.isActive,
        // Update startsAt if provided
        startsAt: data.scheduledAt || series.startsAt,
      },
    });

    // 2. Delete future unmodified instances (not started, not exceptions)
    const now = new Date();
    await prisma.mentorSession.deleteMany({
      where: {
        seriesId: series.id,
        scheduledAt: { gt: now },
        isException: false,
        status: "SCHEDULED",
      },
    });

    // 3. Regenerate future instances
    const updatedSeries = await prisma.sessionSeries.findUnique({
      where: { id: series.id },
    });

    if (updatedSeries) {
      const futureInstances = await generateUpcomingSessions(updatedSeries, 8);

      await Promise.all(
        futureInstances.map((instance) =>
          prisma.mentorSession.create({
            data: {
              title: updatedSeries.title,
              description: updatedSeries.description,
              scheduledAt: instance.scheduledAt,
              duration: updatedSeries.durationMinutes,
              timezone: updatedSeries.timezone,
              roomId: `session-${nanoid(12)}`,
              status: "SCHEDULED",
              mentorId: userId,
              menteeId: userId,
              communityId: updatedSeries.communityId,
              seriesId: series.id,
            },
          })
        )
      );
    }

    // 4. Update the current session as exception (since it's now "past" in the old schedule)
    await prisma.mentorSession.update({
      where: { id: sessionId },
      data: {
        isException: true,
        exceptionData: {
          type: "split_point",
          note: "Last session of old schedule",
          newSeriesRules: {
            title: data.title,
            scheduledAt: data.scheduledAt,
            duration: data.duration,
          },
        },
      },
    });

    revalidatePath("/dashboard/sessions");
    return { success: true, message: "Series updated and future sessions regenerated" };
  } catch (error) {
    console.error("Error editing series:", error);
    return { success: false, error: "Failed to update series" };
  }
}
);

/**
 * Get sessions for a community (including recurring series instances)
 */
export const getCommunitySessions = defineAction(
  {
    name: "getCommunitySessions",
    auth: "member",
    args: [z.string().min(1).max(64)],
    community: ([communityId]) => communityById(communityId),
  },
  async (_ctx, communityId: string) => {
  try {


    const sessions = await prisma.mentorSession.findMany({
      where: {
        communityId,
        status: { not: "CANCELLED" },
      },
      include: {
        mentor: {
          select: { id: true, name: true, image: true, username: true },
        },
        series: {
          select: { id: true, frequency: true, isActive: true },
        },
      },
      orderBy: { scheduledAt: "asc" },
    });

    const now = new Date();
    const upcoming = sessions.filter((s) => new Date(s.scheduledAt) > now);
    const past = sessions.filter((s) => new Date(s.scheduledAt) <= now);

    return { success: true, sessions: { upcoming, past } };
  } catch (error) {
    console.error("Error fetching community sessions:", error);
    return { success: false, error: "Failed to fetch sessions" };
  }
}
);

/**
 * Get a session series with its instances
 */
export const getSessionSeries = defineAction(
  {
    name: "getSessionSeries",
    auth: "member",
    args: [z.string().min(1).max(64)],
    community: ([seriesId]) => communityOfSeries(seriesId),
  },
  async (ctx, seriesId: string) => {
  try {

    const userId = ctx.userId;

    const series = await prisma.sessionSeries.findUnique({
      where: { id: seriesId },
      include: {
        instances: {
          orderBy: { scheduledAt: "asc" },
          include: {
            mentor: {
              select: { id: true, name: true, image: true },
            },
          },
        },
        host: {
          select: { id: true, name: true, image: true },
        },
      },
    });

    if (!series) {
      return { success: false, error: "Series not found" };
    }

    if (series.hostId !== userId) {
      return { success: false, error: "Not authorized to view this series" };
    }

    return { success: true, series };
  } catch (error) {
    console.error("Error fetching series:", error);
    return { success: false, error: "Failed to fetch series" };
  }
}
);

/**
 * RSVP status helper
 */
function getRsvpStatusFromEventsData(
  eventsData: Prisma.JsonValue | undefined
): "attending" | "interested" | null {
  if (!eventsData || typeof eventsData !== "object" || Array.isArray(eventsData)) return null;
  const data = eventsData as Record<string, unknown>;
  if (data.rsvpStatus === "attending" || data.rsvpStatus === "interested") {
    return data.rsvpStatus;
  }
  if (data.rsvp === true) return "attending";
  return null;
}

/**
 * Set RSVP status for a scheduled session
 */
export const setSessionRSVPStatus = defineAction(
  {
    name: "setSessionRSVPStatus",
    auth: "member",
    args: [z.string().min(1).max(64), z.enum(["attending", "interested", "none"]), z.string().max(300).optional()],
    community: ([sessionId]) => communityOfSession(sessionId),
    rateLimit: "create",
  },
  async (ctx, sessionId: string, status: "attending" | "interested" | "none", revalidateTargetPath?: string) => {
  try {

    const userId = ctx.userId;

    const session = await prisma.mentorSession.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        status: true,
        communityId: true,
      },
    });

    if (!session) {
      return { success: false, error: "Session not found" };
    }

    if (session.status !== "SCHEDULED") {
      return { success: false, error: "RSVP is only available for upcoming sessions" };
    }

    if (session.communityId) {
      const membership = await prisma.member.findUnique({
        where: {
          userId_communityId: {
            userId,
            communityId: session.communityId,
          },
        },
        select: { status: true },
      });

      if (!membership || membership.status !== "ACTIVE") {
        return { success: false, error: "Join the community to RSVP" };
      }
    }

    const existing = await prisma.sessionParticipation.findUnique({
      where: {
        sessionId_userId: {
          sessionId,
          userId,
        },
      },
      select: { id: true, eventsData: true },
    });

    const currentStatus = getRsvpStatusFromEventsData(existing?.eventsData);

    if (status === "none" || currentStatus === status) {
      if (existing) {
        await prisma.sessionParticipation.delete({ where: { id: existing.id } });
      }
    } else if (!existing) {
      await prisma.sessionParticipation.create({
        data: {
          sessionId,
          userId,
          role: "listener",
          eventsData: { rsvp: true, rsvpStatus: status },
        },
      });
    } else {
      await prisma.sessionParticipation.update({
        where: { id: existing.id },
        data: {
          eventsData: { rsvp: true, rsvpStatus: status },
        },
      });
    }

    revalidatePath("/dashboard/sessions");
    if (session.communityId) {
      revalidatePath(`/dashboard/communities/${session.communityId}/sessions`);
    }
    if (revalidateTargetPath) {
      revalidatePath(revalidateTargetPath);
    }

    const [attendingCount, interestedCount, attendingPreview] = await Promise.all([
      prisma.sessionParticipation.count({
        where: {
          sessionId,
          OR: [
            { eventsData: { path: ["rsvpStatus"], equals: "attending" } },
            { eventsData: { path: ["rsvp"], equals: true } },
          ],
        },
      }),
      prisma.sessionParticipation.count({
        where: {
          sessionId,
          eventsData: { path: ["rsvpStatus"], equals: "interested" },
        },
      }),
      prisma.sessionParticipation.findMany({
        where: {
          sessionId,
          OR: [
            { eventsData: { path: ["rsvpStatus"], equals: "attending" } },
            { eventsData: { path: ["rsvp"], equals: true } },
          ],
        },
        select: {
          user: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
        take: 5,
      }),
    ]);

    const effectiveStatus = currentStatus === status || status === "none" ? null : status;

    return {
      success: true,
      status: effectiveStatus,
      attendingCount,
      interestedCount,
      attendingPreview: attendingPreview.map((p) => ({
        id: p.user.id,
        name: p.user.name,
        image: p.user.image,
      })),
      isAttending: effectiveStatus === "attending",
      isInterested: effectiveStatus === "interested",
    };
  } catch (error) {
    console.error("Error setting RSVP status:", error);
    return { success: false, error: "Failed to update RSVP" };
  }
}
);

/**
 * RSVP toggle (backward compatibility)
 */
export const toggleSessionRSVP = defineAction(
  {
    name: "toggleSessionRSVP",
    auth: "member",
    args: [z.string().min(1).max(64), z.string().max(300).optional()],
    community: ([sessionId]) => communityOfSession(sessionId),
    rateLimit: "create",
  },
  async (_ctx, sessionId: string, revalidateTargetPath?: string) => {
  const result = await setSessionRSVPStatus(sessionId, "attending", revalidateTargetPath);
  if (!result.success) return result;

  return {
    success: true,
    action: result.status === "attending" ? "rsvped" : "unrsvped",
    attendingCount: result.attendingCount,
    interestedCount: result.interestedCount,
    isAttending: result.isAttending,
    isInterested: result.isInterested,
  };
}
);

/**
 * Get RSVP status for current user + attending/interested counts
 */
export const getSessionRSVPStatus = defineAction(
  {
    name: "getSessionRSVPStatus",
    auth: "member",
    args: [z.string().min(1).max(64)],
    community: ([sessionId]) => communityOfSession(sessionId),
  },
  async (ctx, sessionId: string) => {
  try {

    const userId = ctx.userId;
const [attendingCount, interestedCount, existing, attendingPreview] = await Promise.all([
      prisma.sessionParticipation.count({
        where: {
          sessionId,
          OR: [
            { eventsData: { path: ["rsvpStatus"], equals: "attending" } },
            { eventsData: { path: ["rsvp"], equals: true } },
          ],
        },
      }),
      prisma.sessionParticipation.count({
        where: {
          sessionId,
          eventsData: { path: ["rsvpStatus"], equals: "interested" },
        },
      }),
      userId
        ? prisma.sessionParticipation.findUnique({
            where: { sessionId_userId: { sessionId, userId } },
            select: { eventsData: true },
          })
        : Promise.resolve(null),
      prisma.sessionParticipation.findMany({
        where: {
          sessionId,
          OR: [
            { eventsData: { path: ["rsvpStatus"], equals: "attending" } },
            { eventsData: { path: ["rsvp"], equals: true } },
          ],
        },
        select: {
          user: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
        take: 5,
      }),
    ]);

    const status = getRsvpStatusFromEventsData(existing?.eventsData);

    return {
      success: true,
      attendingCount,
      interestedCount,
      attendingPreview: attendingPreview.map((p) => ({
        id: p.user.id,
        name: p.user.name,
        image: p.user.image,
      })),
      isAttending: status === "attending",
      isInterested: status === "interested",
      status,
    };
  } catch (error) {
    console.error("Error getting RSVP status:", error);
    return {
      success: false,
      attendingCount: 0,
      interestedCount: 0,
      attendingPreview: [],
      isAttending: false,
      isInterested: false,
      status: null,
      error: "Failed to get RSVP status",
    };
  }
}
);

// ============================================
// HELPERS
// ============================================

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function createSessionFeedPost(
  session: SessionWithMentor,
  data: { title: string; description?: string; communityId?: string }
) {
  try {
    if (!data.communityId) return;

    await prisma.post.create({
      data: {
        title: `ðŸ“… New live session: ${data.title}`,
        content: `A new live session has been scheduled in this community.`,
        contentType: "SESSION_ANNOUNCEMENT",
        authorId: session.mentorId,
        communityId: data.communityId,
        attachments: {
          sessionId: session.id,
          sessionTitle: data.title,
          sessionDescription: data.description,
          scheduledAt: session.scheduledAt.toISOString(),
          duration: session.duration,
          mentorId: session.mentorId,
          mentorName: session.mentor?.name,
          mentorImage: session.mentor?.image,
          isRecurring: !!session.seriesId,
        },
      },
    });

    // Revalidate feed
    revalidatePath(`/dashboard/communities/${data.communityId}/sessions`);
  } catch (error) {
    console.error("Error creating session feed post:", error);
    // Don't throw - this is non-critical
  }
}
