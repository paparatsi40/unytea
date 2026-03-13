"use server";

import { prisma } from "@/lib/prisma";
import { Prisma, SessionStatus, SessionMode, SessionFrequency, SessionEventType, RecordingStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { nanoid } from "nanoid";

// ============================================
// SLUG GENERATOR
// ============================================

function generateSessionSlug(title: string): string {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // Remove special chars
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .substring(0, 60); // Max 60 chars
  
  const uniqueId = nanoid(6);
  return `${base}-${uniqueId}`;
}

// ============================================
// TYPES
// ============================================

type CreateSessionTiming = "now" | "scheduled";
type RepeatMode = "once" | "weekly" | "monthly";

interface CreateSessionOrSeriesInput {
  communityId: string;
  hostId: string;
  title: string;
  description?: string | null;
  mode: "video" | "audio";
  timing: CreateSessionTiming;
  durationMinutes: number;
  timezone: string;
  startsAt?: Date;
  repeat: RepeatMode;
  interval?: number;
  generateCount?: number;
  autoPostToFeed?: boolean;
}

// ============================================
// DATE HELPERS
// ============================================

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function addWeeks(date: Date, weeks: number): Date {
  return addDays(date, weeks * 7);
}

function addMonths(date: Date, months: number): Date {
  const copy = new Date(date);
  copy.setMonth(copy.getMonth() + months);
  return copy;
}

// ============================================
// EVENT LOGGING
// ============================================

export async function logSessionEvent(params: {
  sessionId: string;
  communityId?: string;
  type: SessionEventType;
  payload?: Record<string, unknown> | null;
}) {
  return prisma.sessionEvent.create({
    data: {
      id: nanoid(),
      sessionId: params.sessionId,
      communityId: params.communityId,
      type: params.type,
      payload: params.payload as Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | undefined,
    },
  });
}

// ============================================
// VALIDATION
// ============================================

function validateCreateInput(input: CreateSessionOrSeriesInput) {
  if (!input.communityId) throw new Error("communityId is required");
  if (!input.hostId) throw new Error("hostId is required");
  if (!input.title?.trim()) throw new Error("title is required");
  if (!input.mode || !["video", "audio"].includes(input.mode)) {
    throw new Error("mode must be 'video' or 'audio'");
  }
  if (input.durationMinutes <= 0) {
    throw new Error("durationMinutes must be greater than 0");
  }
  if (!input.timezone) {
    throw new Error("timezone is required");
  }
  if (!["now", "scheduled"].includes(input.timing)) {
    throw new Error("timing must be 'now' or 'scheduled'");
  }
  if (!["once", "weekly", "monthly"].includes(input.repeat)) {
    throw new Error("repeat must be 'once' | 'weekly' | 'monthly'");
  }
  if (input.timing === "scheduled" && !input.startsAt) {
    throw new Error("startsAt is required when timing = 'scheduled'");
  }
  if (input.timing === "now" && input.repeat !== "once") {
    throw new Error("start now only supports repeat = 'once' in V1");
  }
}

// ============================================
// DATE GENERATION
// ============================================

function generateUpcomingDates(params: {
  startsAt: Date;
  repeat: RepeatMode;
  interval: number;
  count: number;
}): Date[] {
  const { startsAt, repeat, interval, count } = params;

  if (count <= 0) return [];

  const dates: Date[] = [startsAt];

  if (repeat === "once") {
    return [startsAt];
  }

  for (let i = 1; i < count; i++) {
    const previous = dates[i - 1];

    if (repeat === "weekly") {
      dates.push(addWeeks(previous, interval));
    } else if (repeat === "monthly") {
      dates.push(addMonths(previous, interval));
    }
  }

  return dates;
}

// ============================================
// MAIN FUNCTION: createSessionOrSeries
// ============================================

export async function createSessionOrSeries(input: CreateSessionOrSeriesInput) {
  validateCreateInput(input);

  const autoPostToFeed = input.autoPostToFeed ?? true;
  const interval = input.interval ?? 1;

  const startsAt =
    input.timing === "now"
      ? new Date()
      : new Date(input.startsAt as Date);

  const defaultGenerateCount =
    input.repeat === "weekly" ? 8 :
    input.repeat === "monthly" ? 6 :
    1;

  const generateCount = input.generateCount ?? defaultGenerateCount;

  const mode = input.mode === "video" ? SessionMode.VIDEO : SessionMode.AUDIO;

  // START NOW -> single live session
  if (input.timing === "now") {
    const endsAt = addMinutes(startsAt, input.durationMinutes);
    const roomId = `session-${nanoid(10)}`;
    const slug = generateSessionSlug(input.title);

    const session = await prisma.mentorSession.create({
      data: {
        id: nanoid(),
        communityId: input.communityId,
        mentorId: input.hostId,
        menteeId: input.hostId, // For community sessions, both are host initially
        slug,
        title: input.title.trim(),
        description: input.description ?? null,
        mode,
        scheduledAt: startsAt,
        duration: input.durationMinutes,
        timezone: input.timezone,
        status: SessionStatus.IN_PROGRESS,
        roomId,
        startedAt: startsAt,
        endsAt,
        feedPostId: null,
      },
    });

    // Log events
    await logSessionEvent({
      sessionId: session.id,
      communityId: session.communityId || undefined,
      type: SessionEventType.SESSION_CREATED,
      payload: {
        timing: "now",
        repeat: "once",
        mode: session.mode,
        startsAt: session.scheduledAt.toISOString(),
        endsAt: session.endsAt?.toISOString(),
      },
    });

    await logSessionEvent({
      sessionId: session.id,
      communityId: session.communityId || undefined,
      type: SessionEventType.SESSION_STARTED,
      payload: {
        startedAt: session.startedAt?.toISOString(),
        mode: session.mode,
        roomId: session.roomId,
      },
    });

    // Auto-post to feed if enabled
    if (autoPostToFeed && session.communityId) {
      // TODO: Create feed post "🔴 Live now"
    }

    revalidatePath("/dashboard/sessions");

    return {
      type: "single_live" as const,
      session,
      series: null,
      createdSessionsCount: 1,
    };
  }

  // SCHEDULED + ONCE -> single scheduled session
  if (input.repeat === "once") {
    const endsAt = addMinutes(startsAt, input.durationMinutes);
    const roomId = `session-${nanoid(10)}`;
    const slug = generateSessionSlug(input.title);

    const session = await prisma.mentorSession.create({
      data: {
        id: nanoid(),
        communityId: input.communityId,
        mentorId: input.hostId,
        menteeId: input.hostId,
        slug,
        title: input.title.trim(),
        description: input.description ?? null,
        mode,
        scheduledAt: startsAt,
        duration: input.durationMinutes,
        timezone: input.timezone,
        status: SessionStatus.SCHEDULED,
        roomId,
        endsAt,
      },
    });

    await logSessionEvent({
      sessionId: session.id,
      communityId: session.communityId || undefined,
      type: SessionEventType.SESSION_CREATED,
      payload: {
        timing: "scheduled",
        repeat: "once",
        mode: session.mode,
        startsAt: session.scheduledAt.toISOString(),
        endsAt: session.endsAt?.toISOString(),
        autoPostToFeed,
      },
    });

    // Auto-post scheduled session
    if (autoPostToFeed && session.communityId) {
      // TODO: Create feed post for scheduled session
    }

    revalidatePath("/dashboard/sessions");

    return {
      type: "single_scheduled" as const,
      session,
      series: null,
      createdSessionsCount: 1,
    };
  }

  // SCHEDULED + RECURRING -> series + future sessions
  const frequency =
    input.repeat === "weekly"
      ? SessionFrequency.WEEKLY
      : SessionFrequency.MONTHLY;

  // Extract start time as HH:mm
  const startTime = `${String(startsAt.getHours()).padStart(2, "0")}:${String(startsAt.getMinutes()).padStart(2, "0")}`;

  const series = await prisma.sessionSeries.create({
    data: {
      id: nanoid(),
      communityId: input.communityId,
      hostId: input.hostId,
      title: input.title.trim(),
      description: input.description ?? null,
      mode,
      frequency,
      interval,
      dayOfWeek: input.repeat === "weekly" ? startsAt.getDay() : null,
      dayOfMonth: input.repeat === "monthly" ? startsAt.getDate() : null,
      startTime,
      durationMinutes: input.durationMinutes,
      timezone: input.timezone,
      startsAt,
      autoPostToFeed,
      isActive: true,
    },
  });

  const dates = generateUpcomingDates({
    startsAt,
    repeat: input.repeat,
    interval,
    count: generateCount,
  });

  // Create all sessions with unique slugs
  const createdSessions: { id: string; scheduledAt: Date; slug: string }[] = [];
  
  for (const date of dates) {
    const slug = generateSessionSlug(`${input.title}-${date.toISOString().slice(0, 10)}`);
    const session = await prisma.mentorSession.create({
      data: {
        id: nanoid(),
        communityId: input.communityId,
        mentorId: input.hostId,
        menteeId: input.hostId,
        seriesId: series.id,
        slug,
        title: input.title.trim(),
        description: input.description ?? null,
        mode,
        scheduledAt: date,
        duration: input.durationMinutes,
        timezone: input.timezone,
        status: SessionStatus.SCHEDULED,
        roomId: `session-${nanoid(10)}`,
        endsAt: addMinutes(date, input.durationMinutes),
      },
    });
    createdSessions.push({ id: session.id, scheduledAt: session.scheduledAt, slug: session.slug! });
  }

  if (createdSessions.length === 0) {
    throw new Error("Failed to generate recurring sessions");
  }

  const firstSessionId = createdSessions[0].id;

  // Log series creation event
  await logSessionEvent({
    sessionId: firstSessionId,
    communityId: input.communityId,
    type: SessionEventType.SESSION_SERIES_CREATED,
    payload: {
      seriesId: series.id,
      repeat: input.repeat,
      interval,
      generatedSessionsCount: createdSessions.length,
      startsAt: startsAt.toISOString(),
      autoPostToFeed,
    },
  });

  // Log individual session creations
  for (const session of createdSessions) {
    await logSessionEvent({
      sessionId: session.id,
      communityId: input.communityId,
      type: SessionEventType.SESSION_CREATED,
      payload: {
        timing: "scheduled",
        repeat: input.repeat,
        seriesId: series.id,
        startsAt: session.scheduledAt.toISOString(),
        mode,
        slug: session.slug,
      },
    });
  }

  // Auto-post only the first/upcoming session
  if (autoPostToFeed && firstSession.communityId) {
    // TODO: Create feed post for first scheduled session
  }

  revalidatePath("/dashboard/sessions");

  return {
    type: "recurring_series" as const,
    series,
    firstSessionId,
    sessions: createdSessions,
    createdSessionsCount: createdSessions.length,
  };
}

// ============================================
// LIFECYCLE FUNCTIONS
// ============================================

/**
 * Start a scheduled session (transition from SCHEDULED to IN_PROGRESS)
 */
export async function startSession(sessionId: string, userId: string) {
  const session = await prisma.mentorSession.findUnique({
    where: { id: sessionId },
  });

  if (!session) {
    return { success: false, error: "Session not found" };
  }

  if (session.mentorId !== userId) {
    return { success: false, error: "Only the host can start the session" };
  }

  if (session.status !== SessionStatus.SCHEDULED) {
    return { success: false, error: "Session is not in scheduled status" };
  }

  const now = new Date();

  const updated = await prisma.mentorSession.update({
    where: { id: sessionId },
    data: {
      status: SessionStatus.IN_PROGRESS,
      startedAt: now,
    },
  });

  await logSessionEvent({
    sessionId: session.id,
    communityId: session.communityId || undefined,
    type: SessionEventType.SESSION_STARTED,
    payload: {
      startedAt: now.toISOString(),
      mode: session.mode,
      roomId: session.roomId,
      startedBy: userId,
    },
  });

  // Create recording entry
  await prisma.recording.create({
    data: {
      id: nanoid(),
      sessionId: session.id,
      status: RecordingStatus.PROCESSING,
    },
  });

  await logSessionEvent({
    sessionId: session.id,
    communityId: session.communityId || undefined,
    type: SessionEventType.RECORDING_PROCESSING,
    payload: {
      startedAt: now.toISOString(),
    },
  });

  // Auto-post "Live now" to feed
  if (session.communityId) {
    // TODO: Create feed post "🔴 Live now"
  }

  revalidatePath("/dashboard/sessions");
  revalidatePath(`/dashboard/sessions/${sessionId}`);

  return { success: true, session: updated };
}

/**
 * End a session (transition to COMPLETED)
 */
export async function endSession(sessionId: string, userId: string) {
  const session = await prisma.mentorSession.findUnique({
    where: { id: sessionId },
    include: {
      recording: true,
    },
  });

  if (!session) {
    return { success: false, error: "Session not found" };
  }

  if (session.mentorId !== userId) {
    return { success: false, error: "Only the host can end the session" };
  }

  if (session.status !== SessionStatus.IN_PROGRESS) {
    return { success: false, error: "Session is not live" };
  }

  const now = new Date();
  const actualDuration = Math.round(
    (now.getTime() - (session.startedAt?.getTime() || now.getTime())) / 60000
  );

  const updated = await prisma.mentorSession.update({
    where: { id: sessionId },
    data: {
      status: SessionStatus.COMPLETED,
      endedAt: now,
      duration: actualDuration,
    },
  });

  await logSessionEvent({
    sessionId: session.id,
    communityId: session.communityId || undefined,
    type: SessionEventType.SESSION_ENDED,
    payload: {
      endedAt: now.toISOString(),
      startedAt: session.startedAt?.toISOString(),
      actualDurationMinutes: actualDuration,
      roomId: session.roomId,
      endedBy: userId,
    },
  });

  revalidatePath("/dashboard/sessions");
  revalidatePath(`/dashboard/sessions/${sessionId}`);

  return { success: true, session: updated };
}

/**
 * Mark recording as ready (called by recording service/webhook)
 */
export async function markRecordingReady(
  sessionId: string,
  url: string,
  durationSeconds: number
) {
  const session = await prisma.mentorSession.findUnique({
    where: { id: sessionId },
    include: {
      recording: true,
    },
  });

  if (!session) {
    return { success: false, error: "Session not found" };
  }

  const updated = await prisma.recording.update({
    where: { sessionId },
    data: {
      status: RecordingStatus.READY,
      url,
      durationSeconds,
      updatedAt: new Date(),
    },
  });

  // Update session with recording URL for quick access
  await prisma.mentorSession.update({
    where: { id: sessionId },
    data: {
      recordingUrl: url,
    },
  });

  await logSessionEvent({
    sessionId: session.id,
    communityId: session.communityId || undefined,
    type: SessionEventType.RECORDING_READY,
    payload: {
      url,
      durationSeconds,
      readyAt: new Date().toISOString(),
    },
  });

  // Auto-post "Recording available" to feed
  if (session.communityId) {
    // TODO: Create feed post "🎥 Recording available"
    await logSessionEvent({
      sessionId: session.id,
      communityId: session.communityId,
      type: SessionEventType.SESSION_SHARED_TO_FEED,
      payload: {
        shareType: "recording_ready",
        autoPosted: true,
      },
    });
  }

  revalidatePath("/dashboard/sessions");
  revalidatePath(`/dashboard/sessions/${sessionId}`);

  return { success: true, recording: updated };
}

/**
 * Mark recording as failed
 */
export async function markRecordingFailed(sessionId: string, reason?: string) {
  const session = await prisma.mentorSession.findUnique({
    where: { id: sessionId },
  });

  if (!session) {
    return { success: false, error: "Session not found" };
  }

  const updated = await prisma.recording.update({
    where: { sessionId },
    data: {
      status: RecordingStatus.FAILED,
      updatedAt: new Date(),
    },
  });

  // Log failure (but don't create event type for this in V1, use payload)
  await logSessionEvent({
    sessionId: session.id,
    communityId: session.communityId || undefined,
    type: SessionEventType.RECORDING_READY, // Reuse type with error in payload
    payload: {
      failed: true,
      reason: reason || "Unknown error",
      failedAt: new Date().toISOString(),
    },
  });

  return { success: true, recording: updated };
}

/**
 * Upsert session notes - create or update notes for a session
 */
export async function upsertSessionNotes(params: {
  sessionId: string;
  userId: string;
  content: string;
}) {
  const { sessionId, userId, content } = params;

  const session = await prisma.mentorSession.findUnique({
    where: { id: sessionId },
  });

  if (!session) {
    return { success: false, error: "Session not found" };
  }

  const now = new Date();

  // Check if notes already exist
  const existing = await prisma.sessionNote.findUnique({
    where: { sessionId },
  });

  let note;
  const isUpdate = !!existing;

  if (existing) {
    // Update existing notes
    note = await prisma.sessionNote.update({
      where: { sessionId },
      data: {
        content,
        updatedAt: now,
        lastEditedBy: userId,
      },
    });
  } else {
    // Create new notes
    note = await prisma.sessionNote.create({
      data: {
        id: nanoid(),
        sessionId,
        content,
        createdById: userId,
        createdAt: now,
        updatedAt: now,
      },
    });
  }

  // Log the event
  await logSessionEvent({
    sessionId: session.id,
    communityId: session.communityId || undefined,
    type: SessionEventType.SESSION_NOTES_UPDATED,
    payload: {
      noteId: note.id,
      userId,
      isUpdate,
      contentLength: content.length,
      updatedAt: now.toISOString(),
    },
  });

  revalidatePath(`/dashboard/sessions/${sessionId}`);

  return {
    success: true,
    note,
    isUpdate,
  };
}

/**
 * Get session events for debugging/auditing
 */
export async function getSessionEvents(sessionId: string) {
  const events = await prisma.sessionEvent.findMany({
    where: { sessionId },
    orderBy: { createdAt: "asc" },
  });

  return { success: true, events };
}
