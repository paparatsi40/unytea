"use server";

import { z } from "zod";
import { AccessToken, RoomServiceClient } from "livekit-server-sdk";
import { ParticipationRole, Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { defineAction } from "@/lib/actions/define-action";
import { assertSessionHost } from "@/lib/actions/guards";
import { communityOfSession } from "@/lib/actions/resolvers";
import { AUDIENCE_PUBLISHES_DATA, canPublishTracks } from "@/lib/livekit/permissions";

/**
 * LiveKit access — the single token issuer for the product.
 *
 * There used to be two (C3): this module's `generateLiveKitToken`, and
 * `POST /api/livekit/token`. Both were independently broken, in different ways:
 *
 *  - The API route granted `canPublish: true` for **any client-supplied
 *    roomName** to any authenticated account, with no membership check at all.
 *    A free account could join and broadcast in a paid private session (SEC-03).
 *  - This module let the caller pass their own `role`. A non-participant who
 *    sent `{ role: "host" }` kept it, because the value was only overwritten for
 *    the mentor or for someone with an existing participation row — so they got
 *    publish rights (SEC-04). It also accepted `roomName`, letting the grant be
 *    redirected to an arbitrary room in the LiveKit project.
 *
 * The route is deleted; this is the only issuer. It accepts a sessionId and
 * nothing else. The room, the role and therefore the publish permission are all
 * derived server-side, and `defineAction`'s `member` level enforces ACTIVE
 * membership of the hosting community plus the paywall gate before any of it
 * runs.
 */

const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || "";
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || "";
const LIVEKIT_URL =
  process.env.LIVEKIT_URL?.trim() ||
  process.env.NEXT_PUBLIC_LIVEKIT_URL?.trim() ||
  "wss://unytea-livekit.livekit.cloud";

const TOKEN_TTL_SECONDS = 2 * 60 * 60;

const sessionIdSchema = z.string().min(1).max(64);
const identitySchema = z.string().min(1).max(200);

/**
 * The server-side room API, for changing a permission on a participant who is
 * already connected.
 *
 * A token's grant is frozen at join. Promoting someone to speaker in the
 * database changed a row and nothing else — the browser's token still said
 * `canPublish: false`, so the "Enable microphone" button in the invite banner
 * asked for something the SFU had already been told to refuse. That is the
 * second source of `insufficient permissions to publish`, and unlike the first
 * it is not a UI mistake: the promotion genuinely never reached LiveKit.
 *
 * `updateParticipant` is the only way to move that grant without a reconnect.
 * The client is notified through `ParticipantPermissionsChanged`, which
 * `useLocalParticipant` already observes, so the controls appear on their own.
 *
 * Built per call rather than at module scope: the constructor reads the
 * credentials, and holding one for the process would outlive a key rotation.
 */
function roomService(): RoomServiceClient {
  // RoomServiceClient speaks HTTP; LIVEKIT_URL is the websocket endpoint. Same
  // host, different scheme.
  const httpUrl = LIVEKIT_URL.replace(/^wss:/i, "https:").replace(/^ws:/i, "http:");
  return new RoomServiceClient(httpUrl, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);
}

/**
 * Push a role's publishing rights to a connected participant.
 *
 * `permission` replaces rather than merges on LiveKit's side, so every field
 * this product relies on has to be restated — dropping `canPublishData` here
 * would silently mute the promoted member's chat, hand and poll votes, which
 * all ride the data channel.
 *
 * Absence is not an error. `updateParticipant` 404s for someone who has left
 * or has not connected yet, and both are ordinary: their next token is minted
 * from the row this function's caller already wrote.
 */
async function syncRoomPermissions(
  roomName: string,
  identity: string,
  role: ParticipationRole
): Promise<void> {
  if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) return;

  try {
    await roomService().updateParticipant(roomName, identity, {
      permission: {
        canSubscribe: true,
        canPublish: canPublishTracks(role),
        canPublishData: AUDIENCE_PUBLISHES_DATA,
      },
    });
  } catch (error) {
    console.warn("[livekit] could not push permissions to a live participant", {
      roomName,
      role,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export interface SessionAccess {
  token: string;
  wsUrl: string;
  roomName: string;
  identity: string;
  role: ParticipationRole;
  expiresAt: Date;
}

/**
 * Resolve the caller's role from persisted state only.
 *
 * Precedence: the session's host is always `host`; otherwise an existing
 * participation row decides; otherwise `listener`. Nothing here reads input.
 */
async function resolveRole(sessionId: string, userId: string, mentorId: string) {
  if (mentorId === userId) return ParticipationRole.host;

  const participation = await prisma.sessionParticipation.findUnique({
    where: { sessionId_userId: { sessionId, userId } },
    select: { role: true },
  });

  return participation?.role ?? ParticipationRole.listener;
}

/**
 * Join a session and receive a LiveKit token scoped to it.
 *
 * Replaces both former token paths and `POST /api/livekit/token`.
 */
export const joinSession = defineAction(
  {
    name: "joinSession",
    auth: "member",
    args: [sessionIdSchema],
    community: ([sessionId]) => communityOfSession(sessionId),
    rateLimit: "create",
  },
  async (ctx, sessionId) => {
    if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
      return { success: false as const, error: "Video is not configured." };
    }

    const session = await prisma.mentorSession.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        title: true,
        mentorId: true,
        status: true,
        videoRoomName: true,
        roomId: true,
      },
    });

    if (!session) {
      return { success: false as const, error: "Session not found." };
    }
    if (session.status === "COMPLETED" || session.status === "CANCELLED") {
      return { success: false as const, error: "This session has ended." };
    }

    // The room name is derived from the session, never accepted from the client.
    const roomName = session.videoRoomName || session.roomId || `session-${session.id}`;
    if (!session.videoRoomName) {
      await prisma.mentorSession.update({
        where: { id: sessionId },
        data: { videoRoomName: roomName },
      });
    }

    const role = await resolveRole(sessionId, ctx.userId, session.mentorId);

    // A stable identity per (session, user). The previous implementations
    // appended Date.now(), which produced a new identity on every join and made
    // attendance impossible to deduplicate.
    const identity = `${sessionId}:${ctx.userId}`;

    await prisma.sessionParticipation.upsert({
      where: { sessionId_userId: { sessionId, userId: ctx.userId } },
      create: {
        sessionId,
        userId: ctx.userId,
        role,
        joinedAt: new Date(),
        livekitIdentity: identity,
      },
      update: { joinedAt: new Date(), leftAt: null, livekitIdentity: identity },
    });

    // attendeeCount is derived from distinct participation rows rather than
    // incremented per token request. The old API route incremented on every
    // call, so a page refresh inflated the host's attendance metric without
    // bound (C3).
    const attendeeCount = await prisma.sessionParticipation.count({ where: { sessionId } });
    await prisma.mentorSession.update({
      where: { id: sessionId },
      data: { attendeeCount },
    });

    // One rule, shared with the browser. `lib/livekit/permissions.ts` explains
    // why the client needs to be able to ask the same question.
    const canPublish = canPublishTracks(role);

    // LiveKit populates `Participant.name` from the token's `name` claim and
    // from nothing else. This token only ever carried `identity`, so every
    // participant arrived nameless and the room rendered the "unknown" fallback
    // for all of them — the label read as a bug because it was one, on our side
    // of the connection. `identity` cannot double as the name: it is
    // `${sessionId}:${userId}`, deliberately opaque and stable for attendance
    // dedup.
    const profile = await prisma.user.findUnique({
      where: { id: ctx.userId },
      select: { name: true, firstName: true, lastName: true, username: true },
    });
    const displayName =
      profile?.name?.trim() ||
      [profile?.firstName, profile?.lastName].filter(Boolean).join(" ").trim() ||
      profile?.username?.trim() ||
      "";

    const token = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
      identity,
      // Empty is omitted rather than sent: an empty name would overwrite
      // nothing but reads as "we set it", and the client fallback is the place
      // that decides what a nameless participant is called.
      ...(displayName ? { name: displayName } : {}),
      ttl: TOKEN_TTL_SECONDS,
    });
    token.metadata = JSON.stringify({
      userId: ctx.userId,
      sessionId,
      role,
      communityId: ctx.communityId,
    });
    token.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish,
      canSubscribe: true,
      // Everyone, audience included. Chat, hands, poll votes, reactions and the
      // late joiner's whiteboard request are all data. See the constant.
      canPublishData: AUDIENCE_PUBLISHES_DATA,
    });

    const access: SessionAccess = {
      token: await token.toJwt(),
      wsUrl: LIVEKIT_URL,
      roomName,
      identity,
      role,
      expiresAt: new Date(Date.now() + TOKEN_TTL_SECONDS * 1000),
    };

    return { success: true as const, access, session: { id: session.id, title: session.title } };
  }
);

