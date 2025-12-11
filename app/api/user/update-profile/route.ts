import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, bio, tagline, website, location, timezone } = await request.json();

    // Update user profile
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name,
        bio,
        tagline,
        website,
        location,
        timezone,
      },
      select: {
        id: true,
        name: true,
        email: true,
        bio: true,
        tagline: true,
        website: true,
        location: true,
        timezone: true,
        image: true,
      },
    });

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error("Error updating profile:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}
