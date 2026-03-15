"use server";

import { AccessToken } from "livekit-server-sdk";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth-utils";
import { ParticipationRole } from "@prisma/client";

// LiveKit configuration
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || "";
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || "";
const LIVEKIT_URL = process.env.LIVEKIT_URL || "wss://unytea-livekit.livekit.cloud";

if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
  console.warn("LiveKit credentials not configured. Token generation will fail.");
}

export interface TokenPayload {
  token: string;
  identity: string;
  roomName: string;
  role: ParticipationRole;
  expiresAt: Date;
}

export interface TokenOptions {
  sessionId: string;
  roomName?: string;
  role?: ParticipationRole;
  canPublish?: boolean;
  canSubscribe?: boolean;
}

/**
 * Generate a LiveKit access token for joining a session
 */
export async function generateLiveKitToken(
  options: TokenOptions
): Promise<{ success: boolean; data?: TokenPayload; error?: string }> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, error: "Authentication required" };
    }

    // Validate LiveKit credentials
    if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
      return { success: false, error: "LiveKit not configured" };
    }

    // Get session details
    const session = await prisma.mentorSession.findUnique({
      where: { id: options.sessionId },
      include: {
        mentor: { select: { id: true, name: true } },
        community: { select: { id: true, name: true } },
      },
    });

    if (!session) {
      return { success: false, error: "Session not found" };
    }

    // Determine role
    let role = options.role || ParticipationRole.listener;
    
    // Host is the mentor
    if (session.mentorId === userId) {
      role = ParticipationRole.host;
    }

    // Check if user is already a participant with a role
    const existingParticipation = await prisma.sessionParticipation.findUnique({
      where: {
        sessionId_userId: {
          sessionId: options.sessionId,
          userId,
        },
      },
    });

    if (existingParticipation) {
      role = existingParticipation.role;
    }

    // Generate unique identity
    const identity = `${userId}-${Date.now()}`;
    
    // Use session ID as room name (consistency with our domain)
    const roomName = options.roomName || session.videoRoomName || `session-${session.id}`;

    // Determine permissions based on role
    const canPublish = role === ParticipationRole.host || role === ParticipationRole.speaker;
    const canSubscribe = true; // Everyone can subscribe (listen/view)
    const canPublishData = true; // Everyone can send data (chat, reactions)

    // Create token
    const token = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
      identity,
    });

    // Add metadata
    token.metadata = JSON.stringify({
      userId,
      sessionId: options.sessionId,
      role,
      communityId: session.communityId,
    });

    // Grant video room access
    token.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish,
      canSubscribe,
      canPublishData,
    });

    // Token expires in 24 hours
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Generate JWT string
    const jwt = await token.toJwt();

    return {
      success: true,
      data: {
        token: jwt,
        identity,
        roomName,
        role,
        expiresAt,
      },
    };
  } catch (error) {
    console.error("Failed to generate LiveKit token:", error);
    return { success: false, error: "Token generation failed" };
  }
}

/**
 * Join a session - creates participation record and returns token
 */
export async function joinSession(
  sessionId: string
): Promise<{ 
  success: boolean; 
  token?: TokenPayload; 
  error?: string;
  session?: {
    id: string;
    title: string;
    roomName: string;
    role: ParticipationRole;
  };
}> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, error: "Authentication required" };
    }

    // Get session
    const session = await prisma.mentorSession.findUnique({
      where: { id: sessionId },
      include: {
        mentor: { select: { id: true, name: true } },
      },
    });

    if (!session) {
      return { success: false, error: "Session not found" };
    }

    // Check session status
    if (session.status === "COMPLETED" || session.status === "CANCELLED") {
      return { success: false, error: "Session has ended" };
    }

    // Determine role
    let role: ParticipationRole = ParticipationRole.listener;
    if (session.mentorId === userId) {
      role = ParticipationRole.host;
    }

    // Ensure room name exists
    const roomName = session.videoRoomName || `session-${session.id}`;
    if (!session.videoRoomName) {
      await prisma.mentorSession.update({
        where: { id: sessionId },
        data: { videoRoomName: roomName },
      });
    }

    // Create or update participation record
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
        role,
        joinedAt: new Date(),
        livekitIdentity: `${userId}-${Date.now()}`,
      },
      update: {
        // If rejoining, don't change role but update joinedAt
        joinedAt: new Date(),
        leftAt: null,
      },
    });

    // Generate token
    const tokenResult = await generateLiveKitToken({
      sessionId,
      roomName,
      role,
    });

    if (!tokenResult.success || !tokenResult.data) {
      return { success: false, error: tokenResult.error || "Token generation failed" };
    }

    return {
      success: true,
      token: tokenResult.data,
      session: {
        id: session.id,
        title: session.title,
        roomName,
        role,
      },
    };
  } catch (error) {
    console.error("Failed to join session:", error);
    return { success: false, error: "Failed to join session" };
  }
}