export const leaveSession = defineAction(
  {
    name: "leaveSession",
    auth: "member",
    args: [sessionIdSchema],
    community: ([sessionId]) => communityOfSession(sessionId),
  },
  async (ctx, sessionId) => {
    const participation = await prisma.sessionParticipation.findUnique({
      where: { sessionId_userId: { sessionId, userId: ctx.userId } },
    });
    if (!participation) {
      return { success: false as const, error: "Not in session" };
    }

    // A stretch is closed once. `participant_left` accumulates the same span
    // from the other side, and both firing would count the time twice — which
    // matters now that these seconds feed the usage counter. `leftAt` is the
    // flag: non-null means the stretch is already accounted for, and only
    // `joinSession` clears it.
    if (participation.leftAt) {
      return { success: true as const };
    }

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

    return { success: true as const };
  }
);

/**
 * Promote or demote a participant. Host or community admin only — and the
 * target user id is a genuine parameter here (it identifies *someone else*),
 * unlike the caller-identity parameters removed under SEC-05.
 */
export const updateParticipantRole = defineAction(
  {
    name: "updateParticipantRole",
    auth: "member",
    args: [sessionIdSchema, z.string().min(1).max(64), z.nativeEnum(ParticipationRole)],
    community: ([sessionId]) => communityOfSession(sessionId),
  },
  async (ctx, sessionId, targetUserId, newRole) => {
    await assertSessionHost(ctx, sessionId);

    const participation = await prisma.sessionParticipation.update({
      where: { sessionId_userId: { sessionId, userId: targetUserId } },
      data: { role: newRole, wasInvited: newRole === ParticipationRole.speaker },
      select: { livekitIdentity: true },
    });

    // The row is only half of it: a participant who is connected right now
    // carries the old grant until this lands.
    await pushRoleToLiveRoom(sessionId, participation.livekitIdentity, newRole);

    return { success: true as const };
  }
);

