"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { defineAction } from "@/lib/actions/define-action";
import { assertBuddyPartner } from "@/lib/actions/guards";
import {
  communityById,
  communityOfBuddyGoal,
  communityOfPartnership,
} from "@/lib/actions/resolvers";
import { subDays } from "date-fns";

// ── Compatibility Score ──────────────────────────────────────────────
function computeCompatibility(
  userA: { skills: string[]; interests: string[] },
  userB: { skills: string[]; interests: string[] }
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
  const uniqueSkills = userA.skills.length + userB.skills.length - sharedSkills * 2;
  score += Math.min(uniqueSkills * 5, 20) + Math.min(sharedSkills * 5, 10);

  return Math.min(score, 70);
}

// ── Smart Buddy Matching ─────────────────────────────────────────────
export const findSmartBuddyMatch = defineAction(
  {
    name: "findSmartBuddyMatch",
    auth: "member",
    args: [z.string().min(1).max(64)],
    community: ([communityId]) => communityById(communityId),
  },
  async (ctx, communityId: string) => {
    try {
      const userId = ctx.userId;

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
        select: { skills: true, interests: true },
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
              skills: true,
              interests: true,
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
          },
          {
            skills: m.user.skills as string[],
            interests: m.user.interests as string[],
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
        skills: (s.member.user.skills as string[]).slice(0, 4),
        interests: (s.member.user.interests as string[]).slice(0, 4),
        compatibility: s.compatibility,
        sharedInterests: (currentUser.interests as string[]).filter((i) =>
          (s.member.user.interests as string[]).some((j) => j.toLowerCase() === i.toLowerCase())
        ),
      }));

      return { success: true, matches: topMatches };
    } catch (error) {
      console.error("[findSmartBuddyMatch] Error:", error);
      return { success: false, error: "Failed to find matches" };
    }
  }
);

// ── Buddy Stats ──────────────────────────────────────────────────────
export const getBuddyStats = defineAction(
  {
    name: "getBuddyStats",
    auth: "member",
    args: [z.string().min(1).max(64)],
    community: ([partnershipId]) => communityOfPartnership(partnershipId),
  },
  async (ctx, partnershipId: string) => {
    await assertBuddyPartner(ctx, partnershipId);
    try {
      const userId = ctx.userId;
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
      const completedGoals = partnership.goals.filter(
        (g: { completed: boolean }) => g.completed
      ).length;
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
        (Date.now() - new Date(partnership.matchedAt).getTime()) / (1000 * 60 * 60 * 24)
      );

      // Accountability score (0-100)
      const goalScore = totalGoals > 0 ? (completedGoals / totalGoals) * 40 : 20;
      const checkInScore = Math.min((checkInDays.size / 7) * 40, 40);
      const consistencyScore = Math.min(ageInDays / 30, 1) * 20;
      const accountabilityScore = Math.round(goalScore + checkInScore + consistencyScore);

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
);

// ── Check-in with Streak Recording ───────────────────────────────────
export const buddyCheckInWithStreak = defineAction(
  {
    name: "buddyCheckInWithStreak",
    auth: "member",
    args: [
      z.string().min(1).max(64),
      z.number().int().min(1).max(5),
      z.string().max(5000).optional(),
      z.array(z.string().max(500)).max(50).optional(),
      z.array(z.string().max(500)).max(50).optional(),
    ],
    community: ([partnershipId]) => communityOfPartnership(partnershipId),
    rateLimit: "create",
  },
  async (
    ctx,
    partnershipId: string,
    mood: number,
    notes?: string,
    wins?: string[],
    _blockers?: string[]
  ) => {
    await assertBuddyPartner(ctx, partnershipId);
    try {
      const userId = ctx.userId;
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

      return { success: true, checkIn };
    } catch (error) {
      console.error("[buddyCheckInWithStreak] Error:", error);
      return { success: false, error: "Failed to check in" };
    }
  }
);

// ── Update Goal Progress ─────────────────────────────────────────────
export const updateGoalProgress = defineAction(
  {
    name: "updateGoalProgress",
    auth: "member",
    args: [z.string().min(1).max(64), z.number().min(0).max(100)],
    community: ([goalId]) => communityOfBuddyGoal(goalId),
  },
  async (ctx, goalId: string, progress: number) => {
    // Membership of the community is not enough — only a partner in this
    // partnership may move its goals. Runs above the try so the ForbiddenError
    // reaches the seam instead of being swallowed into a generic failure.
    const owning = await prisma.buddyGoal.findUnique({
      where: { id: goalId },
      select: { partnershipId: true },
    });
    if (!owning) return { success: false, error: "Goal not found" };
    await assertBuddyPartner(ctx, owning.partnershipId);

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
);
