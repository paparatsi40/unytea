import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug } = params;
    const body = await request.json();

    // Get community and check ownership
    const community = await prisma.community.findUnique({
      where: { slug },
      select: { id: true, ownerId: true },
    });

    if (!community) {
      return NextResponse.json({ error: "Community not found" }, { status: 404 });
    }

    if (community.ownerId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Update landing layout
    const updated = await prisma.community.update({
      where: { id: community.id },
      data: {
        landingLayout: body.landingLayout || null,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      landingLayout: updated.landingLayout,
    });
  } catch (error) {
    console.error("Error updating landing page:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
