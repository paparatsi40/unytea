"use client";

import { useState, useEffect } from "react";
import { Trophy, Medal, Award, TrendingUp, Crown } from "lucide-react";
import { getLeaderboard } from "@/app/actions/gamification";

type LeaderboardEntry = {
  rank: number;
  userId: string;
  name: string | null;
  image: string | null;
  level: number;
  points: number;
  globalPoints: number;
};

const getRankIcon = (rank: number) => {
  if (rank === 1) return { Icon: Crown, color: "text-yellow-500", bg: "bg-yellow-50" };
  if (rank === 2) return { Icon: Medal, color: "text-gray-400", bg: "bg-gray-50" };
  if (rank === 3) return { Icon: Award, color: "text-orange-500", bg: "bg-orange-50" };
  return { Icon: TrendingUp, color: "text-purple-500", bg: "bg-purple-50" };
};

export function Leaderboard({ communityId }: { communityId: string }) {
  const [timeframe, setTimeframe] = useState<"weekly" | "monthly" | "alltime">("alltime");
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadLeaderboard();
  }, [communityId, timeframe]);

  const loadLeaderboard = async () => {
    setIsLoading(true);
    const result = await getLeaderboard(communityId, timeframe, 10);
    if (result.success) {
      setLeaderboard(result.leaderboard as LeaderboardEntry[]);
    }
    setIsLoading(false);
  };

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Trophy className="h-6 w-6 text-yellow-500" />
          <h2 className="text-xl font-bold text-gray-900">Leaderboard</h2>
        </div>

        {/* Timeframe Tabs */}
        <div className="flex items-center space-x-1 rounded-lg bg-gray-100 p-1">
          <button
            onClick={() => setTimeframe("weekly")}
            className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
              timeframe === "weekly"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Week
          </button>
          <button
            onClick={() => setTimeframe("monthly")}
            className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
              timeframe === "monthly"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Month
          </button>
          <button
            onClick={() => setTimeframe("alltime")}
            className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
              timeframe === "alltime"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            All Time
          </button>
        </div>
      </div>

      {/* Leaderboard List */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-gray-100" />
          ))}
        </div>
      ) : leaderboard.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12">
          <Trophy className="h-12 w-12 text-gray-300" />
          <p className="mt-2 text-sm text-gray-600">No data yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {leaderboard.map((entry) => {
            const { Icon, color, bg } = getRankIcon(entry.rank);
            const isTopThree = entry.rank <= 3;

            return (
              <div
                key={entry.userId}
                className={`flex items-center space-x-4 rounded-lg p-3 transition-all ${
                  isTopThree
                    ? "bg-gradient-to-r from-purple-50 to-pink-50 shadow-sm"
                    : "hover:bg-gray-50"
                }`}
              >
                {/* Rank */}
                <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${bg}`}>
                  {isTopThree ? (
                    <Icon className={`h-5 w-5 ${color}`} />
                  ) : (
                    <span className="text-sm font-bold text-gray-600">#{entry.rank}</span>
                  )}
                </div>

                {/* Avatar */}
                <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-full border-2 border-white bg-gradient-to-br from-purple-500 to-pink-500 shadow-sm">
                  {entry.image ? (
                    <img
                      src={entry.image}
                      alt={entry.name || "User"}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-sm font-bold text-white">
                      {entry.name?.charAt(0).toUpperCase() || "?"}
                    </div>
                  )}
                  {/* Level Badge */}
                  <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-purple-600 text-[10px] font-bold text-white ring-2 ring-white">
                    {entry.level}
                  </div>
                </div>

                {/* Name */}
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-semibold text-gray-900">
                    {entry.name || "Anonymous"}
                  </p>
                  <p className="text-xs text-gray-500">Level {entry.level}</p>
                </div>

                {/* Points */}
                <div className="text-right">
                  <p className="text-lg font-bold text-purple-600">{entry.points}</p>
                  <p className="text-xs text-gray-500">points</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
