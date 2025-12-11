import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { imageUrl } = await req.json();

    // Update user's image
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        image: imageUrl,
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
      },
    });

    return NextResponse.json({
      success: true,
      user: updatedUser,
    });
  } catch (error) {
    console.error("Update avatar error:", error);
    return NextResponse.json(
      { error: "Failed to update avatar" },
      { status: 500 }
    );
  }
}
