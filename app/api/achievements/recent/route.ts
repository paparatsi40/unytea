import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Get user's recent achievements
 * GET /api/achievements/recent
 */
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Get recent user achievements
    const userAchievements = await prisma.userAchievement.findMany({
      where: {
        userId,
      },
      include: {
        achievement: {
          select: {
            id: true,
            name: true,
            description: true,
            icon: true,
          },
        },
      },
      orderBy: {
        unlockedAt: "desc",
      },
      take: 5,
    });

    const achievements = userAchievements.map((ua) => ({
      id: ua.achievement.id,
      name: ua.achievement.name,
      description: ua.achievement.description,
      icon: ua.achievement.icon || "🏆",
      unlockedAt: ua.unlockedAt?.toISOString() || new Date().toISOString(),
    }));

    return NextResponse.json({ achievements });
  } catch (error: any) {
    console.error("Error fetching achievements:", error);
    return NextResponse.json(
      { error: "Failed to fetch achievements" },
      { status: 500 }
    );
  }
}
