/**
 * Internal pipeline — deliberately NOT a "use server" module.
 *
 * Next.js turns every export of a "use server" file into a public POST
 * endpoint, which made these reachable without the CRON_SECRET that guards
 * the cron routes calling them (SEC-11). They are imported directly by those
 * routes instead, so the secret is the only way in.
 */
import { WebhookReceiver, EgressStatus, type WebhookEvent } from "livekit-server-sdk";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { autoStartRecording } from "@/lib/jobs/recording";
import { createNotification } from "@/lib/notifications";
import { generateAISessionSummary } from "./session-ai";
import { PostContentType, Prisma, SessionEventType } from "@prisma/client";
import { meterCompletedSession } from "@/lib/usage/video-usage";
import { markAutopilotStep } from "./autopilot";

// LiveKit configuration
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || "";
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || "";

if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
  console.warn("LiveKit API credentials not configured. Webhook verification will fail.");
}

const receiver = new WebhookReceiver(LIVEKIT_API_KEY, LIVEKIT_API_SECRET);

const AUTO_START_RECORDING = process.env.AUTO_START_RECORDING === "true";

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
export type WebhookResult =
  | { success: true; message: string }
  | {
      success: false;
      reason: "config" | "signature" | "processing";
      message: string;
    };

export async function handleLiveKitWebhook(
  body: string,
  authorizationHeader: string
): Promise<WebhookResult> {
  // Config check — server-side misconfiguration, not a client error.
  if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
    console.error(
      "[LiveKit Webhook] Server config missing: LIVEKIT_API_KEY or LIVEKIT_API_SECRET not set"
    );
    return {
      success: false,
      reason: "config",
      message: "Webhook secret not configured",
    };
  }

  // Signature verification — own try/catch. WebhookReceiver.receive() throws
  // when the auth header doesn't validate against the configured key/secret.
  // Routed to HTTP 401 by the caller; deliberately NO logging here — context
  // about the request (user-agent, etc.) lives in the route handler.
  let event: Awaited<ReturnType<typeof receiver.receive>>;
  try {
    event = await receiver.receive(body, authorizationHeader);
  } catch {
    return {
      success: false,
      reason: "signature",
      message: "Signature verification failed",
    };
  }

  // Processing — own try/catch. Any failure here (DB errors, handler bugs,
  // network) is transient/retryable; routed to HTTP 500 by the caller.
  try {
    console.log(`[LiveKit Webhook] ${event.event}:`, {
      room: event.room?.name,
      roomSid: event.room?.sid,
      participant: event.participant?.identity,
      egressId: event.egressInfo?.egressId,
    });

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
    console.error("[LiveKit Webhook] Processing failed:", error);
    return {
      success: false,
      reason: "processing",
      message: "Webhook processing failed",
    };
  }
}

/**
 * Find the session a LiveKit room belongs to.
 *
 * The room name is NOT `session-${id}`, and treating it as one is what took
 * this webhook down. Every handler derived the id with
 * `roomName.replace("session-", "")`, against a name that `joinSession` picks
 * as `videoRoomName || roomId || "session-" + id` — so for any session that
 * already carried a `roomId`, the stripped value was somebody else's string.
 * Production: room `session-avkC13q3ImvD` for session
 * `cmt1tdkyc0001ylf2i6n711mo`.
 *
 * The damage was different in each handler and all of it was invisible:
 *
 *   room_started    `findUnique` missed, the handler warned "Ack & skip" and
 *                   returned. The session was never marked IN_PROGRESS and
 *                   `startedAt` stayed NULL — which is the lifecycle bug, and
 *                   through it the empty usage counter, "sessions this week"
 *                   stuck at zero, and a post-session duration of 0 min.
 *   room_finished   Same miss, so the room's own end never marked the session
 *                   COMPLETED and never metered it.
 *   participant_*   The join handler did not check. `mentorSession.update`
 *                   raised P2025 "Record to update not found", the outer catch
 *                   turned it into a 500, and LiveKit retried the same event
 *                   for as long as it kept failing.
 *
 * The name is matched against the columns it is actually stored in. The
 * stripped id stays as the last arm because a room genuinely created as
 * `session-${id}` before `videoRoomName` was written back still has to resolve.
 */
async function resolveSessionByRoom(roomName: string) {
  const strippedId = roomName.startsWith("session-") ? roomName.slice("session-".length) : roomName;

  return prisma.mentorSession.findFirst({
    where: {
      OR: [{ videoRoomName: roomName }, { roomId: roomName }, { id: strippedId }],
    },
    select: { id: true, communityId: true, status: true, startedAt: true },
  });
}

