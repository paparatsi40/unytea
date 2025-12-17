import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug } = await params;

    // Get community by slug
    const community = await prisma.community.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        isPrivate: true,
        requireApproval: true,
        isPaid: true,
        membershipPrice: true,
      },
    });

    if (!community) {
      return NextResponse.json({ error: "Community not found" }, { status: 404 });
    }

    // Check if already a member
    const existingMembership = await prisma.member.findFirst({
      where: {
        communityId: community.id,
        userId: session.user.id,
      },
    });

    if (existingMembership) {
      return NextResponse.json(
        { error: "Already a member of this community" },
        { status: 400 }
      );
    }

    // Handle private communities
    if (community.isPrivate) {
      return NextResponse.json(
        { error: "This is a private community. You need an invitation to join." },
        { status: 403 }
      );
    }

    // Handle paid communities
    if (community.isPaid && community.membershipPrice) {
      return NextResponse.json(
        {
          error: "This is a paid community. Payment required.",
          requiresPayment: true,
          price: community.membershipPrice,
        },
        { status: 402 }
      );
    }

    // Handle communities requiring approval
    if (community.requireApproval) {
      // Create membership with PENDING status
      const membership = await prisma.member.create({
        data: {
          userId: session.user.id,
          communityId: community.id,
          role: "MEMBER",
          status: "PENDING", // Wait for owner approval
        },
      });

      // TODO: Send notification to community owner

      return NextResponse.json({
        success: true,
        message: "Join request sent. Waiting for approval.",
        membership,
        requiresApproval: true,
      });
    }

    // Free, public, no approval required - join directly
    const membership = await prisma.member.create({
      data: {
        userId: session.user.id,
        communityId: community.id,
        role: "MEMBER",
        status: "ACTIVE",
      },
    });

    // Update member count
    await prisma.community.update({
      where: { id: community.id },
      data: {
        memberCount: {
          increment: 1,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Successfully joined community!",
      membership,
    });
  } catch (error) {
    console.error("Error joining community:", error);
    return NextResponse.json(
      { error: "Failed to join community" },
      { status: 500 }
    );
  }
}