import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const communities = await prisma.community.findMany({
      where: {
        ownerId: userId,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        imageUrl: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ communities });
  } catch (error) {
    console.error("Error fetching communities:", error);
    return NextResponse.json(
      { error: "Failed to fetch communities" },
      { status: 500 }
    );
  }
}