/**
 * Room started - Session is now live
 */
async function handleRoomStarted(event: WebhookEvent) {
  const roomName = event.room?.name;
  if (!roomName) return;

  const session = await resolveSessionByRoom(roomName);

  if (!session) {
    console.warn(`[livekit-webhook] room_started for unresolvable room=${roomName}. Ack & skip.`);
    return;
  }

  const sessionId = session.id;

  // The room is live, so the session is. `startedAt` is written once — a room
  // can be restarted, and moving the start forward would shorten every figure
  // derived from it.
  await prisma.mentorSession.update({
    where: { id: sessionId },
    data: {
      status: "IN_PROGRESS",
      ...(session.startedAt ? {} : { startedAt: new Date() }),
    },
  });

  // Auto-start recording (optional, disabled by default)
  if (AUTO_START_RECORDING) {
    await autoStartRecording(sessionId);
  } else {
    console.log(`[LiveKit] Auto recording is disabled for session ${sessionId}`);
  }

  // Feed lifecycle posts
  await ensureSessionLifecyclePost(sessionId, "pre_session", {
    titlePrefix: "🧵 Pre-session thread",
    body: "Drop your questions below before we go live.",
  });

  await ensureSessionLifecyclePost(sessionId, "live_started", {
    titlePrefix: "🔴 Live now",
    body: "We are live now. Join and share your questions in real time.",
  });

  // Log event
  await logSessionEvent(sessionId, SessionEventType.ROOM_STARTED, {
    roomSid: event.room?.sid,
    roomName,
  });

  await markAutopilotStep(sessionId, session?.communityId, "live", {
    source: "room_started",
  });

  console.log(`[LiveKit] Session ${sessionId} started`);
}

/**
 * Room finished - Session has ended
 */
async function handleRoomFinished(event: WebhookEvent) {
  const roomName = event.room?.name;
  if (!roomName) return;

  const finishedSession = await resolveSessionByRoom(roomName);

  if (!finishedSession) {
    console.warn(`[livekit-webhook] room_finished for unresolvable room=${roomName}. Ack & skip.`);
    return;
  }

  const sessionId = finishedSession.id;

  // Update session status
  await prisma.mentorSession.update({
    where: { id: finishedSession.id },
    data: {
      status: "COMPLETED",
      endedAt: new Date(),
    },
  });

  // Closes any participation left open (users who didn't properly leave) and
  // counts the session against its community's allowance. Never throws.
  await meterCompletedSession(sessionId);

  // Feed lifecycle post: discussion thread after live
  await ensureSessionLifecyclePost(sessionId, "discussion_thread", {
    titlePrefix: "💬 Discussion thread",
    body: "Session ended. Share your biggest takeaway and follow-up questions below.",
  });

  // Log event
  await logSessionEvent(sessionId, SessionEventType.ROOM_FINISHED, {
    roomSid: event.room?.sid,
    numParticipants: event.room?.numParticipants,
  });

  await markAutopilotStep(sessionId, finishedSession?.communityId, "captured", {
    source: "room_finished",
  });

  // Trigger revalidation
  revalidatePath(`/dashboard/sessions/${sessionId}`);
  revalidatePath(`/dashboard/sessions`);

  console.log(`[LiveKit] Session ${sessionId} finished`);
}

/**
 * Participant joined
 */
