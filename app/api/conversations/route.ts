import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { otherUserId } = await req.json();

    if (!otherUserId) {
      return NextResponse.json(
        { error: "Other user ID is required" },
        { status: 400 }
      );
    }

    // Don't allow conversation with self
    if (otherUserId === session.user.id) {
      return NextResponse.json(
        { error: "Cannot create conversation with yourself" },
        { status: 400 }
      );
    }

    // Check if conversation already exists
    const existingConversation = await prisma.conversation.findFirst({
      where: {
        OR: [
          {
            participant1Id: session.user.id,
            participant2Id: otherUserId,
          },
          {
            participant1Id: otherUserId,
            participant2Id: session.user.id,
          },
        ],
      },
    });

    if (existingConversation) {
      return NextResponse.json({
        conversationId: existingConversation.id,
        isNew: false,
      });
    }

    // Create new conversation
    const newConversation = await prisma.conversation.create({
      data: {
        participant1Id: session.user.id,
        participant2Id: otherUserId,
      },
    });

    return NextResponse.json({
      conversationId: newConversation.id,
      isNew: true,
    });
  } catch (error) {
    console.error("Create conversation error:", error);
    return NextResponse.json(
      { error: "Failed to create conversation" },
      { status: 500 }
    );
  }
}
