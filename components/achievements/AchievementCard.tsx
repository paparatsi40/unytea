"use client";

import { motion } from "framer-motion";
import { Lock, Check, Sparkles } from "lucide-react";
import { AchievementDefinition, RARITY_CONFIG } from "@/lib/achievements-data";
import { cn } from "@/lib/utils";

interface AchievementCardProps {
  achievement: AchievementDefinition & {
    isUnlocked: boolean;
    unlockedAt: Date | null;
    progress: number;
  };
  index?: number;
}

export function AchievementCard({ achievement, index = 0 }: AchievementCardProps) {
  const rarity = RARITY_CONFIG[achievement.rarity];
  const isUnlocked = achievement.isUnlocked;
  
  const rarityColors = {
    common: "from-gray-500/20 to-gray-600/20 border-gray-500/30",
    uncommon: "from-green-500/20 to-green-600/20 border-green-500/30",
    rare: "from-blue-500/20 to-blue-600/20 border-blue-500/30",
    epic: "from-purple-500/20 to-purple-600/20 border-purple-500/30",
    legendary: "from-orange-500/20 to-orange-600/20 border-orange-500/30",
  };

  const glowColors = {
    common: "",
    uncommon: "shadow-green-500/20",
    rare: "shadow-blue-500/20",
    epic: "shadow-purple-500/20",
    legendary: "shadow-orange-500/20",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={cn(
        "group relative overflow-hidden rounded-xl border bg-gradient-to-br p-6 transition-all hover:scale-105",
        isUnlocked
          ? `${rarityColors[achievement.rarity]} ${glowColors[achievement.rarity]} shadow-lg`
          : "border-border/50 bg-card/50 opacity-70"
      )}
    >
      {/* Rarity Badge */}
      <div className="absolute right-3 top-3">
        <div
          className={cn(
            "rounded-full px-2 py-1 text-xs font-semibold",
            isUnlocked
              ? `bg-${rarity.color}-500/20 text-${rarity.color}-500`
              : "bg-muted text-muted-foreground"
          )}
        >
          {rarity.name}
        </div>
      </div>

      {/* Icon */}
      <div className="mb-4 flex items-start gap-4">
        <div
          className={cn(
            "flex h-16 w-16 items-center justify-center rounded-xl text-4xl transition-all",
            isUnlocked
              ? "bg-background/50 shadow-lg"
              : "bg-muted grayscale"
          )}
        >
          {achievement.icon}
        </div>

        <div className="flex-1">
          <h3 className="mb-1 text-lg font-bold text-foreground">
            {achievement.name}
          </h3>
          <p className="text-sm text-muted-foreground">
            {achievement.description}
          </p>
        </div>
      </div>

      {/* Points */}
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-yellow-500" />
        <span className="font-semibold text-foreground">
          {achievement.points} points
        </span>
      </div>

      {/* Progress Bar or Unlocked Status */}
      {isUnlocked ? (
        <div className="flex items-center gap-2 rounded-lg bg-green-500/10 p-3">
          <Check className="h-5 w-5 text-green-500" />
          <span className="text-sm font-medium text-green-500">
            Unlocked{" "}
            {achievement.unlockedAt &&
              new Date(achievement.unlockedAt).toLocaleDateString()}
          </span>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-semibold text-foreground">
              {achievement.progress}%
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${achievement.progress}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="h-full bg-gradient-to-r from-primary to-primary/80"
            />
          </div>
          {achievement.progress === 0 && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Lock className="h-3 w-3" />
              <span>Not started yet</span>
            </div>
          )}
        </div>
      )}

      {/* Glow effect for unlocked rare achievements */}
      {isUnlocked && achievement.rarity !== "common" && (
        <div
          className={cn(
            "pointer-events-none absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100",
            `bg-gradient-radial from-${rarity.color}-500/10 via-transparent to-transparent`
          )}
        />
      )}
    </motion.div>
  );
}