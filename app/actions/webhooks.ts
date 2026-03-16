"use server";

import { WebhookReceiver } from "livekit-server-sdk";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { autoStartRecording } from "./recording";
import { createNotification } from "./notifications";
import { generateAISessionSummary } from "./session-ai";

// LiveKit configuration
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || "";
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || "";

if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
  console.warn("LiveKit API credentials not configured. Webhook verification will fail.");
}

const receiver = new WebhookReceiver(
  LIVEKIT_API_KEY,
  LIVEKIT_API_SECRET
);

export type LiveKitWebhookEvent =
  | "room_started"
  | "room_finished"
  | "participant_joined"
  | "participant_left"
  | "track_published"
  | "track_unpublished"
  | "egress_started"
  | "egress_updated"
  | "egress_ended";

/**
 * Handle incoming LiveKit webhook
 * This should be called from an API route (app/api/webhooks/livekit/route.ts)
 */
export async function handleLiveKitWebhook(
  body: string,
  authorizationHeader: string
): Promise<{ success: boolean; message: string }> {
  try {
    // Verify webhook signature
    if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
      return { success: false, message: "Webhook secret not configured" };
    }

    // Parse and verify the webhook event
    const event = await receiver.receive(body, authorizationHeader);

    console.log(`[LiveKit Webhook] ${event.event}:`, {
      room: event.room?.name,
      roomSid: event.room?.sid,
      participant: event.participant?.identity,
      egressId: event.egressInfo?.egressId,
    });

    // Route to specific handler based on event type
    switch (event.event) {
      case "room_started":
        await handleRoomStarted(event);
        break;
      case "room_finished":
        await handleRoomFinished(event);
        break;
      case "participant_joined":
        await handleParticipantJoined(event);
        break;
      case "participant_left":
        await handleParticipantLeft(event);
        break;
      case "egress_started":
        await handleEgressStarted(event);
        break;
      case "egress_updated":
        await handleEgressUpdated(event);
        break;
      case "egress_ended":
        await handleEgressEnded(event);
        break;
      default:
        console.log(`[LiveKit Webhook] Unhandled event: ${event.event}`);
    }

    return { success: true, message: `Processed ${event.event}` };
  } catch (error) {
    console.error("[LiveKit Webhook] Error processing webhook:", error);
    return { success: false, message: "Webhook processing failed" };
  }
}

/**
 * Room started - Session is now live
 */
async function handleRoomStarted(event: any) {
  const roomName = event.room?.name;
  if (!roomName) return;

  // Extract session ID from room name (format: "session-{id}")
  const sessionId = roomName.replace("session-", "");

  // Update session status
  await prisma.mentorSession.update({
    where: { id: sessionId },
    data: {
      status: "IN_PROGRESS",
      startedAt: new Date(),
    },
  });

  // Auto-start recording
  await autoStartRecording(sessionId);

  // Log event
  await logSessionEvent(sessionId, "ROOM_STARTED", {
    roomSid: event.room?.sid,
    roomName,
  });

  console.log(`[LiveKit] Session ${sessionId} started`);
}

/**
 * Room finished - Session has ended
 */
async function handleRoomFinished(event: any) {
  const roomName = event.room?.name;
  if (!roomName) return;

  const sessionId = roomName.replace("session-", "");

  // Update session status
  await prisma.mentorSession.update({
    where: { id: sessionId },
    data: {
      status: "COMPLETED",
      endedAt: new Date(),
    },
  });

  // Close any open participations (users who didn't properly leave)
  const openParticipations = await prisma.sessionParticipation.findMany({
    where: {
      sessionId,
      leftAt: null,
    },
  });

  const now = new Date();
  for (const participation of openParticipations) {
    const durationSeconds = Math.floor(
      (now.getTime() - participation.joinedAt.getTime()) / 1000
    );

    await prisma.sessionParticipation.update({
      where: { id: participation.id },
      data: {
        leftAt: now,
        durationSeconds: (participation.durationSeconds || 0) + durationSeconds,
      },
    });
  }

  // Log event
  await logSessionEvent(sessionId, "ROOM_FINISHED", {
    roomSid: event.room?.sid,
    duration: event.room?.duration,
    numParticipants: event.room?.numParticipants,
  });

  // Trigger revalidation
  revalidatePath(`/dashboard/sessions/${sessionId}`);
  revalidatePath(`/dashboard/sessions`);

  console.log(`[LiveKit] Session ${sessionId} finished`);
}

