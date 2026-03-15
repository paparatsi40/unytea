"use server";

import { EgressClient, EncodedFileType } from "livekit-server-sdk";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth-utils";

// LiveKit configuration
const LIVEKIT_URL = process.env.LIVEKIT_URL || "wss://unytea-livekit.livekit.cloud";
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || "";
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || "";

// Initialize egress client
function getEgressClient(): EgressClient | null {
  if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
    return null;
  }
  return new EgressClient(LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);
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
 * Uses LiveKit's Room Composite Egress (full room view)
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
      select: { mentorId: true, status: true },
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

    const client = getEgressClient();
    if (!client) {
      return { success: false, error: "Recording service not configured" };
    }

    // Start room composite egress
    // Note: S3 configuration is handled at the LiveKit Cloud dashboard level
    const egressInfo = await client.startRoomCompositeEgress(
      config.roomName,
      {
        fileType: EncodedFileType.MP4,
        filepath: `recordings/${config.sessionId}/${Date.now()}_recording.mp4`,
      },
      {
        layout: config.layout || "grid",
        // Audio-only mode if specified
        ...(config.audioOnly && { audioOnly: true }),
      }
    );

    if (!egressInfo.egressId) {
      return { success: false, error: "Failed to start egress" };
    }

    // Create recording record
    await prisma.recording.create({
      data: {
        sessionId: config.sessionId,
        status: "PROCESSING",
        egressId: egressInfo.egressId,
        processingStartedAt: new Date(),
        storageProvider: "s3", // Default to s3, actual provider set in LiveKit Cloud
      },
    });

    return {
      success: true,
      recording: {
        egressId: egressInfo.egressId,
        status: "STARTING",
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

    if (!recording || !recording.egressId) {
      return { success: false, error: "No active recording" };
    }

    const client = getEgressClient();
    if (!client) {
      return { success: false, error: "Recording service not configured" };
    }

    // Stop egress
    await client.stopEgress(recording.egressId);

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
