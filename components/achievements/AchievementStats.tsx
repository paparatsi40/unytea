"use client";

import { motion } from "framer-motion";
import { Trophy, Target, Sparkles, Award } from "lucide-react";

interface AchievementStatsProps {
  stats: {
    total: number;
    unlocked: number;
    totalPoints: number;
  };
}

export function AchievementStats({ stats }: AchievementStatsProps) {
  const percentage = Math.round((stats.unlocked / stats.total) * 100);

  const statCards = [
    {
      icon: Trophy,
      label: "Unlocked",
      value: stats.unlocked,
      total: stats.total,
      color: "text-yellow-500",
      bg: "bg-yellow-500/10",
    },
    {
      icon: Target,
      label: "Completion",
      value: `${percentage}%`,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      icon: Sparkles,
      label: "Points Earned",
      value: stats.totalPoints,
      color: "text-purple-500",
      bg: "bg-purple-500/10",
    },
    {
      icon: Award,
      label: "Remaining",
      value: stats.total - stats.unlocked,
      color: "text-green-500",
      bg: "bg-green-500/10",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {statCards.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className="group relative overflow-hidden rounded-xl border border-border/50 bg-card/50 p-6 backdrop-blur-sm transition-all hover:border-border hover:shadow-lg"
        >
          {/* Background gradient */}
          <div className="absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
          </div>

          <div className="relative flex items-center gap-4">
            <div className={`rounded-xl ${stat.bg} p-3`}>
              <stat.icon className={`h-6 w-6 ${stat.color}`} />
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-foreground">
                  {stat.value}
                </span>
                {stat.total && (
                  <span className="text-sm text-muted-foreground">
                    / {stat.total}
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}