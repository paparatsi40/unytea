"use client";

import {
  Star,
  TrendingUp,
  Award,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { StreakDisplay } from "./StreakDisplay";

interface GamificationWidgetProps {
  // User stats
  level: number;
  points: number;
  currentStreak: number;
  longestStreak: number;
  todayActive: boolean;
  streakAtRisk: boolean;

  // Progress
  pointsToNextLevel: number;
  progressPercent: number;
  nextLevel: number;

  // Achievements
  achievementsUnlocked: number;
  achievementsTotal: number;

  // Rank in primary community
  communityRank?: number;
  communityName?: string;
}

export function GamificationWidget({
  level,
  points,
  currentStreak,
  longestStreak,
  todayActive,
  streakAtRisk,
  pointsToNextLevel,
  progressPercent,
  nextLevel,
  achievementsUnlocked,
  achievementsTotal,
  communityRank,
  communityName,
}: GamificationWidgetProps) {
  return (
    <div className="space-y-4">
      {/* Level & Points Card */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600">
              <span className="text-lg font-bold text-white">{level}</span>
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-400">Level {level}</p>
              <p className="text-lg font-bold text-white">
                {points.toLocaleString()}{" "}
                <span className="text-sm font-normal text-zinc-500">XP</span>
              </p>
            </div>
          </div>

          <Link
            href="/dashboard/achievements"
            className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300"
          >
            View all
            <ChevronRight className="h-3 w-3" />
          </Link>
        </div>

        {/* XP Progress Bar */}
        <div className="mb-2">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-xs text-zinc-500">
              Level {nextLevel}
            </span>
            <span className="text-xs text-zinc-400">
              {pointsToNextLevel} XP to go
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-purple-600 to-indigo-500 transition-all duration-700"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Quick Stats Row */}
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="rounded-lg bg-zinc-800/50 p-2.5 text-center">
            <Award className="mx-auto mb-1 h-4 w-4 text-amber-400" />
            <p className="text-sm font-bold text-white">
              {achievementsUnlocked}
              <span className="text-xs font-normal text-zinc-500">
                /{achievementsTotal}
              </span>
            </p>
            <p className="text-xs text-zinc-500">Badges</p>
          </div>

          {communityRank && (
            <div className="rounded-lg bg-zinc-800/50 p-2.5 text-center">
              <TrendingUp className="mx-auto mb-1 h-4 w-4 text-emerald-400" />
              <p className="text-sm font-bold text-white">#{communityRank}</p>
              <p className="text-xs text-zinc-500 truncate">
                {communityName || "Rank"}
              </p>
            </div>
          )}

          <div className="rounded-lg bg-zinc-800/50 p-2.5 text-center">
            <Star className="mx-auto mb-1 h-4 w-4 text-purple-400" />
            <p className="text-sm font-bold text-white">{level}</p>
            <p className="text-xs text-zinc-500">Level</p>
          </div>
        </div>
      </div>

      {/* Streak Card */}
      <StreakDisplay
        currentStreak={currentStreak}
        longestStreak={longestStreak}
        todayActive={todayActive}
        streakAtRisk={streakAtRisk}
      />
    </div>
  );
}
