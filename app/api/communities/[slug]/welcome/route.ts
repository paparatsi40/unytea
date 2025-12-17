import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * PUT /api/communities/[slug]/welcome
 * Update community welcome message (owner only)
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await auth();
    const { slug } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { welcomeMessage, showWelcomeMessage } = body;

    // Get community
    const community = await prisma.community.findUnique({
      where: { slug },
      select: { id: true, ownerId: true },
    });

    if (!community) {
      return NextResponse.json({ error: "Community not found" }, { status: 404 });
    }

    // Check if user is owner
    if (community.ownerId !== session.user.id) {
      return NextResponse.json(
        { error: "Only community owners can update the welcome message" },
        { status: 403 }
      );
    }

    // Update welcome message
    await prisma.community.update({
      where: { id: community.id },
      data: {
        welcomeMessage,
        showWelcomeMessage,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Welcome message updated successfully",
    });
  } catch (error) {
    console.error("Error updating welcome message:", error);
    return NextResponse.json(
      { error: "Failed to update welcome message" },
      { status: 500 }
    );
  }
}