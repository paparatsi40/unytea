import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET: Load whiteboard state
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

    // Get whiteboard data from database
    const whiteboardData = await prisma.mentorSession.findUnique({
      where: { id: sessionId },
      select: { whiteboardData: true },
    });

    if (!whiteboardData) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Parse JSON data if it exists
    const data = whiteboardData.whiteboardData
      ? JSON.parse(whiteboardData.whiteboardData as string)
      : { elements: [], appState: {} };

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error loading whiteboard:", error);
    return NextResponse.json(
      { error: "Failed to load whiteboard" },
      { status: 500 }
    );
  }
}

// POST: Save whiteboard state
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { sessionId } = await params;
    const data = await request.json();

    // Check if user is the mentor (only mentor can save whiteboard)
    const mentorSession = await prisma.mentorSession.findUnique({
      where: { id: sessionId },
      select: { mentorId: true },
    });

    if (!mentorSession) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (mentorSession.mentorId !== session.user.id) {
      return NextResponse.json(
        { error: "Only the session mentor can modify the whiteboard" },
        { status: 403 }
      );
    }

    // Save whiteboard data
    await prisma.mentorSession.update({
      where: { id: sessionId },
      data: {
        whiteboardData: JSON.stringify(data),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving whiteboard:", error);
    return NextResponse.json(
      { error: "Failed to save whiteboard" },
      { status: 500 }
    );
  }
}
