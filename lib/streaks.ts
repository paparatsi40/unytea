import { prisma } from "@/lib/prisma";

/**
 * Streak System for Unytea
 *
 * A "streak day" is any day where the user performs at least one qualifying action:
 * - Create a post
 * - Leave a comment
 * - Send a message
 * - Attend a live session
 * - React to content
 * - View/complete a resource
 *
 * Streaks are checked against consecutive calendar days (in the user's timezone
 * if available, otherwise UTC).
 */

// ── Types ─────────────────────────────────────────────────────────────
export type ActivityType =
  | "post"
  | "comment"
  | "message"
  | "reaction"
  | "session"
  | "resource";

export interface StreakInfo {
  currentStreak: number;
  longestStreak: number;
  todayActive: boolean;
  lastActiveDate: string | null; // ISO date string
  streakAtRisk: boolean; // True if streak will break if user doesn't act today
}

export interface DailyActivitySummary {
  date: string;
  posts: number;
  comments: number;
  messages: number;
  reactions: number;
  sessions: number;
  resources: number;
  pointsEarned: number;
  total: number;
}

// ── Core: Record Daily Activity & Update Streak ───────────────────────
export async function recordActivity(
  userId: string,
  activityType: ActivityType,
  points: number = 0
): Promise<{ streakUpdated: boolean; newStreak: number; levelUp: boolean }> {
  const today = getDateOnly(new Date());

  // Upsert the daily activity record
  const incrementField = getIncrementField(activityType);

  await prisma.dailyActivity.upsert({
    where: {
      userId_date: { userId, date: today },
    },
    create: {
      userId,
      date: today,
      [incrementField]: 1,
      pointsEarned: points,
    },
    update: {
      [incrementField]: { increment: 1 },
      pointsEarned: { increment: points },
    },
  });

  // Update streak
  return updateStreak(userId);
}

// ── Update Streak Logic ───────────────────────────────────────────────
async function updateStreak(
  userId: string
): Promise<{ streakUpdated: boolean; newStreak: number; levelUp: boolean }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      currentStreak: true,
      longestStreak: true,
      lastStreakDate: true,
      points: true,
      level: true,
    },
  });

  if (!user) return { streakUpdated: false, newStreak: 0, levelUp: false };

  const today = getDateOnly(new Date());
  const yesterday = getDateOnly(
    new Date(Date.now() - 24 * 60 * 60 * 1000)
  );

  const lastStreakDate = user.lastStreakDate
    ? getDateOnly(user.lastStreakDate)
    : null;

  // Already counted today
  if (lastStreakDate && lastStreakDate.getTime() === today.getTime()) {
    return {
      streakUpdated: false,
      newStreak: user.currentStreak,
      levelUp: false,
    };
  }

  let newStreak: number;

  if (lastStreakDate && lastStreakDate.getTime() === yesterday.getTime()) {
    // Consecutive day — extend streak
    newStreak = user.currentStreak + 1;
  } else {
    // Streak broken or first activity — start at 1
    newStreak = 1;
  }

  const newLongest = Math.max(user.longestStreak, newStreak);

  // Bonus points for streaks
  const streakBonus = getStreakBonus(newStreak);
  const newPoints = user.points + streakBonus;
  const newLevel = Math.floor(newPoints / 100) + 1;
  const levelUp = newLevel > user.level;

  await prisma.user.update({
    where: { id: userId },
    data: {
      currentStreak: newStreak,
      longestStreak: newLongest,
      lastStreakDate: today,
      points: newPoints,
      level: newLevel,
    },
  });

  return { streakUpdated: true, newStreak, levelUp };
}

// ── Get Streak Info ───────────────────────────────────────────────────
export async function getStreakInfo(userId: string): Promise<StreakInfo> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      currentStreak: true,
      longestStreak: true,
      lastStreakDate: true,
    },
  });

  if (!user) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      todayActive: false,
      lastActiveDate: null,
      streakAtRisk: false,
    };
  }

  const today = getDateOnly(new Date());
  const yesterday = getDateOnly(
    new Date(Date.now() - 24 * 60 * 60 * 1000)
  );

  const lastStreakDate = user.lastStreakDate
    ? getDateOnly(user.lastStreakDate)
    : null;

  const todayActive =
    !!lastStreakDate && lastStreakDate.getTime() === today.getTime();

  // Streak is at risk if last activity was yesterday and user hasn't been active today
  const streakAtRisk =
    !todayActive &&
    !!lastStreakDate &&
    lastStreakDate.getTime() === yesterday.getTime() &&
    user.currentStreak > 0;

  // If streak is actually broken (last activity was before yesterday)
  let effectiveStreak = user.currentStreak;
  if (
    lastStreakDate &&
    lastStreakDate.getTime() < yesterday.getTime() &&
    !todayActive
  ) {
    effectiveStreak = 0;
  }

  return {
    currentStreak: effectiveStreak,
    longestStreak: user.longestStreak,
    todayActive,
    lastActiveDate: lastStreakDate?.toISOString() || null,
    streakAtRisk,
  };
}

// ── Get Activity History (for heatmap/calendar) ───────────────────────
export async function getActivityHistory(
  userId: string,
  days: number = 90
): Promise<DailyActivitySummary[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const activities = await prisma.dailyActivity.findMany({
    where: {
      userId,
      date: { gte: getDateOnly(since) },
    },
    orderBy: { date: "asc" },
  });

  return activities.map((a: { date: Date; posts: number; comments: number; messages: number; reactions: number; sessions: number; resources: number; pointsEarned: number }) => ({
    date: a.date.toISOString().split("T")[0],
    posts: a.posts,
    comments: a.comments,
    messages: a.messages,
    reactions: a.reactions,
    sessions: a.sessions,
    resources: a.resources,
    pointsEarned: a.pointsEarned,
    total: a.posts + a.comments + a.messages + a.reactions + a.sessions + a.resources,
  }));
}

// ── Streak Bonus Points ───────────────────────────────────────────────
function getStreakBonus(streak: number): number {
  if (streak >= 365) return 50;
  if (streak >= 100) return 30;
  if (streak >= 30) return 20;
  if (streak >= 7) return 10;
  if (streak >= 3) return 5;
  return 0;
}

// ── Helpers ───────────────────────────────────────────────────────────
function getDateOnly(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function getIncrementField(type: ActivityType): string {
  switch (type) {
    case "post":
      return "posts";
    case "comment":
      return "comments";
    case "message":
      return "messages";
    case "reaction":
      return "reactions";
    case "session":
      return "sessions";
    case "resource":
      return "resources";
  }
}

// ── Streak Milestones (for achievements) ──────────────────────────────
export const STREAK_MILESTONES = [
  { days: 3, name: "Getting Started", emoji: "🌱", points: 10 },
  { days: 7, name: "One Week Strong", emoji: "🔥", points: 25 },
  { days: 14, name: "Two Week Warrior", emoji: "💪", points: 50 },
  { days: 30, name: "Monthly Master", emoji: "⭐", points: 100 },
  { days: 60, name: "Sixty Day Sage", emoji: "🏆", points: 200 },
  { days: 100, name: "Century Streak", emoji: "💎", points: 500 },
  { days: 365, name: "Year of Dedication", emoji: "👑", points: 1000 },
];
