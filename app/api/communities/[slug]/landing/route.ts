import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth-utils";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const community = await prisma.community.findUnique({
      where: { slug: params.slug },
      select: {
        id: true,
        slug: true,
        name: true,
        landingLayout: true,
      },
    });

    if (!community) {
      return NextResponse.json({ error: "Community not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      community,
      landingLayout: Array.isArray(community.landingLayout)
        ? community.landingLayout
        : [],
    });
  } catch (error) {
    console.error("Error fetching community landing layout:", error);
    return NextResponse.json(
      { error: "Failed to fetch landing layout" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const landingLayout = body?.landingLayout;

    if (!Array.isArray(landingLayout)) {
      return NextResponse.json(
        { error: "landingLayout must be an array" },
        { status: 400 }
      );
    }

    const community = await prisma.community.findUnique({
      where: { slug: params.slug },
      select: { id: true, ownerId: true },
    });

    if (!community) {
      return NextResponse.json({ error: "Community not found" }, { status: 404 });
    }

    const membership = await prisma.member.findUnique({
      where: {
        userId_communityId: {
          userId,
          communityId: community.id,
        },
      },
      select: { role: true, status: true },
    });

    const canEdit =
      community.ownerId === userId ||
      (membership?.status === "ACTIVE" &&
        ["OWNER", "ADMIN", "MODERATOR"].includes(membership.role));

    if (!canEdit) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updated = await prisma.community.update({
      where: { id: community.id },
      data: {
        landingLayout,
      },
      select: {
        id: true,
        slug: true,
        landingLayout: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ success: true, community: updated });
  } catch (error) {
    console.error("Error saving community landing layout:", error);
    return NextResponse.json(
      { error: "Failed to save landing layout" },
      { status: 500 }
    );
  }
}
