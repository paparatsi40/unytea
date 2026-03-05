"use client";

import { useEffect, useState } from "react";
import { checkAndUnlockAchievements } from "@/app/actions/achievements";
import { AchievementDefinition } from "@/lib/achievements-data";

export function useAchievementChecker(userId: string | undefined) {
  const [newAchievement, setNewAchievement] = useState<AchievementDefinition | null>(null);
  const [showNotification, setShowNotification] = useState(false);

  useEffect(() => {
    if (!userId) return;

    // Check achievements periodically
    const checkAchievements = async () => {
      try {
        const result = await checkAndUnlockAchievements(userId);
        if (result.success && result.unlocked && result.unlocked.length > 0) {
          // Show notification for first unlocked achievement
          // In a real app, you'd want to show all of them sequentially
          console.log("🏆 New achievements unlocked:", result.unlocked);
        }
      } catch (error) {
        console.error("Error checking achievements:", error);
      }
    };

    // Check on mount
    checkAchievements();

    // Check every 30 seconds
    const interval = setInterval(checkAchievements, 30000);

    return () => clearInterval(interval);
  }, [userId]);

  return {
    newAchievement,
    showNotification,
    setShowNotification,
  };
}

export function useManualAchievementCheck() {
  const [isChecking, setIsChecking] = useState(false);

  const checkAchievements = async (userId: string) => {
    setIsChecking(true);
    try {
      const result = await checkAndUnlockAchievements(userId);
      return result;
    } catch (error) {
      console.error("Error checking achievements:", error);
      return { success: false, error: "Failed to check achievements" };
    } finally {
      setIsChecking(false);
    }
  };

  return { checkAchievements, isChecking };
}