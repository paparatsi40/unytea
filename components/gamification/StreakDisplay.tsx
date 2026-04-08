"use client";

import { cn } from "@/lib/utils";
import { Flame, AlertTriangle, Trophy, Zap } from "lucide-react";

interface StreakDisplayProps {
  currentStreak: number;
  longestStreak: number;
  todayActive: boolean;
  streakAtRisk: boolean;
  compact?: boolean; // For header/navbar use
}

export function StreakDisplay({
  currentStreak,
  longestStreak,
  todayActive,
  streakAtRisk,
  compact = false,
}: StreakDisplayProps) {
  if (compact) {
    return (
      <div
        className={cn(
          "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold transition-colors",
          currentStreak > 0
            ? streakAtRisk
              ? "bg-amber-500/15 text-amber-400"
              : "bg-orange-500/15 text-orange-400"
            : "bg-zinc-800 text-zinc-500"
        )}
        title={`${currentStreak} day streak${streakAtRisk ? " — at risk!" : ""}`}
      >
        <Flame
          className={cn(
            "h-4 w-4",
            currentStreak > 0 && !streakAtRisk && "animate-pulse",
            streakAtRisk && "text-amber-400"
          )}
        />
        <span>{currentStreak}</span>
        {streakAtRisk && <AlertTriangle className="h-3 w-3" />}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
      {/* Streak Counter */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-12 w-12 items-center justify-center rounded-xl",
              currentStreak >= 30
                ? "bg-gradient-to-br from-orange-500 to-red-600"
                : currentStreak >= 7
                ? "bg-orange-500/20"
                : currentStreak > 0
                ? "bg-amber-500/15"
                : "bg-zinc-800"
            )}
          >
            <Flame
              className={cn(
                "h-6 w-6",
                currentStreak >= 30
                  ? "text-white"
                  : currentStreak >= 7
                  ? "text-orange-400"
                  : currentStreak > 0
                  ? "text-amber-400"
                  : "text-zinc-600"
              )}
            />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">
              {currentStreak}
              <span className="ml-1 text-sm font-normal text-zinc-400">
                day{currentStreak !== 1 ? "s" : ""}
              </span>
            </p>
            <p className="text-xs text-zinc-500">Current streak</p>
          </div>
        </div>

        {/* Status Badge */}
        {streakAtRisk ? (
          <div className="flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-1.5">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-xs font-medium text-amber-400">
              At risk!
            </span>
          </div>
        ) : todayActive ? (
          <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1.5">
            <Zap className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-xs font-medium text-emerald-400">
              Active today
            </span>
          </div>
        ) : null}
      </div>

      {/* Streak Stats */}
      <div className="flex gap-4 border-t border-zinc-800 pt-4">
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-purple-400" />
          <div>
            <p className="text-sm font-semibold text-white">{longestStreak}</p>
            <p className="text-xs text-zinc-500">Best streak</p>
          </div>
        </div>

        {/* Streak milestone progress */}
        <div className="flex-1">
          <StreakMilestoneBar currentStreak={currentStreak} />
        </div>
      </div>
    </div>
  );
}

// ── Streak Milestone Progress Bar ─────────────────────────────────────
function StreakMilestoneBar({ currentStreak }: { currentStreak: number }) {
  const milestones = [7, 14, 30, 60, 100, 365];
  const nextMilestone =
    milestones.find((m) => m > currentStreak) || milestones[milestones.length - 1];
  const prevMilestone =
    [...milestones].reverse().find((m) => m <= currentStreak) || 0;

  const progressRange = nextMilestone - prevMilestone;
  const currentProgress = currentStreak - prevMilestone;
  const percentage = progressRange > 0
    ? Math.min(100, Math.round((currentProgress / progressRange) * 100))
    : 100;

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs text-zinc-500">
          Next: {nextMilestone} days
        </span>
        <span className="text-xs font-medium text-zinc-400">
          {nextMilestone - currentStreak} to go
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
        <div
          className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-400 transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
