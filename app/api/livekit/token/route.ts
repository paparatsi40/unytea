import { NextRequest, NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);

    if (!body) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const roomName =
      typeof body.roomName === "string" ? body.roomName.trim() : "";
    const participantName =
      typeof body.participantName === "string" ? body.participantName.trim() : "";

    if (!roomName) {
      return NextResponse.json({ error: "Missing roomName" }, { status: 400 });
    }

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const wsUrl =
      process.env.LIVEKIT_URL?.trim() ||
      process.env.NEXT_PUBLIC_LIVEKIT_URL?.trim() ||
      "";

    if (!apiKey || !apiSecret || !wsUrl) {
      console.error("LiveKit config missing", {
        hasApiKey: Boolean(apiKey),
        hasApiSecret: Boolean(apiSecret),
        hasWsUrl: Boolean(wsUrl),
      });

      return NextResponse.json(
        { error: "Video call service not configured" },
        { status: 500 }
      );
    }

    const identity = session.user.id;
    const name =
      participantName ||
      session.user.name ||
      session.user.email ||
      "Participant";

    const token = new AccessToken(apiKey, apiSecret, {
      identity,
      name,
      ttl: "2h",
    });

    token.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    const jwt = await token.toJwt();

    // Register participation for session tracking
    const sessionRecord = await prisma.mentorSession.findFirst({
      where: { OR: [{ videoRoomName: roomName }, { roomId: roomName }] },
    });
    if (sessionRecord) {
      await prisma.sessionParticipation.upsert({
        where: { sessionId_userId: { sessionId: sessionRecord.id, userId: identity } },
        create: { sessionId: sessionRecord.id, userId: identity, role: sessionRecord.mentorId === identity ? "host" : "listener", joinedAt: new Date(), livekitIdentity: identity },
        update: { joinedAt: new Date(), leftAt: null },
      });
      await prisma.mentorSession.update({
        where: { id: sessionRecord.id },
        data: { attendeeCount: { increment: 1 } },
      });
    }

    return NextResponse.json({
      token: jwt,
      wsUrl,
      roomName,
      identity,
      participantName: name,
    });
  } catch (error) {
    console.error("Error generating LiveKit token:", error);

    return NextResponse.json(
      { error: "Failed to generate token" },
      { status: 500 }
    );
  }
}
