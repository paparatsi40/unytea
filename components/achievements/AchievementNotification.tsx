"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Trophy, X, Sparkles } from "lucide-react";
import { useState, useEffect } from "react";
import Confetti from "react-confetti";
import { AchievementDefinition } from "@/lib/achievements-data";

interface AchievementNotificationProps {
  achievement: AchievementDefinition;
  show: boolean;
  onClose: () => void;
}

export function AchievementNotification({
  achievement,
  show,
  onClose,
}: AchievementNotificationProps) {
  const [showConfetti, setShowConfetti] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (show) {
      setShowConfetti(true);
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });

      const timer = setTimeout(() => {
        setShowConfetti(false);
      }, 3000);

      const autoCloseTimer = setTimeout(() => {
        onClose();
      }, 5000);

      return () => {
        clearTimeout(timer);
        clearTimeout(autoCloseTimer);
      };
    }
    return undefined;
  }, [show, onClose]);

  return (
    <>
      {showConfetti && (
        <Confetti
          width={dimensions.width}
          height={dimensions.height}
          recycle={false}
          numberOfPieces={200}
          gravity={0.3}
        />
      )}

      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, y: -100, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -100, scale: 0.8 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="fixed left-1/2 top-8 z-[100] w-[90%] max-w-md -translate-x-1/2"
          >
            <div className="relative overflow-hidden rounded-2xl border-2 border-yellow-500/50 bg-gradient-to-br from-yellow-500/20 via-orange-500/20 to-red-500/20 p-6 shadow-2xl backdrop-blur-xl">
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute right-3 top-3 rounded-full bg-background/50 p-1 transition-colors hover:bg-background/80"
              >
                <X className="h-4 w-4" />
              </button>

              {/* Content */}
              <div className="flex items-start gap-4">
                {/* Icon */}
                <motion.div
                  initial={{ rotate: -180, scale: 0 }}
                  animate={{ rotate: 0, scale: 1 }}
                  transition={{ delay: 0.2, type: "spring" }}
                  className="flex h-20 w-20 items-center justify-center rounded-2xl bg-yellow-500/20 text-5xl shadow-lg"
                >
                  {achievement.icon}
                </motion.div>

                <div className="flex-1">
                  {/* Header */}
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                    className="mb-2 flex items-center gap-2"
                  >
                    <Trophy className="h-5 w-5 text-yellow-500" />
                    <span className="text-sm font-semibold text-yellow-500">
                      Achievement Unlocked!
                    </span>
                  </motion.div>

                  {/* Title */}
                  <motion.h3
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                    className="mb-1 text-xl font-bold text-foreground"
                  >
                    {achievement.name}
                  </motion.h3>

                  {/* Description */}
                  <motion.p
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 }}
                    className="mb-3 text-sm text-muted-foreground"
                  >
                    {achievement.description}
                  </motion.p>

                  {/* Points */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.6 }}
                    className="flex items-center gap-2 rounded-lg bg-yellow-500/20 px-3 py-2 w-fit"
                  >
                    <Sparkles className="h-4 w-4 text-yellow-500" />
                    <span className="font-bold text-yellow-500">
                      +{achievement.points} points
                    </span>
                  </motion.div>
                </div>
              </div>

              {/* Animated shine effect */}
              <motion.div
                initial={{ x: "-100%" }}
                animate={{ x: "200%" }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  repeatDelay: 3,
                  ease: "easeInOut",
                }}
                className="absolute inset-0 w-1/3 bg-gradient-to-r from-transparent via-white/20 to-transparent"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}