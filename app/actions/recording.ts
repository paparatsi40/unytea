"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { defineAction } from "@/lib/actions/define-action";
import { assertSessionHost } from "@/lib/actions/guards";
import { communityById, communityOfRecording, communityOfSession } from "@/lib/actions/resolvers";
import { createSessionRecording } from "@/lib/jobs/recording";

// Check LiveKit credentials
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || "";
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || "";

if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
  console.warn("LiveKit credentials not configured. Recording integration will be limited.");
}

export interface RecordingConfig {
  sessionId: string;
  roomName: string;
  layout?: "grid" | "speaker" | "single-speaker";
  audioOnly?: boolean;
}

export interface RecordingInfo {
  egressId: string;
  status: string;
  startedAt: Date;
  estimatedDuration?: number;
}

/**
 * Start composite recording for a session
 *
 * NOTE: For V1, recording is started automatically via LiveKit Cloud dashboard
 * Egress configuration. This function validates permissions and creates the DB record.
 * The actual recording starts when the webhook 'egress_started' arrives.
 */
export const startCompositeRecording = defineAction(
  {
    name: "startCompositeRecording",
    auth: "member",
    args: [
      z.object({
        sessionId: z.string().min(1).max(64),
        roomName: z.string().max(200),
        layout: z.enum(["grid", "speaker", "single-speaker"]).optional(),
        audioOnly: z.boolean().optional(),
      }),
    ],
    community: ([config]) => communityOfSession(config.sessionId),
    rateLimit: "create",
  },
  async (ctx, config: RecordingConfig) => {
    await assertSessionHost(ctx, config.sessionId);
  try {
    return await createSessionRecording({
      sessionId: config.sessionId,
      layout: config.layout,
      audioOnly: config.audioOnly,
    });
  } catch (error) {
    console.error("[Recording] Failed to start:", error);
    return { success: false, error: "Failed to start recording" };
  }
}
);

/**
 * Stop recording for a session
 *
 * NOTE: For V1, recording stops automatically when room ends or via LiveKit dashboard.
 * This function marks the recording as stopped in our DB.
 */
export const stopRecording = defineAction(
  {
    name: "stopRecording",
    auth: "member",
    args: [z.string().min(1).max(64)],
    community: ([sessionId]) => communityOfSession(sessionId),
  },
  async (ctx, sessionId: string) => {
    await assertSessionHost(ctx, sessionId);
  try {

    const userId = ctx.userId;
    // Verify host
    const session = await prisma.mentorSession.findUnique({
      where: { id: sessionId },
      select: { mentorId: true },
    });

    if (!session || session.mentorId !== userId) {
      return { success: false, error: "Not authorized" };
    }

    // Find active recording
    const recording = await prisma.recording.findFirst({
      where: {
        sessionId,
        status: "PROCESSING",
      },
    });

    if (!recording) {
      return { success: false, error: "No active recording" };
    }

    // For V1: Recording stops automatically via LiveKit when room ends
    // We just update our DB record. The webhook will update final status.
    console.log(`[Recording] Stop requested for session ${sessionId}`);
    console.log(`[Recording] Actual stop will be handled by LiveKit when room ends`);

    return { success: true };
  } catch (error) {
    console.error("[Recording] Failed to stop:", error);
    return { success: false, error: "Failed to stop recording" };
  }
}
);

/**
 * Get recording status and info
 */
export const getRecordingStatus = defineAction(
  {
    name: "getRecordingStatus",
    auth: "member",
    args: [z.string().min(1).max(64)],
    community: ([sessionId]) => communityOfSession(sessionId),
  },
  async (_ctx, sessionId: string) => {
  try {
    const recording = await prisma.recording.findUnique({
      where: { sessionId },
    });

    if (!recording) {
      return { success: false, error: "No recording found" };
    }

    return {
      success: true,
      recording: {
        id: recording.id,
        status: recording.status,
        url: recording.url,
        durationSeconds: recording.durationSeconds,
      },
    };
  } catch (error) {
    console.error("[Recording] Failed to get status:", error);
    return { success: false, error: "Failed to get recording status" };
  }
}
);