/**
 * Resolve the room and hand the new role to LiveKit.
 *
 * Split out because both role-changing actions need it and neither should own
 * the room lookup.
 */
async function pushRoleToLiveRoom(
  sessionId: string,
  identity: string | null,
  role: ParticipationRole
): Promise<void> {
  if (!identity) return;

  const session = await prisma.mentorSession.findUnique({
    where: { id: sessionId },
    select: { videoRoomName: true, roomId: true, id: true },
  });
  if (!session) return;

  const roomName = session.videoRoomName || session.roomId || `session-${session.id}`;
  await syncRoomPermissions(roomName, identity, role);
}

/**
 * Give a member the floor.
 *
 * The host's "invite to speak" control used to publish a data-channel event and
 * nothing more. The member saw a banner offering a microphone, pressed it, and
 * got `insufficient permissions to publish` — the invitation was a UI state,
 * never a grant. This is the grant.
 *
 * It takes the LiveKit identity because that is what the room UI holds: the
 * raised-hand queue is built from data-channel events, which carry identities.
 * The identity is opaque on purpose and is looked up in the
 * `livekitIdentity` column rather than parsed — its shape has changed once
 * already, and the code that split it on `-` is what kept the usage webhook
 * from ever recording a second.
 */
export const inviteToSpeak = defineAction(
  {
    name: "inviteToSpeak",
    auth: "member",
    args: [sessionIdSchema, identitySchema],
    community: ([sessionId]) => communityOfSession(sessionId),
    rateLimit: "message",
  },
  async (ctx, sessionId, identity) => {
    await assertSessionHost(ctx, sessionId);

    const participation = await prisma.sessionParticipation.findFirst({
      where: { sessionId, livekitIdentity: identity },
      select: { id: true },
    });
    if (!participation) {
      return { success: false as const, error: "That participant is not in this session." };
    }

    await prisma.sessionParticipation.update({
      where: { id: participation.id },
      data: { role: ParticipationRole.speaker, wasInvited: true },
    });

    // Awaited before the caller announces the invitation, so the permission is
    // already on its way when the banner appears. The two travel on different
    // paths and cannot be ordered end to end, which is why the banner's button
    // waits on the permission rather than assuming it.
    await pushRoleToLiveRoom(sessionId, identity, ParticipationRole.speaker);

    return { success: true as const };
  }
);

