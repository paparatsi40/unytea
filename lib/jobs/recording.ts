/**
 * Internal recording pipeline — deliberately NOT a "use server" module.
 *
 * autoStartRecording is driven by the LiveKit `room_started` webhook, never by
 * a browser. While it lived in a "use server" file it was a public POST
 * endpoint that could start an egress against any session (SEC-11).
 */
import { prisma } from "@/lib/prisma";

export interface RecordingCoreConfig {
  sessionId: string;
  layout?: "grid" | "speaker" | "single-speaker";
  audioOnly?: boolean;
}

/**
 * Create the Recording row for a live session.
 *
 * Shared by the host-triggered action (app/actions/recording.ts, which performs
 * the authorization) and by the LiveKit `room_started` webhook below (which has
 * no session to authorize against). Deliberately performs no auth of its own —
 * the caller is responsible, and neither caller is reachable from a browser
 * without one.
 */
export async function createSessionRecording(config: RecordingCoreConfig) {
  const session = await prisma.mentorSession.findUnique({
    where: { id: config.sessionId },
    select: { status: true, videoRoomName: true },
  });

  if (!session) return { success: false as const, error: "Session not found" };
  if (session.status !== "IN_PROGRESS") return { success: false as const, error: "Session not live" };

  const existing = await prisma.recording.findUnique({
    where: { sessionId: config.sessionId },
  });
  if (existing && existing.status === "PROCESSING") {
    return { success: false as const, error: "Recording already in progress" };
  }

  // V1: the egress is started by LiveKit Cloud config; this row is updated when
  // the `egress_started` webhook arrives.
  const recording = await prisma.recording.create({
    data: {
      sessionId: config.sessionId,
      status: "PROCESSING",
      egressId: `pending-${Date.now()}`,
      processingStartedAt: new Date(),
      storageProvider: "s3",
    },
  });

  return {
    success: true as const,
    recording: {
      egressId: recording.egressId || "",
      status: "PENDING_WEBHOOK",
      startedAt: new Date(),
    },
  };
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

    // Create recording record
    await createSessionRecording({
      sessionId,
      layout: "grid",
      audioOnly: session.mode === "AUDIO",
    });
  } catch (error) {
    console.error("[Recording] Auto-start error:", error);
  }
}