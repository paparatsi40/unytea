"use client";

import { Trophy, Award, TrendingUp, User as UserIcon } from "lucide-react";
import Image from "next/image";

interface LeaderboardEntry {
  rank: number;
  user: {
    id: string;
    name: string | null;
    image: string | null;
  };
  points: number;
  level?: number;
  change?: "up" | "down" | "same";
}

interface LeaderboardSectionProps {
  title?: string;
  entries: LeaderboardEntry[];
  showTop?: number;
  theme?: {
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
  };
}

export function LeaderboardSection({
  title = "Top Contributors",
  entries,
  showTop = 10,
  theme,
}: LeaderboardSectionProps) {
  const primaryColor = theme?.primaryColor || "#0ea5e9";

  if (entries.length === 0) {
    return null;
  }

  const getRankColor = (rank: number) => {
    if (rank === 1) return "#FFD700"; // Gold
    if (rank === 2) return "#C0C0C0"; // Silver
    if (rank === 3) return "#CD7F32"; // Bronze
    return primaryColor;
  };

  const getRankIcon = (rank: number) => {
    if (rank <= 3) return Trophy;
    return Award;
  };

  return (
    <section>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 
          className="text-2xl font-bold"
          style={{ color: primaryColor }}
        >
          {title}
        </h2>
        <a 
          href="#" 
          className="text-sm hover:underline"
          style={{ color: primaryColor }}
        >
          View full leaderboard →
        </a>
      </div>

      {/* Podium (Top 3) */}
      {entries.length >= 3 && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          {/* 2nd Place */}
          <div className="text-center pt-8">
            <div className="mb-3">
              {entries[1].user.image ? (
                <Image
                  src={entries[1].user.image}
                  alt={entries[1].user.name || "User"}
                  width={64}
                  height={64}
                  className="rounded-full mx-auto border-4"
                  style={{ borderColor: getRankColor(2) }}
                />
              ) : (
                <div 
                  className="h-16 w-16 rounded-full bg-gray-200 flex items-center justify-center mx-auto border-4"
                  style={{ borderColor: getRankColor(2) }}
                >
                  <UserIcon className="h-8 w-8 text-gray-500" />
                </div>
              )}
            </div>
            <Trophy className="h-6 w-6 mx-auto mb-2" style={{ color: getRankColor(2) }} />
            <div className="font-semibold text-gray-900">
              {entries[1].user.name || "Anonymous"}
            </div>
            <div className="text-sm text-gray-500">{entries[1].points.toLocaleString()} pts</div>
          </div>

          {/* 1st Place */}
          <div className="text-center">
            <div className="mb-3">
              {entries[0].user.image ? (
                <Image
                  src={entries[0].user.image}
                  alt={entries[0].user.name || "User"}
                  width={80}
                  height={80}
                  className="rounded-full mx-auto border-4"
                  style={{ borderColor: getRankColor(1) }}
                />
              ) : (
                <div 
                  className="h-20 w-20 rounded-full bg-gray-200 flex items-center justify-center mx-auto border-4"
                  style={{ borderColor: getRankColor(1) }}
                >
                  <UserIcon className="h-10 w-10 text-gray-500" />
                </div>
              )}
            </div>
            <Trophy className="h-8 w-8 mx-auto mb-2" style={{ color: getRankColor(1) }} />
            <div className="font-bold text-lg text-gray-900">
              {entries[0].user.name || "Anonymous"}
            </div>
            <div className="text-sm text-gray-500">{entries[0].points.toLocaleString()} pts</div>
          </div>

          {/* 3rd Place */}
          <div className="text-center pt-12">
            <div className="mb-3">
              {entries[2].user.image ? (
                <Image
                  src={entries[2].user.image}
                  alt={entries[2].user.name || "User"}
                  width={56}
                  height={56}
                  className="rounded-full mx-auto border-4"
                  style={{ borderColor: getRankColor(3) }}
                />
              ) : (
                <div 
                  className="h-14 w-14 rounded-full bg-gray-200 flex items-center justify-center mx-auto border-4"
                  style={{ borderColor: getRankColor(3) }}
                >
                  <UserIcon className="h-7 w-7 text-gray-500" />
                </div>
              )}
            </div>
            <Trophy className="h-5 w-5 mx-auto mb-2" style={{ color: getRankColor(3) }} />
            <div className="font-semibold text-gray-900">
              {entries[2].user.name || "Anonymous"}
            </div>
            <div className="text-sm text-gray-500">{entries[2].points.toLocaleString()} pts</div>
          </div>
        </div>
      )}

      {/* Rest of Leaderboard */}
      {entries.length > 3 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-100">
          {entries.slice(3, showTop).map((entry) => {
            const Icon = getRankIcon(entry.rank);
            
            return (
              <div
                key={entry.user.id}
                className="p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors"
              >
                {/* Rank */}
                <div className="flex-shrink-0 w-8 text-center">
                  <span className="font-bold text-gray-500">#{entry.rank}</span>
                </div>

                {/* Avatar */}
                <div className="flex-shrink-0">
                  {entry.user.image ? (
                    <Image
                      src={entry.user.image}
                      alt={entry.user.name || "User"}
                      width={40}
                      height={40}
                      className="rounded-full"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                      <UserIcon className="h-5 w-5 text-gray-500" />
                    </div>
                  )}
                </div>

                {/* Name & Level */}
                <div className="flex-1">
                  <div className="font-medium text-gray-900">
                    {entry.user.name || "Anonymous"}
                  </div>
                  {entry.level && (
                    <div className="text-xs text-gray-500">Level {entry.level}</div>
                  )}
                </div>

                {/* Points */}
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4" style={{ color: primaryColor }} />
                  <span className="font-semibold text-gray-900">
                    {entry.points.toLocaleString()}
                  </span>
                </div>

                {/* Change Indicator */}
                {entry.change && entry.change !== "same" && (
                  <div className="flex-shrink-0">
                    <TrendingUp
                      className={`h-4 w-4 ${
                        entry.change === "up" 
                          ? "text-green-500 rotate-0" 
                          : "text-red-500 rotate-180"
                      }`}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}