async function handleParticipantJoined(event: WebhookEvent) {
  const identity = event.participant?.identity;
  if (!identity) return;

  // Looked up by identity, never parsed out of it.
  //
  // This used to read `identity.split("-")[0]`, for a `{userId}-{timestamp}`
  // shape the token stopped emitting: `joinSession` mints
  // `${sessionId}:${userId}`, which has no hyphen, so the split returned the
  // whole string. That value went into a column with a foreign key to User.id,
  // raised P2003, and the catch below only swallows P2002 — so this handler
  // threw before it ever reached the attendee count, and `participant_left`
  // silently found no row and never wrote a duration.
  //
  // `livekitIdentity` is written by `joinSession` and carries a unique index,
  // so the row can be found by the exact value the token carries. The webhook
  // now has no opinion about the identity's internal shape, which is what stops
  // this class of drift from recurring.
  // The row also carries the session, so this handler needs no opinion about
  // the room name at all — and the room name is exactly what it used to get
  // wrong. `livekitIdentity` is unique, so this is one index hit per event,
  // which matters: these fire once per person rather than once per session.
  const participation = await prisma.sessionParticipation.findUnique({
    where: { livekitIdentity: identity },
    select: { id: true, userId: true, sessionId: true },
  });

  if (!participation) {
    // The room was joined without going through `joinSession` — the only place
    // that mints an identity — or the row was deleted. Nothing to attribute.
    console.warn(
      `[livekit-webhook] participant_joined for unknown identity=${identity}. Ack & skip.`
    );
    return;
  }

  const sessionId = participation.sessionId;

  await prisma.sessionParticipation.update({
    where: { id: participation.id },
    data: { leftAt: null }, // Rejoining
  });

  // Recounted, not incremented.
  //
  // `attendeeCount` means distinct people who joined, and `joinSession` already
  // maintains it as `count(participations)`. An increment here counted the same
  // person twice on their first join and once more on every reconnect, so the
  // two writers disagreed by an amount that grew with the session's flakiness.
  // Counting the rows is idempotent, which is the only thing that survives a
  // webhook that retries.
  const attendeeCount = await prisma.sessionParticipation.count({ where: { sessionId } });
  await prisma.mentorSession.update({
    where: { id: sessionId },
    data: { attendeeCount },
  });

  await logSessionEvent(sessionId, SessionEventType.PARTICIPANT_JOINED, {
    userId: participation.userId,
    identity,
    metadata: event.participant?.metadata,
  });
}

/**
 * Participant left
 */
async function handleParticipantLeft(event: WebhookEvent) {
  const identity = event.participant?.identity;
  if (!identity) return;

  // Same lookup as the join path: by identity, never parsed. This is the write
  // that fills `durationSeconds`, and it is the whole reason the metering in
  // lib/usage/video-usage.ts can be exact rather than estimated.
  const participation = await prisma.sessionParticipation.findUnique({
    where: { livekitIdentity: identity },
  });

  if (!participation) {
    console.warn(
      `[livekit-webhook] participant_left for unknown identity=${identity}. Ack & skip.`
    );
    return;
  }

  const sessionId = participation.sessionId;

  // Closed once. `leaveSession` accumulates the same span from the app side,
  // and LiveKit itself can redeliver an event; either would count the time
  // twice. Only `joinSession` reopens the stretch by clearing `leftAt`.
  if (participation.leftAt) {
    return;
  }

  const leftAt = new Date();
  const durationSeconds = Math.floor((leftAt.getTime() - participation.joinedAt.getTime()) / 1000);

  await prisma.sessionParticipation.update({
    where: { id: participation.id },
    data: {
      leftAt,
      // Accumulated, not replaced: a participant who drops and rejoins is one
      // row, and both stretches count.
      durationSeconds: (participation.durationSeconds || 0) + durationSeconds,
    },
  });

  await logSessionEvent(sessionId, SessionEventType.PARTICIPANT_LEFT, {
    userId: participation.userId,
    identity,
  });
}

/**
 * DORMANT — session recording was withdrawn on 2026-08-18.
 *
 * The three egress handlers below and `startRecording` at the bottom of this
 * file are kept as scaffolding in case recording is revisited. They are
 * unreachable in practice: nothing calls the Egress API (`startRecording` is
 * still a `TODO: Implement actual Egress API call`), so no `egress_*` webhook
 * ever arrives and no `Recording` row is ever written.
 *
 * DO NOT enable egress — in the LiveKit Cloud project config or anywhere else —
 * without also restoring the UI that was removed. Rows appearing here would
 * unhide code paths across the app that are gated on `recordingUrl`, which is
 * how a withdrawn feature comes back halfway.
 */
async function handleEgressStarted(event: WebhookEvent) {
  const egressInfo = event.egressInfo;
  if (!egressInfo) return;

  const roomName = egressInfo.roomName;
  if (!roomName) return;

  // Same resolution as everywhere else. DORMANT, but a stripped room name here
  // would write a Recording row keyed to a session that does not exist.
  const session = await resolveSessionByRoom(roomName);
  if (!session) return;
  const sessionId = session.id;

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

  await logSessionEvent(sessionId, SessionEventType.EGRESS_STARTED, {
    egressId: egressInfo.egressId,
    roomName,
    startedAt: egressInfo.startedAt,
  });

  console.log(`[LiveKit] Recording started for session ${sessionId}`);
}

/**
 * Egress status updated
 */
async function handleEgressUpdated(event: WebhookEvent) {
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

  await logSessionEvent(recording.sessionId, SessionEventType.EGRESS_UPDATED, {
    egressId: egressInfo.egressId,
    status: egressInfo.status,
  });
}

/**
 * Egress finished - Recording complete
 */