/**
 * List recordings for a community
 */
export const listRecordings = defineAction(
  {
    name: "listRecordings",
    auth: "member",
    args: [
      z.string().min(1).max(64),
      z
        .object({
          limit: z.number().int().min(1).max(100).optional(),
          offset: z.number().int().min(0).max(100_000).optional(),
          status: z.enum(["PROCESSING", "READY", "FAILED"]).optional(),
        })
        .optional(),
    ],
    community: ([communityId]) => communityById(communityId),
  },
  async (_ctx, communityId: string, options?: { limit?: number; offset?: number; status?: "PROCESSING" | "READY" | "FAILED"; }) => {
  try {
    const recordings = await prisma.recording.findMany({
      where: {
        session: {
          communityId,
        },
        ...(options?.status && { status: options.status }),
      },
      include: {
        session: {
          select: {
            id: true,
            title: true,
            scheduledAt: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: options?.limit || 20,
      skip: options?.offset || 0,
    });

    return {
      success: true,
      recordings: recordings.map((r) => ({
        id: r.id,
        sessionId: r.sessionId,
        sessionTitle: r.session.title,
        status: r.status,
        url: r.url,
        durationSeconds: r.durationSeconds,
        createdAt: r.createdAt,
      })),
    };
  } catch (error) {
    console.error("[Recording] Failed to list:", error);
    return { success: false, error: "Failed to list recordings" };
  }
}
);

/**
 * Delete a recording
 */
export const deleteRecording = defineAction(
  {
    name: "deleteRecording",
    auth: "member",
    args: [z.string().min(1).max(64)],
    community: ([recordingId]) => communityOfRecording(recordingId),
  },
  async (ctx, recordingId: string) => {
    const recording = await prisma.recording.findUnique({
      where: { id: recordingId },
      select: { sessionId: true },
    });

    if (!recording) {
      return { success: false as const, error: "Recording not found" };
    }

    // The comment here used to say "host or admin" while the code compared
    // mentorId alone, so a community OWNER/ADMIN could not delete a recording.
    // assertSessionHost implements the documented policy — host or community
    // OWNER/ADMIN — and matches startCompositeRecording. Runs above the try so
    // its ForbiddenError reaches the seam.
    await assertSessionHost(ctx, recording.sessionId);

  try {
    // TODO: Delete from S3/R2 storage
    // const s3Client = new S3Client(...);
    // await s3Client.send(new DeleteObjectCommand({...}));

    // Delete from database
    await prisma.recording.delete({
      where: { id: recordingId },
    });

    return { success: true };
  } catch (error) {
    console.error("[Recording] Failed to delete:", error);
    return { success: false, error: "Failed to delete recording" };
  }
}
);



/**
 * Generate signed URL for private recording access
 * Optional: if you want to keep recordings private
 */
export const getSignedRecordingUrl = defineAction(
  {
    name: "getSignedRecordingUrl",
    auth: "member",
    args: [z.string().min(1).max(64)],
    community: ([recordingId]) => communityOfRecording(recordingId),
  },
  async (_ctx, recordingId: string) => {
  try {



    const recording = await prisma.recording.findUnique({
      where: { id: recordingId },
      include: {
        session: {
          select: {
            communityId: true,
            mentorId: true,
          },
        },
      },
    });

    if (!recording || !recording.url) {
      return { success: false, error: "Recording not found" };
    }

    // TODO: Implement signed URL generation
    // For now, return the direct URL if it's public
    // In production, use S3 GetObjectCommand with Presigner

    return { success: true, url: recording.url };
  } catch (error) {
    console.error("[Recording] Failed to get signed URL:", error);
    return { success: false, error: "Failed to generate URL" };
  }
}
);