/**
 * Participant joined
 */
async function handleParticipantJoined(event: any) {
  const roomName = event.room?.name;
  const identity = event.participant?.identity;
  if (!roomName || !identity) return;

  const sessionId = roomName.replace("session-", "");

  // Extract user ID from identity (format: "{userId}-{timestamp}")
  const userId = identity.split("-")[0];

  // Update or create participation
  await prisma.sessionParticipation.upsert({
    where: {
      sessionId_userId: {
        sessionId,
        userId,
      },
    },
    create: {
      sessionId,
      userId,
      livekitIdentity: identity,
      joinedAt: new Date(),
    },
    update: {
      livekitIdentity: identity,
      leftAt: null, // Rejoining
    },
  });

  // Update attendee count
  await prisma.mentorSession.update({
    where: { id: sessionId },
    data: {
      attendeeCount: {
        increment: 1,
      },
    },
  });

  await logSessionEvent(sessionId, "PARTICIPANT_JOINED", {
    userId,
    identity,
    metadata: event.participant?.metadata,
  });
}

/**
 * Participant left
 */
async function handleParticipantLeft(event: any) {
  const roomName = event.room?.name;
  const identity = event.participant?.identity;
  if (!roomName || !identity) return;

  const sessionId = roomName.replace("session-", "");
  const userId = identity.split("-")[0];

  // Find participation
  const participation = await prisma.sessionParticipation.findUnique({
    where: {
      sessionId_userId: {
        sessionId,
        userId,
      },
    },
  });

  if (participation) {
    const leftAt = new Date();
    const durationSeconds = Math.floor(
      (leftAt.getTime() - participation.joinedAt.getTime()) / 1000
    );

    await prisma.sessionParticipation.update({
      where: { id: participation.id },
      data: {
        leftAt,
        durationSeconds: (participation.durationSeconds || 0) + durationSeconds,
      },
    });
  }

  await logSessionEvent(sessionId, "PARTICIPANT_LEFT", {
    userId,
    identity,
    duration: event.participant?.duration,
  });
}

/**
 * Egress (recording) started
 */
async function handleEgressStarted(event: any) {
  const egressInfo = event.egressInfo;
  if (!egressInfo) return;

  const roomName = egressInfo.roomName;
  const sessionId = roomName?.replace("session-", "");
  if (!sessionId) return;

  // Create or update recording
  await prisma.recording.upsert({
    where: { sessionId },
    create: {
      sessionId,
      status: "PROCESSING",
      egressId: egressInfo.egressId,
      processingStartedAt: new Date(),
    },
    update: {
      status: "PROCESSING",
      egressId: egressInfo.egressId,
      processingStartedAt: new Date(),
    },
  });

  await logSessionEvent(sessionId, "EGRESS_STARTED", {
    egressId: egressInfo.egressId,
    roomName,
    startedAt: egressInfo.startedAt,
  });

  console.log(`[LiveKit] Recording started for session ${sessionId}`);
}

/**
 * Egress status updated
 */
async function handleEgressUpdated(event: any) {
  const egressInfo = event.egressInfo;
  if (!egressInfo) return;

  // Find recording by egress ID
  const recording = await prisma.recording.findUnique({
    where: { egressId: egressInfo.egressId },
  });

  if (!recording) return;

  // Update status if needed
  const status = mapEgressStatus(egressInfo.status);
  if (status !== recording.status) {
    await prisma.recording.update({
      where: { id: recording.id },
      data: { status },
    });
  }

  await logSessionEvent(recording.sessionId, "EGRESS_UPDATED", {
    egressId: egressInfo.egressId,
    status: egressInfo.status,
  });
}

/**
 * Egress finished - Recording complete
 */
