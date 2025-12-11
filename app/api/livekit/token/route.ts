import { NextRequest, NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const roomName = searchParams.get("room");

    if (!roomName) {
      return NextResponse.json(
        { error: "Missing room parameter" },
        { status: 400 }
      );
    }

    // Verify environment variables
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const wsUrl = process.env.LIVEKIT_URL;

    if (!apiKey || !apiSecret || !wsUrl) {
      console.error("LiveKit credentials not configured");
      return NextResponse.json(
        { error: "Video call service not configured" },
        { status: 500 }
      );
    }

    // Use user's name or fallback to username/id
    const participantName = session.user.name || session.user.username || `User ${session.user.id.slice(0, 6)}`;
    const participantIdentity = `${session.user.id}-${Date.now()}`;

    // Create access token
    const at = new AccessToken(apiKey, apiSecret, {
      identity: participantIdentity,
      name: participantName,
      ttl: "2h",
    });

    // Grant permissions
    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    const token = await at.toJwt();

    return NextResponse.json({
      token,
      wsUrl,
      roomName,
    });
  } catch (error) {
    console.error("Error generating LiveKit token:", error);
    return NextResponse.json(
      { error: "Failed to generate token" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { roomName, participantName, identity } = await request.json();

    if (!roomName || !participantName) {
      return NextResponse.json(
        { error: "Missing roomName or participantName" },
        { status: 400 }
      );
    }

    // Verify environment variables
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const wsUrl = process.env.LIVEKIT_URL;

    if (!apiKey || !apiSecret || !wsUrl) {
      console.error("LiveKit credentials not configured", {
        hasApiKey: !!apiKey,
        hasApiSecret: !!apiSecret,
        hasWsUrl: !!wsUrl,
        wsUrl: wsUrl || "not set",
      });
      return NextResponse.json(
        { error: "Video call service not configured" },
        { status: 500 }
      );
    }

    // Use custom identity if provided (for testing), otherwise use session.user.id
    // This allows multiple tabs/windows from same user to connect simultaneously
    const participantIdentity = identity || `${session.user.id}-${Date.now()}`;

    // Create access token
    const at = new AccessToken(apiKey, apiSecret, {
      identity: participantIdentity,
      name: participantName,
      ttl: "2h", // Token expires in 2 hours
    });

    // Grant permissions
    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    const token = await at.toJwt();

    return NextResponse.json({
      token,
      wsUrl,
      roomName,
    });
  } catch (error) {
    console.error("Error generating LiveKit token:", error);
    return NextResponse.json(
      { error: "Failed to generate token" },
      { status: 500 }
    );
  }
}