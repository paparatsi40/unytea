import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/communities/[slug]/welcome/dismiss
 * Mark welcome message as seen for the current user
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await auth();
    const { slug } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get community
    const community = await prisma.community.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!community) {
      return NextResponse.json({ error: "Community not found" }, { status: 404 });
    }

    // Update member to mark welcome message as seen
    await prisma.member.updateMany({
      where: {
        communityId: community.id,
        userId: session.user.id,
      },
      data: {
        welcomeMessageSeen: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Welcome message marked as seen",
    });
  } catch (error) {
    console.error("Error dismissing welcome message:", error);
    return NextResponse.json(
      { error: "Failed to dismiss welcome message" },
      { status: 500 }
    );
  }
}