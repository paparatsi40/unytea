"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth-utils";

// LiveKit configuration
const LIVEKIT_URL = process.env.LIVEKIT_URL || "wss://unytea-livekit.livekit.cloud";
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || "";
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || "";

// Initialize egress client
  if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
    return null;
  }
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
export async function startCompositeRecording(
  config: RecordingConfig
): Promise<{ success: boolean; recording?: RecordingInfo; error?: string }> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, error: "Authentication required" };
    }

    // Verify host
    const session = await prisma.mentorSession.findUnique({
      where: { id: config.sessionId },
      select: { mentorId: true, status: true, videoRoomName: true },
    });

    if (!session) {
      return { success: false, error: "Session not found" };
    }

    if (session.mentorId !== userId) {
      return { success: false, error: "Only host can start recording" };
    }

    if (session.status !== "IN_PROGRESS") {
      return { success: false, error: "Session not live" };
    }

    // Check if recording already exists
    const existing = await prisma.recording.findUnique({
      where: { sessionId: config.sessionId },
    });

    if (existing && existing.status === "PROCESSING") {
      return { success: false, error: "Recording already in progress" };
    }

    // For V1: Recording is auto-started via LiveKit Cloud dashboard config
    // We just create the DB record here with a placeholder egressId
    // The webhook handler will update this when the actual egress starts
    const recording = await prisma.recording.create({
      data: {
        sessionId: config.sessionId,
        status: "PROCESSING",
        egressId: `pending-${Date.now()}`, // Placeholder until webhook arrives
        processingStartedAt: new Date(),
        storageProvider: "s3",
      },
    });

    console.log(`[Recording] Recording initialized for session ${config.sessionId}`);
    console.log(`[Recording] Actual recording will start via LiveKit Cloud webhook`);

    return {
      success: true,
      recording: {
        egressId: recording.egressId,
        status: "PENDING_WEBHOOK",
        startedAt: new Date(),
      },
    };
  } catch (error) {
    console.error("[Recording] Failed to start:", error);
    return { success: false, error: "Failed to start recording" };
  }
}

/**
 * Stop recording for a session
 * 
 * NOTE: For V1, recording stops automatically when room ends or via LiveKit dashboard.
 * This function marks the recording as stopped in our DB.
 */
export async function stopRecording(
  sessionId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, error: "Authentication required" };
    }

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
    await prisma.recording.update({
      where: { id: recording.id },
      data: {
        // Keep as PROCESSING until webhook confirms completion
        // This is just a marker that we requested stop
      },
    });

    console.log(`[Recording] Stop requested for session ${sessionId}`);
    console.log(`[Recording] Actual stop will be handled by LiveKit when room ends`);

    return { success: true };
  } catch (error) {
    console.error("[Recording] Failed to stop:", error);
    return { success: false, error: "Failed to stop recording" };
  }
}

/**
 * Get recording status and info
 */
export async function getRecordingStatus(
  sessionId: string
): Promise<{
  success: boolean;
  recording?: {
    id: string;
    status: string;
    url: string | null;
    durationSeconds: number | null;
    fileSize: number | null;
    processingProgress?: number;
  };
  error?: string;
}> {
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
        fileSize: recording.fileSize,
      },
    };
  } catch (error) {
    console.error("[Recording] Failed to get status:", error);
    return { success: false, error: "Failed to get recording status" };
  }
}

/**
 * List recordings for a community
 */
export async function listRecordings(
  communityId: string,
  options?: {
    limit?: number;
    offset?: number;
    status?: "PROCESSING" | "READY" | "FAILED";
  }
): Promise<{
  success: boolean;
  recordings?: Array<{
    id: string;
    sessionId: string;
    sessionTitle: string;
    status: string;
    url: string | null;
    durationSeconds: number | null;
    createdAt: Date;
  }>;
  error?: string;
}> {
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

/**
 * Delete a recording
 */
export async function deleteRecording(
  recordingId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, error: "Authentication required" };
    }

    const recording = await prisma.recording.findUnique({
      where: { id: recordingId },
      include: {
        session: {
          select: { mentorId: true },
        },
      },
    });

    if (!recording) {
      return { success: false, error: "Recording not found" };
    }

    // Only host or admin can delete
    if (recording.session.mentorId !== userId) {
      return { success: false, error: "Not authorized" };
    }

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

/**
 * Auto-start recording when session goes live
 * Call this from the room_started webhook handler
 */
export async function autoStartRecording(sessionId: string): Promise<void> {
  try {
    const session = await prisma.mentorSession.findUnique({
      where: { id: sessionId },
      select: {
        videoRoomName: true,
        mode: true,
      },
    });

    if (!session || !session.videoRoomName) {
      console.error(`[Recording] No room name for session ${sessionId}`);
      return;
    }

    // Check if recording already exists
    const existing = await prisma.recording.findUnique({
      where: { sessionId },
    });

    if (existing) {
      console.log(`[Recording] Already exists for session ${sessionId}`);
      return;
    }

    // Start recording
    const result = await startCompositeRecording({
      sessionId,
      roomName: session.videoRoomName,
      layout: "grid",
      audioOnly: session.mode === "AUDIO",
    });

    if (result.success) {
      console.log(`[Recording] Auto-started for session ${sessionId}`);
    } else {
      console.error(`[Recording] Auto-start failed:`, result.error);
    }
  } catch (error) {
    console.error("[Recording] Auto-start error:", error);
  }
}

/**
 * Generate signed URL for private recording access
 * Optional: if you want to keep recordings private
 */
export async function getSignedRecordingUrl(
  recordingId: string,
  expiresInSeconds: number = 3600
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, error: "Authentication required" };
    }

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
