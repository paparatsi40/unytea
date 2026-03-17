import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get user points and level
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        points: true,
        level: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Count user achievements
    const achievementsCount = await prisma.userAchievement.count({
      where: { userId: session.user.id },
    });

    // Calculate XP needed for next level (simple formula: level * 100)
    const nextLevelPoints = user.level * 100;

    return NextResponse.json({
      level: user.level,
      points: user.points,
      nextLevelPoints,
      achievements: achievementsCount,
    });
  } catch (error) {
    console.error("Error fetching gamification stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