export const trackEngagement = defineAction(
  {
    name: "trackEngagement",
    auth: "member",
    args: [sessionIdSchema, z.enum(["message", "reaction", "hand_raised"])],
    community: ([sessionId]) => communityOfSession(sessionId),
    rateLimit: "message",
  },
  async (ctx, sessionId, eventType) => {
    const participation = await prisma.sessionParticipation.findUnique({
      where: { sessionId_userId: { sessionId, userId: ctx.userId } },
      select: { id: true },
    });
    if (!participation) {
      return { success: false as const, error: "Not in session" };
    }

    const updateData: Prisma.SessionParticipationUpdateInput = {};
    switch (eventType) {
      case "message":
        updateData.messagesCount = { increment: 1 };
        break;
      case "reaction":
        updateData.reactionsCount = { increment: 1 };
        break;
      case "hand_raised":
        updateData.handRaisedCount = { increment: 1 };
        break;
    }

    await prisma.sessionParticipation.update({
      where: { id: participation.id },
      data: updateData,
    });

    return { success: true as const };
  }
);

export const getSessionParticipants = defineAction(
  {
    name: "getSessionParticipants",
    auth: "member",
    args: [sessionIdSchema],
    community: ([sessionId]) => communityOfSession(sessionId),
  },
  async (_ctx, sessionId) => {
    const participants = await prisma.sessionParticipation.findMany({
      where: { sessionId },
      include: { user: { select: { id: true, name: true, image: true } } },
      orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
      take: 500,
    });

    return {
      success: true as const,
      participants: participants.map((p) => ({
        id: p.id,
        userId: p.user.id,
        // Null rather than a literal: the surface that renders it owns the
        // wording, and it has to be localized.
        name: p.user.name,
        image: p.user.image,
        role: p.role,
        joinedAt: p.joinedAt,
        durationSeconds: p.durationSeconds || 0,
        messagesCount: p.messagesCount,
        reactionsCount: p.reactionsCount,
        handRaisedCount: p.handRaisedCount,
        wasInvited: p.wasInvited,
      })),
    };
  }
);

/**
 * Whether video is configured, for the UI to render a useful message.
 * Public: it exposes only the public websocket URL and a boolean, both of which
 * ship to the browser anyway as NEXT_PUBLIC_LIVEKIT_URL.
 */
export const getLiveKitConnectionInfo = defineAction(
  { name: "getLiveKitConnectionInfo", auth: "public", args: [] },
  async () => ({
    url: LIVEKIT_URL,
    configured: Boolean(LIVEKIT_API_KEY && LIVEKIT_API_SECRET),
  })
);