async function handleEgressEnded(event: any) {
  const egressInfo = event.egressInfo;
  if (!egressInfo) return;

  const recording = await prisma.recording.findUnique({
    where: { egressId: egressInfo.egressId },
  });

  if (!recording) return;

  const sessionId = recording.sessionId;

  // Extract file info from egress
  const fileResults = egressInfo.fileResults || [];
  const fileResult = fileResults[0]; // Main recording file

  if (fileResult) {
    await prisma.recording.update({
      where: { id: recording.id },
      data: {
        status: "READY",
        url: fileResult.filename, // This will be the S3/R2 URL
        fileSize: fileResult.size,
        durationSeconds: fileResult.duration,
        processingEndedAt: new Date(),
      },
    });

    // Update session with recording URL
    await prisma.mentorSession.update({
      where: { id: sessionId },
      data: {
        recordingUrl: fileResult.filename,
      },
    });

    const sessionWithParticipants = await prisma.mentorSession.findUnique({
      where: { id: sessionId },
      select: {
        title: true,
        slug: true,
        mentorId: true,
        menteeId: true,
        participations: { select: { userId: true } },
      },
    });

    if (sessionWithParticipants) {
      const targetUserIds = [
        sessionWithParticipants.mentorId,
        sessionWithParticipants.menteeId,
        ...sessionWithParticipants.participations.map((p) => p.userId),
      ];

      const uniqueTargetUserIds = [...new Set(targetUserIds.filter(Boolean))];
      const replayLink = sessionWithParticipants.slug
        ? `/sessions/${sessionWithParticipants.slug}`
        : `/dashboard/recordings`;

      for (const userId of uniqueTargetUserIds) {
        const notificationKey = `recording_ready:${sessionId}:${recording.id}:${userId}`;

        const alreadySent = await prisma.notification.findFirst({
          where: {
            userId,
            type: "SYSTEM",
            data: {
              path: ["notificationKey"],
              equals: notificationKey,
            },
          },
          select: { id: true },
        });

        if (alreadySent) continue;

        await createNotification({
          userId,
          type: "SYSTEM",
          title: "Recording is ready",
          message: `The recording for \"${sessionWithParticipants.title}\" is now available.`,
          data: {
            notificationKey,
            sessionId,
            recordingId: recording.id,
            recordingUrl: fileResult.filename,
            link: replayLink,
            type: "recording_ready",
          },
        });
      }
    }

    // Trigger post-processing jobs
    await triggerPostProcessing(sessionId, recording.id);
  } else {
    // Failed
    await prisma.recording.update({
      where: { id: recording.id },
      data: {
        status: "FAILED",
        errorMessage: egressInfo.error || "Unknown error",
        processingEndedAt: new Date(),
      },
    });
  }

  await logSessionEvent(sessionId, "EGRESS_ENDED", {
    egressId: egressInfo.egressId,
    status: egressInfo.status,
    fileResults,
  });

  revalidatePath(`/dashboard/sessions/${sessionId}`);

  console.log(`[LiveKit] Recording ${egressInfo.status} for session ${sessionId}`);
}

/**
 * Map LiveKit egress status to our RecordingStatus
 */
function mapEgressStatus(egressStatus: string): "PROCESSING" | "READY" | "FAILED" {
  switch (egressStatus) {
    case "EGRESS_COMPLETE":
      return "READY";
    case "EGRESS_FAILED":
      return "FAILED";
    case "EGRESS_ABORTED":
      return "FAILED";
    default:
      return "PROCESSING";
  }
}

/**
 * Log session event for audit trail
 */
async function logSessionEvent(
  sessionId: string,
  type: string,
  payload: any
) {
  await prisma.sessionEvent.create({
    data: {
      sessionId,
      type: type as any,
      payload,
    },
  });
}

/**
 * Trigger post-processing jobs after recording is ready
 */
async function triggerPostProcessing(sessionId: string, recordingId: string) {
  // TODO: Queue jobs for:
  // 1. Generate transcript
  // 2. Generate summary/notes stub
  // 3. Create recap post
  // 4. Suggest add to course

  console.log(`[Post-Processing] Triggered for session ${sessionId}`);

  // For now, execute summary generation directly (can move to queue later)
  const summaryResult = await generateAISessionSummary(sessionId);

  await logSessionEvent(sessionId, "POST_PROCESSING_TRIGGERED", {
    recordingId,
    jobs: ["transcript", "summary", "recap", "course_suggestion"],
    summaryGenerated: summaryResult.success,
  });
}

/**
 * Manual trigger to start recording (composite egress)
 * Call this when host starts the session
 */
export async function startRecording(
  sessionId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // This will be implemented with LiveKit Server SDK
    // Requires backend API call to LiveKit Cloud
    console.log(`[Recording] Requested start for session ${sessionId}`);

    // TODO: Implement actual Egress API call
    // const egressClient = new EgressClient(LIVEKIT_URL, API_KEY, API_SECRET);
    // await egressClient.startRoomCompositeEgress(...);

    return { success: true };
  } catch (error) {
    console.error("[Recording] Failed to start:", error);
    return { success: false, error: "Failed to start recording" };
  }
}
