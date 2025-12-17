import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { sessionId } = await params;

    // Get session with mentor and mentee details
    const mentorSession = await prisma.mentorSession.findUnique({
      where: { id: sessionId },
      include: {
        mentor: {
          select: {
            id: true,
            name: true,
            image: true,
            email: true,
          },
        },
        mentee: {
          select: {
            id: true,
            name: true,
            image: true,
            email: true,
          },
        },
      },
    });

    if (!mentorSession) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    // Verify user is mentor or mentee
    const isParticipant =
      session.user.id === mentorSession.mentorId ||
      session.user.id === mentorSession.menteeId;

    if (!isParticipant) {
      return NextResponse.json(
        { error: "You are not authorized to view this session" },
        { status: 403 }
      );
    }

    // Ensure videoRoomName exists
    let videoRoomName = mentorSession.videoRoomName;
    if (!videoRoomName) {
      videoRoomName = `session-${mentorSession.id}`;
      
      // Update session with videoRoomName
      await prisma.mentorSession.update({
        where: { id: mentorSession.id },
        data: { videoRoomName },
      });
    }

    return NextResponse.json({
      session: {
        ...mentorSession,
        videoRoomName,
      },
      currentUserId: session.user.id,
    });
  } catch (error) {
    console.error("Error fetching session:", error);
    return NextResponse.json(
      { error: "Failed to fetch session" },
      { status: 500 }
    );
  }
}