async function handleEgressEnded(event: WebhookEvent) {
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
        fileSize: Number(fileResult.size),
        durationSeconds: Number(fileResult.duration),
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

  await logSessionEvent(sessionId, SessionEventType.EGRESS_ENDED, {
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
function mapEgressStatus(egressStatus: EgressStatus): "PROCESSING" | "READY" | "FAILED" {
  switch (egressStatus) {
    case EgressStatus.EGRESS_COMPLETE:
      return "READY";
    case EgressStatus.EGRESS_FAILED:
      return "FAILED";
    case EgressStatus.EGRESS_ABORTED:
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
  type: SessionEventType,
  payload: Record<string, unknown>
) {
  await prisma.sessionEvent.create({
    data: {
      sessionId,
      type,
      // Audit payloads carry optional/bigint values (LiveKit protobuf), which
      // aren't InputJsonValue-assignable; serialize through unknown for the
      // Json column.
      payload: payload as unknown as Prisma.InputJsonValue,
    },
  });
}

type LifecycleStage = "pre_session" | "live_started" | "recording_ready" | "discussion_thread";

async function ensureSessionLifecyclePost(
  sessionId: string,
  stage: LifecycleStage,
  data: { titlePrefix: string; body: string }
) {
  const session = await prisma.mentorSession.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      title: true,
      description: true,
      scheduledAt: true,
      duration: true,
      attendeeCount: true,
      recordingUrl: true,
      mentorId: true,
      communityId: true,
      community: {
        select: {
          id: true,
          slug: true,
        },
      },
    },
  });

  if (!session?.communityId) return;

  const existing = await prisma.post.findMany({
    where: {
      communityId: session.communityId,
      contentType: PostContentType.SESSION_ANNOUNCEMENT,
      attachments: {
        path: ["sessionId"],
        equals: sessionId,
      },
    },
    select: {
      id: true,
      attachments: true,
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const alreadyExists = existing.some((post) => {
    const attachments = post.attachments as Record<string, unknown> | null;
    return attachments?.lifecycleStage === stage;
  });

  if (alreadyExists) return;

  await prisma.post.create({
    data: {
      title: `${data.titlePrefix}: ${session.title}`,
      content: data.body,
      contentType: PostContentType.SESSION_ANNOUNCEMENT,
      authorId: session.mentorId,
      communityId: session.communityId,
      attachments: {
        sessionId: session.id,
        sessionTitle: session.title,
        sessionDescription: session.description,
        scheduledAt: session.scheduledAt.toISOString(),
        duration: session.duration,
        recordingUrl: session.recordingUrl,
        attendeeCount: session.attendeeCount,
        lifecycleStage: stage,
      } as Prisma.InputJsonValue,
    },
  });

  revalidatePath(`/dashboard/communities/${session.communityId}/sessions`);
  if (session.community?.slug) {
    revalidatePath(`/dashboard/c/${session.community.slug}/feed`);
  }
}

/**
 * Trigger post-processing jobs after recording is ready
 */
async function triggerPostProcessing(sessionId: string, recordingId: string) {
  console.log(`[Post-Processing] Triggered for session ${sessionId}`);

  // 1) Ensure transcript placeholder exists
  await prisma.sessionNote.upsert({
    where: { sessionId },
    create: {
      sessionId,
      content: "Transcript processing in progress...",
    },
    update: {},
  });

  // 2) Generate AI summary package
  const summaryResult = await generateAISessionSummary(sessionId);

  // 3) Recording ready post
  await ensureSessionLifecyclePost(sessionId, "recording_ready", {
    titlePrefix: "🎬 Recording ready",
    body: "Recording is now available. Watch the replay and continue the conversation.",
  });

  // The recap post used to be created here, a second automatic publish on top
  // of the one at end-of-session. A recording becoming available is not the
  // host deciding to share; the draft is theirs to review in the post-session
  // flow, and only their explicit share creates the post.
  const postProcessingSession = await prisma.mentorSession.findUnique({
    where: { id: sessionId },
    select: { communityId: true },
  });

  await markAutopilotStep(sessionId, postProcessingSession?.communityId, "packaged", {
    summaryGenerated: summaryResult.success,
  });

  await markAutopilotStep(sessionId, postProcessingSession?.communityId, "distributed", {
    source: "recording_ready",
  });

  await logSessionEvent(sessionId, SessionEventType.POST_PROCESSING_TRIGGERED, {
    recordingId,
    // "recap" is no longer one of the jobs run here — the draft waits for the
    // host instead of being published on the recording's schedule.
    jobs: ["transcript", "summary", "recording_ready", "course_suggestion"],
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
