"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth-utils";
import { recordActivity } from "@/lib/streaks";
import { subDays } from "date-fns";

// ── Compatibility Score ──────────────────────────────────────────────
function computeCompatibility(
  userA: { skills: string[]; interests: string[]; level: number },
  userB: { skills: string[]; interests: string[]; level: number }
): number {
  let score = 0;

  // Interest overlap (0-40 pts)
  const interestOverlap = userA.interests.filter((i) =>
    userB.interests.some((j) => j.toLowerCase() === i.toLowerCase())
  ).length;
  score += Math.min(interestOverlap * 10, 40);

  // Skill complementarity (0-30 pts) — different skills = learning from each other
  const sharedSkills = userA.skills.filter((s) =>
    userB.skills.some((t) => t.toLowerCase() === s.toLowerCase())
  ).length;
  const uniqueSkills =
    userA.skills.length + userB.skills.length - sharedSkills * 2;
  score += Math.min(uniqueSkills * 5, 20) + Math.min(sharedSkills * 5, 10);

  // Level proximity (0-30 pts) — similar levels work better
  const levelDiff = Math.abs(userA.level - userB.level);
  score += Math.max(30 - levelDiff * 3, 0);

  return Math.min(score, 100);
}

// ── Smart Buddy Matching ─────────────────────────────────────────────
export async function findSmartBuddyMatch(communityId: string) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return { success: false, error: "Not authenticated" };

    // Check existing active partnership
    const existing = await prisma.buddyPartnership.findFirst({
      where: {
        communityId,
        status: "ACTIVE",
        OR: [{ user1Id: userId }, { user2Id: userId }],
      },
    });
    if (existing) return { success: false, error: "You already have an active buddy" };

    // Get current user profile
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { level: true, skills: true, interests: true },
    });
    if (!currentUser) return { success: false, error: "User not found" };

    // Get available community members
    const members = await prisma.member.findMany({
      where: {
        communityId,
        status: "ACTIVE",
        userId: { not: userId },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            image: true,
            level: true,
            skills: true,
            interests: true,
            currentStreak: true,
          },
        },
      },
    });

    // Filter out members who already have active buddies
    const available = [];
    for (const m of members) {
      const hasBuddy = await prisma.buddyPartnership.findFirst({
        where: {
          communityId,
          status: "ACTIVE",
          OR: [{ user1Id: m.userId }, { user2Id: m.userId }],
        },
      });
      if (!hasBuddy) available.push(m);
    }

    if (available.length === 0)
      return { success: false, error: "No available buddies right now" };

    // Score and rank matches
    const scored = available.map((m) => ({
      member: m,
      compatibility: computeCompatibility(
        {
          skills: currentUser.skills as string[],
          interests: currentUser.interests as string[],
          level: currentUser.level,
        },
        {
          skills: m.user.skills as string[],
          interests: m.user.interests as string[],
          level: m.user.level,
        }
      ),
    }));

    scored.sort((a, b) => b.compatibility - a.compatibility);

    // Return top 3 matches
    const topMatches = scored.slice(0, 3).map((s) => ({
      id: s.member.userId,
      name: s.member.user.name,
      username: s.member.user.username,
      image: s.member.user.image,
      level: s.member.user.level,
      streak: s.member.user.currentStreak,
      skills: (s.member.user.skills as string[]).slice(0, 4),
      interests: (s.member.user.interests as string[]).slice(0, 4),
      compatibility: s.compatibility,
      sharedInterests: (currentUser.interests as string[]).filter((i) =>
        (s.member.user.interests as string[]).some(
          (j) => j.toLowerCase() === i.toLowerCase()
        )
      ),
    }));

    return { success: true, matches: topMatches };
  } catch (error) {
    console.error("[findSmartBuddyMatch] Error:", error);
    return { success: false, error: "Failed to find matches" };
  }
}

// ── Buddy Stats ──────────────────────────────────────────────────────
export async function getBuddyStats(partnershipId: string) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return { success: false, error: "Not authenticated" };

    const partnership = await prisma.buddyPartnership.findUnique({
      where: { id: partnershipId },
      include: {
        goals: true,
        checkIns: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!partnership) return { success: false, error: "Partnership not found" };
    if (partnership.user1Id !== userId && partnership.user2Id !== userId)
      return { success: false, error: "Not your partnership" };

    const totalGoals = partnership.goals.length;
    const completedGoals = partnership.goals.filter((g: { completed: boolean }) => g.completed).length;
    const totalCheckIns = partnership.checkIns.length;

    // Check-in streak (consecutive days both checked in)
    const last7Days = subDays(new Date(), 7);
    const recentCheckIns = partnership.checkIns.filter(
      (c: { createdAt: Date }) => new Date(c.createdAt) >= last7Days
    );
    const checkInDays = new Set(
      recentCheckIns.map((c: { createdAt: Date }) =>
        new Date(c.createdAt).toISOString().slice(0, 10)
      )
    );

    // Average mood
    const avgMood =
      totalCheckIns > 0
        ? Number(
            (
              partnership.checkIns.reduce((sum: number, c: { mood: number }) => sum + c.mood, 0) /
              totalCheckIns
            ).toFixed(1)
          )
        : null;

    // Partnership age in days
    const ageInDays = Math.floor(
      (Date.now() - new Date(partnership.matchedAt).getTime()) /
        (1000 * 60 * 60 * 24)
    );

    // Accountability score (0-100)
    const goalScore = totalGoals > 0 ? (completedGoals / totalGoals) * 40 : 20;
    const checkInScore = Math.min((checkInDays.size / 7) * 40, 40);
    const consistencyScore = Math.min(ageInDays / 30, 1) * 20;
    const accountabilityScore = Math.round(
      goalScore + checkInScore + consistencyScore
    );

    return {
      success: true,
      stats: {
        totalGoals,
        completedGoals,
        totalCheckIns,
        checkInsThisWeek: checkInDays.size,
        avgMood,
        ageInDays,
        accountabilityScore,
      },
    };
  } catch (error) {
    console.error("[getBuddyStats] Error:", error);
    return { success: false, error: "Failed to get stats" };
  }
}

// ── Check-in with Streak Recording ───────────────────────────────────
export async function buddyCheckInWithStreak(
  partnershipId: string,
  mood: number,
  notes?: string,
  wins?: string[],
  _blockers?: string[]
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return { success: false, error: "Not authenticated" };

    const partnership = await prisma.buddyPartnership.findUnique({
      where: { id: partnershipId },
    });
    if (!partnership) return { success: false, error: "Partnership not found" };

    const checkIn = await prisma.buddyCheckIn.create({
      data: {
        partnershipId,
        userId,
        mood,
        notes,
        completedGoals: wins || [],
      },
    });

    // Record activity for streak
    recordActivity(userId, "session", 5).catch(console.error);

    return { success: true, checkIn };
  } catch (error) {
    console.error("[buddyCheckInWithStreak] Error:", error);
    return { success: false, error: "Failed to check in" };
  }
}

// ── Update Goal Progress ─────────────────────────────────────────────
export async function updateGoalProgress(
  goalId: string,
  progress: number
) {
  try {
    const goal = await prisma.buddyGoal.update({
      where: { id: goalId },
      data: {
        completed: progress >= 100,
        completedAt: progress >= 100 ? new Date() : undefined,
      },
    });

    return { success: true, goal };
  } catch (error) {
    console.error("[updateGoalProgress] Error:", error);
    return { success: false, error: "Failed to update goal" };
  }
}
