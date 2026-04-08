"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Users,
  Target,
  CheckCircle,
  Heart,
  TrendingUp,
  Plus,
  Flame,
  Zap,
  X,
  Loader2,
  ChevronDown,
} from "lucide-react";
import {
  getMyBuddyPartnership,
  createBuddyPartnership,
  createBuddyGoal,
  completeBuddyGoal,
  endBuddyPartnership,
} from "@/app/actions/buddy";
import {
  findSmartBuddyMatch,
  getBuddyStats,
  buddyCheckInWithStreak,
} from "@/app/actions/buddy-enhanced";

type Props = {
  communityId: string;
  communitySlug: string;
};

interface BuddyMatch {
  id: string;
  name: string | null;
  username: string | null;
  image: string | null;
  level: number;
  streak: number;
  skills: string[];
  interests: string[];
  compatibility: number;
  sharedInterests: string[];
}

interface BuddyStatsData {
  totalGoals: number;
  completedGoals: number;
  totalCheckIns: number;
  checkInsThisWeek: number;
  avgMood: number | null;
  ageInDays: number;
  accountabilityScore: number;
}

export function BuddyDashboard({ communityId, communitySlug: _communitySlug }: Props) {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const [partnership, setPartnership] = useState<any>(null);
  const [buddy, setBuddy] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [matching, setMatching] = useState(false);
  const [matches, setMatches] = useState<BuddyMatch[]>([]);
  const [stats, setStats] = useState<BuddyStatsData | null>(null);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [showCheckInForm, setShowCheckInForm] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);

  const loadPartnership = useCallback(async () => {
    setLoading(true);
    const result = await getMyBuddyPartnership(communityId);
    if (result.success && result.partnership) {
      setPartnership(result.partnership);
      setBuddy(result.buddy);
      // Load stats
      const statsResult = await getBuddyStats(result.partnership.id);
      if (statsResult.success && statsResult.stats) setStats(statsResult.stats);
    }
    setLoading(false);
  }, [communityId]);

  useEffect(() => {
    loadPartnership();
  }, [loadPartnership]);

  const handleFindMatch = async () => {
    setMatching(true);
    const result = await findSmartBuddyMatch(communityId);
    if (result.success && result.matches) {
      setMatches(result.matches);
    } else {
      setMatches([]);
    }
    setMatching(false);
  };

  const handleAcceptMatch = async (matchId: string) => {
    const result = await createBuddyPartnership(matchId, communityId);
    if (result.success) {
      setMatches([]);
      loadPartnership();
    }
  };

  const handleEndPartnership = async () => {
    if (!partnership) return;
    await endBuddyPartnership(partnership.id);
    setPartnership(null);
    setBuddy(null);
    setStats(null);
    setShowEndConfirm(false);
  };

  // ── Loading ────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  // ── No Buddy — Matching Interface ──────────────────────────
  if (!partnership) {
    return (
      <div className="mx-auto max-w-2xl space-y-8">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-purple-500/10">
            <Users className="h-8 w-8 text-purple-400" />
          </div>
          <h2 className="text-2xl font-bold text-white">
            Find Your Accountability Partner
          </h2>
          <p className="mt-2 text-sm text-zinc-400">
            Get matched with someone based on shared interests and complementary skills
          </p>
        </div>

        {matches.length === 0 ? (
          <div className="text-center">
            <button
              onClick={handleFindMatch}
              disabled={matching}
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-3 text-sm font-medium text-white shadow-lg hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50"
            >
              {matching ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Zap className="h-5 w-5" />
              )}
              {matching ? "Finding matches..." : "Find Smart Match"}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <h3 className="text-center text-sm font-medium text-zinc-400">
              Top Matches for You
            </h3>
            {matches.map((m, i) => (
              <div
                key={m.id}
                className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-5 transition-colors hover:border-zinc-700"
              >
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <div className="relative">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 text-xl font-bold text-white">
                      {m.image ? (
                        <img
                          src={m.image}
                          alt=""
                          className="h-full w-full rounded-full object-cover"
                        />
                      ) : (
                        (m.name || "?")[0]
                      )}
                    </div>
                    {i === 0 && (
                      <div className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">
                        1
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-white">
                        {m.name || m.username}
                      </p>
                      <span className="rounded bg-purple-500/20 px-1.5 py-0.5 text-[10px] font-medium text-purple-300">
                        Lvl {m.level}
                      </span>
                      {m.streak > 0 && (
                        <span className="flex items-center gap-0.5 text-[10px] text-orange-400">
                          <Flame className="h-3 w-3" />
                          {m.streak}d
                        </span>
                      )}
                    </div>

                    {/* Compatibility bar */}
                    <div className="mt-2 flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-800">
                        <div
                          className={`h-full rounded-full transition-all ${
                            m.compatibility >= 70
                              ? "bg-emerald-500"
                              : m.compatibility >= 40
                                ? "bg-amber-500"
                                : "bg-zinc-600"
                          }`}
                          style={{ width: `${m.compatibility}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-zinc-400">
                        {m.compatibility}% match
                      </span>
                    </div>

                    {/* Shared interests */}
                    {m.sharedInterests.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {m.sharedInterests.map((interest, j) => (
                          <span
                            key={j}
                            className="rounded-full bg-purple-500/10 px-2 py-0.5 text-[10px] text-purple-300"
                          >
                            {interest}
                          </span>
                        ))}
                      </div>
                    )}

                    {m.skills.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {m.skills.map((skill, j) => (
                          <span
                            key={j}
                            className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-500"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Accept button */}
                  <button
                    onClick={() => handleAcceptMatch(m.id)}
                    className="shrink-0 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-500"
                  >
                    Match
                  </button>
                </div>
              </div>
            ))}

            <button
              onClick={() => setMatches([])}
              className="mx-auto block text-xs text-zinc-500 hover:text-zinc-300"
            >
              Try again later
            </button>
          </div>
        )}

        {/* Feature cards */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { icon: Target, title: "Shared Goals", desc: "Set and track goals together" },
            { icon: CheckCircle, title: "Check-Ins", desc: "Daily accountability updates" },
            { icon: TrendingUp, title: "Growth Score", desc: "Track your partnership impact" },
          ].map((f) => (
            <div
              key={f.title}
              className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 text-center"
            >
              <f.icon className="mx-auto h-6 w-6 text-purple-400" />
              <p className="mt-2 text-sm font-medium text-white">{f.title}</p>
              <p className="mt-0.5 text-xs text-zinc-500">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Active Partnership Dashboard ───────────────────────────
  const activeGoals = partnership.goals?.filter((g: any) => !g.completed) || [];
  const completedGoals = partnership.goals?.filter((g: any) => g.completed) || [];
  const recentCheckIns = partnership.checkIns?.slice(0, 5) || [];

  const moodEmoji = (mood: number) => {
    if (mood >= 9) return "🔥";
    if (mood >= 7) return "😊";
    if (mood >= 5) return "😐";
    if (mood >= 3) return "😔";
    return "😢";
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Buddy Header */}
      <div className="rounded-xl border border-zinc-800 bg-gradient-to-r from-purple-950/40 to-indigo-950/40 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 text-xl font-bold text-white">
              {buddy?.image ? (
                <img
                  src={buddy.image}
                  alt=""
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                (buddy?.name || "?")[0]
              )}
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                Your Buddy: {buddy?.name}
              </h2>
              <p className="text-sm text-zinc-400">
                Level {buddy?.level} · Partners for{" "}
                {stats?.ageInDays || 0} days
              </p>
            </div>
          </div>

          {/* Accountability score */}
          {stats && (
            <div className="text-center">
              <div className="relative mx-auto h-16 w-16">
                <svg className="h-16 w-16 -rotate-90" viewBox="0 0 36 36">
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#27272a"
                    strokeWidth="3"
                  />
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke={
                      stats.accountabilityScore >= 70
                        ? "#22c55e"
                        : stats.accountabilityScore >= 40
                          ? "#eab308"
                          : "#ef4444"
                    }
                    strokeWidth="3"
                    strokeDasharray={`${stats.accountabilityScore}, 100`}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-sm font-bold text-white">
                    {stats.accountabilityScore}
                  </span>
                </div>
              </div>
              <p className="mt-1 text-[10px] text-zinc-500">
                Accountability
              </p>
            </div>
          )}
        </div>

        {/* Quick stats row */}
        {stats && (
          <div className="mt-4 grid grid-cols-4 gap-3">
            <div className="rounded-lg bg-zinc-900/50 p-2.5 text-center">
              <p className="text-lg font-bold text-white">
                {stats.completedGoals}/{stats.totalGoals}
              </p>
              <p className="text-[10px] text-zinc-500">Goals Done</p>
            </div>
            <div className="rounded-lg bg-zinc-900/50 p-2.5 text-center">
              <p className="text-lg font-bold text-white">
                {stats.totalCheckIns}
              </p>
              <p className="text-[10px] text-zinc-500">Check-ins</p>
            </div>
            <div className="rounded-lg bg-zinc-900/50 p-2.5 text-center">
              <p className="text-lg font-bold text-white">
                {stats.checkInsThisWeek}/7
              </p>
              <p className="text-[10px] text-zinc-500">This Week</p>
            </div>
            <div className="rounded-lg bg-zinc-900/50 p-2.5 text-center">
              <p className="text-lg font-bold text-white">
                {stats.avgMood ? `${stats.avgMood}` : "–"}/10
              </p>
              <p className="text-[10px] text-zinc-500">Avg Mood</p>
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Active Goals */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-purple-400" />
              <h3 className="font-semibold text-white">Active Goals</h3>
            </div>
            <button
              onClick={() => setShowGoalForm(!showGoalForm)}
              className="rounded-md p-1 text-zinc-500 hover:bg-zinc-800 hover:text-white"
            >
              {showGoalForm ? (
                <X className="h-4 w-4" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
            </button>
          </div>

          {showGoalForm && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const title = formData.get("title") as string;
                const description = formData.get("description") as string;
                await createBuddyGoal(partnership.id, title, description);
                setShowGoalForm(false);
                loadPartnership();
              }}
              className="mb-4 space-y-2"
            >
              <input
                name="title"
                placeholder="Goal title..."
                required
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-purple-500 focus:outline-none"
              />
              <textarea
                name="description"
                placeholder="Description (optional)"
                className="w-full resize-none rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-purple-500 focus:outline-none"
                rows={2}
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-purple-500"
                >
                  Add Goal
                </button>
                <button
                  type="button"
                  onClick={() => setShowGoalForm(false)}
                  className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 hover:bg-zinc-800"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          <div className="space-y-2">
            {activeGoals.length === 0 ? (
              <p className="py-6 text-center text-sm text-zinc-600">
                No active goals yet
              </p>
            ) : (
              activeGoals.map((goal: any) => (
                <div
                  key={goal.id}
                  className="flex items-start gap-3 rounded-lg border border-zinc-800 bg-zinc-900/40 p-3"
                >
                  <button
                    onClick={async () => {
                      await completeBuddyGoal(goal.id);
                      loadPartnership();
                    }}
                    className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 border-zinc-600 hover:border-purple-500"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white">
                      {goal.title}
                    </p>
                    {goal.description && (
                      <p className="mt-0.5 text-xs text-zinc-500">
                        {goal.description}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Completed goals */}
          {completedGoals.length > 0 && (
            <details className="mt-3">
              <summary className="flex cursor-pointer items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300">
                <ChevronDown className="h-3 w-3" />
                {completedGoals.length} completed
              </summary>
              <div className="mt-2 space-y-1">
                {completedGoals.map((goal: any) => (
                  <div
                    key={goal.id}
                    className="flex items-center gap-2 px-1 text-zinc-600 line-through"
                  >
                    <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                    <span className="text-xs">{goal.title}</span>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>

        {/* Check-Ins */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Heart className="h-4 w-4 text-pink-400" />
              <h3 className="font-semibold text-white">Check-Ins</h3>
            </div>
            <button
              onClick={() => setShowCheckInForm(!showCheckInForm)}
              className="rounded-md p-1 text-zinc-500 hover:bg-zinc-800 hover:text-white"
            >
              {showCheckInForm ? (
                <X className="h-4 w-4" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
            </button>
          </div>

          {showCheckInForm && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const mood = parseInt(formData.get("mood") as string);
                const notes = formData.get("notes") as string;
                await buddyCheckInWithStreak(partnership.id, mood, notes);
                setShowCheckInForm(false);
                loadPartnership();
              }}
              className="mb-4 space-y-3"
            >
              <div>
                <label className="mb-1.5 block text-xs text-zinc-400">
                  How are you feeling?
                </label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                    <label key={n} className="flex-1">
                      <input
                        type="radio"
                        name="mood"
                        value={n}
                        defaultChecked={n === 7}
                        className="peer sr-only"
                      />
                      <div className="cursor-pointer rounded-md border border-zinc-700 bg-zinc-800 py-1.5 text-center text-xs text-zinc-500 transition-colors peer-checked:border-purple-500 peer-checked:bg-purple-500/10 peer-checked:text-white hover:border-zinc-600">
                        {n}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              <textarea
                name="notes"
                placeholder="What's on your mind?"
                className="w-full resize-none rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-purple-500 focus:outline-none"
                rows={2}
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-purple-500"
                >
                  Submit Check-in
                </button>
                <button
                  type="button"
                  onClick={() => setShowCheckInForm(false)}
                  className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 hover:bg-zinc-800"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          <div className="space-y-2">
            {recentCheckIns.length === 0 ? (
              <p className="py-6 text-center text-sm text-zinc-600">
                No check-ins yet
              </p>
            ) : (
              recentCheckIns.map((checkIn: any) => (
                <div
                  key={checkIn.id}
                  className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-800 text-xs">
                        {checkIn.user?.image ? (
                          <img
                            src={checkIn.user.image}
                            alt=""
                            className="h-full w-full rounded-full object-cover"
                          />
                        ) : (
                          (checkIn.user?.name || "?")[0]
                        )}
                      </div>
                      <span className="text-sm text-white">
                        {checkIn.user?.name}
                      </span>
                    </div>
                    <span className="text-sm">
                      {moodEmoji(checkIn.mood)} {checkIn.mood}/10
                    </span>
                  </div>
                  {checkIn.notes && (
                    <p className="mt-1.5 text-xs text-zinc-400">
                      {checkIn.notes}
                    </p>
                  )}
                  <p className="mt-1 text-[10px] text-zinc-600">
                    {new Date(checkIn.createdAt).toLocaleDateString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* End Partnership */}
      <div className="text-center">
        {!showEndConfirm ? (
          <button
            onClick={() => setShowEndConfirm(true)}
            className="text-xs text-zinc-600 hover:text-red-400"
          >
            End Partnership
          </button>
        ) : (
          <div className="inline-flex items-center gap-3 rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-2">
            <span className="text-xs text-red-400">Are you sure?</span>
            <button
              onClick={handleEndPartnership}
              className="rounded bg-red-600 px-3 py-1 text-xs text-white hover:bg-red-500"
            >
              Yes, end it
            </button>
            <button
              onClick={() => setShowEndConfirm(false)}
              className="text-xs text-zinc-500 hover:text-white"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
