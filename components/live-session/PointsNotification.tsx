"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";

interface PointsNotificationProps {
  points: number;
  title: string;
  message: string;
  emoji: string;
  show: boolean;
  onComplete?: () => void;
}

export function PointsNotification({
  points,
  title,
  message,
  emoji,
  show,
  onComplete,
}: PointsNotificationProps) {
  useEffect(() => {
    if (show && onComplete) {
      const timer = setTimeout(onComplete, 3000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [show, onComplete]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.8 }}
          className="fixed right-4 top-20 z-50"
        >
          <div className="relative overflow-hidden rounded-2xl border-2 border-purple-300 bg-gradient-to-r from-purple-50 to-pink-50 p-4 shadow-2xl backdrop-blur-sm">
            {/* Sparkle effect */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="absolute -right-2 -top-2"
            >
              <Sparkles className="h-6 w-6 text-yellow-400" />
            </motion.div>

            <div className="flex items-center gap-3">
              {/* Emoji with animation */}
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 200 }}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-2xl shadow-md"
              >
                {emoji}
              </motion.div>

              {/* Content */}
              <div className="flex-1">
                <h4 className="text-sm font-bold text-gray-900">{title}</h4>
                <p className="text-xs text-gray-600">{message}</p>
              </div>

              {/* Points badge */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-purple-600 to-pink-600 text-sm font-bold text-white shadow-lg"
              >
                +{points}
              </motion.div>
            </div>

            {/* Progress bar */}
            <motion.div
              initial={{ width: "100%" }}
              animate={{ width: "0%" }}
              transition={{ duration: 3, ease: "linear" }}
              className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-purple-600 to-pink-600"
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Hook to manage points notifications queue
 */
export function usePointsNotifications() {
  const [queue, setQueue] = useState<Array<{
    id: string;
    points: number;
    title: string;
    message: string;
    emoji: string;
  }>>([]);
  const [current, setCurrent] = useState<{
    points: number;
    title: string;
    message: string;
    emoji: string;
  } | null>(null);

  useEffect(() => {
    if (!current && queue.length > 0) {
      const [next, ...rest] = queue;
      setCurrent(next);
      setQueue(rest);
    }
  }, [current, queue]);

  const addNotification = (
    points: number,
    title: string,
    message: string,
    emoji: string
  ) => {
    setQueue((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        points,
        title,
        message,
        emoji,
      },
    ]);
  };

  const clearCurrent = () => {
    setCurrent(null);
  };

  return {
    currentNotification: current,
    addNotification,
    clearCurrent,
  };
}