/**
 * Leave a session - updates participation record
 */
export async function leaveSession(
  sessionId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, error: "Authentication required" };
    }

    // Find participation record
    const participation = await prisma.sessionParticipation.findUnique({
      where: {
        sessionId_userId: {
          sessionId,
          userId,
        },
      },
    });

    if (!participation) {
      return { success: false, error: "Not in session" };
    }

    // Calculate duration
    const leftAt = new Date();
    const joinedAt = participation.joinedAt;
    const durationSeconds = Math.floor((leftAt.getTime() - joinedAt.getTime()) / 1000);

    // Update participation
    await prisma.sessionParticipation.update({
      where: { id: participation.id },
      data: {
        leftAt,
        durationSeconds: (participation.durationSeconds || 0) + durationSeconds,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to leave session:", error);
    return { success: false, error: "Failed to leave session" };
  }
}

/**
 * Update participant role (host only)
 */
export async function updateParticipantRole(
  sessionId: string,
  userId: string,
  newRole: ParticipationRole
): Promise<{ success: boolean; error?: string }> {
  try {
    const currentUserId = await getCurrentUserId();
    if (!currentUserId) {
      return { success: false, error: "Authentication required" };
    }

    // Verify host
    const session = await prisma.mentorSession.findUnique({
      where: { id: sessionId },
      select: { mentorId: true },
    });

    if (!session || session.mentorId !== currentUserId) {
      return { success: false, error: "Only host can change roles" };
    }

    // Update participation
    await prisma.sessionParticipation.update({
      where: {
        sessionId_userId: {
          sessionId,
          userId,
        },
      },
      data: {
        role: newRole,
        wasInvited: newRole === ParticipationRole.speaker,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to update role:", error);
    return { success: false, error: "Failed to update role" };
  }
}

/**
 * Track engagement events (messages, reactions, hand raises)
 */
export async function trackEngagement(
  sessionId: string,
  eventType: "message" | "reaction" | "hand_raised"
): Promise<{ success: boolean; error?: string }> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, error: "Authentication required" };
    }

    const participation = await prisma.sessionParticipation.findUnique({
      where: {
        sessionId_userId: {
          sessionId,
          userId,
        },
      },
    });

    if (!participation) {
      return { success: false, error: "Not in session" };
    }

    // Update counters based on event type
    const updateData: Record<string, any> = {};
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

    return { success: true };
  } catch (error) {
    console.error("Failed to track engagement:", error);
    return { success: false, error: "Failed to track engagement" };
  }
}

/**
 * Get session participants with engagement stats
 */
export async function getSessionParticipants(
  sessionId: string
): Promise<{
  success: boolean;
  participants?: Array<{
    id: string;
    userId: string;
    name: string;
    image: string | null;
    role: ParticipationRole;
    joinedAt: Date;
    durationSeconds: number;
    messagesCount: number;
    reactionsCount: number;
    handRaisedCount: number;
    wasInvited: boolean;
  }>;
  error?: string;
}> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, error: "Authentication required" };
    }

    const participants = await prisma.sessionParticipation.findMany({
      where: { sessionId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
      orderBy: [
        { role: "asc" }, // Host first, then speakers, then listeners
        { joinedAt: "asc" },
      ],
    });

    return {
      success: true,
      participants: participants.map((p) => ({
        id: p.id,
        userId: p.user.id,
        name: p.user.name || "Unknown",
        image: p.user.image,
        role: p.role,
        joinedAt: p.joinedAt,
        durationSeconds: p.durationSeconds,
        messagesCount: p.messagesCount,
        reactionsCount: p.reactionsCount,
        handRaisedCount: p.handRaisedCount,
        wasInvited: p.wasInvited,
      })),
    };
  } catch (error) {
    console.error("Failed to get participants:", error);
    return { success: false, error: "Failed to get participants" };
  }
}

/**
 * Get LiveKit connection info for frontend
 */
export async function getLiveKitConnectionInfo(): Promise<{
  url: string;
  configured: boolean;
}> {
  return {
    url: LIVEKIT_URL,
    configured: !!LIVEKIT_API_KEY && !!LIVEKIT_API_SECRET,
  };
}
