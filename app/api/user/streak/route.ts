import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getStreakInfo, getActivityHistory } from "@/lib/streaks";
import { getPointsToNextLevel } from "@/app/actions/gamification";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    const [streakInfo, activityHistory, levelProgress] = await Promise.all([
      getStreakInfo(userId),
      getActivityHistory(userId, 90),
      getPointsToNextLevel(userId),
    ]);

    return NextResponse.json({
      streak: streakInfo,
      activity: activityHistory,
      levelProgress,
    });
  } catch (error) {
    console.error("[/api/user/streak] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
