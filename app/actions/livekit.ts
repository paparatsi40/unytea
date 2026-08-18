"use server";

import { z } from "zod";
import { AccessToken } from "livekit-server-sdk";
import { ParticipationRole, Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { defineAction } from "@/lib/actions/define-action";
import { assertSessionHost } from "@/lib/actions/guards";
import { communityOfSession } from "@/lib/actions/resolvers";

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

    const canPublish = role === ParticipationRole.host || role === ParticipationRole.speaker;

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
      canPublishData: true,
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

    await prisma.sessionParticipation.update({
      where: { sessionId_userId: { sessionId, userId: targetUserId } },
      data: { role: newRole, wasInvited: newRole === ParticipationRole.speaker },
    });

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
