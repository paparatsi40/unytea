"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Smile } from "lucide-react";
import {
  Reaction,
  ReactionType,
  REACTIONS,
  getRandomPosition,
  aggregateReactions,
  getRecentReactions,
} from "@/lib/live-reactions";

interface LiveReactionsProps {
  reactions: Reaction[];
  onReact: (type: ReactionType) => void;
  showPicker?: boolean;
}

export function LiveReactions({
  reactions,
  onReact,
  showPicker = true,
}: LiveReactionsProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [floatingReactions, setFloatingReactions] = useState<Reaction[]>([]);

  // Update floating reactions when new reactions arrive
  useEffect(() => {
    const recent = getRecentReactions(reactions, 5); // Last 5 seconds only for floating
    setFloatingReactions(recent);
  }, [reactions]);

  const handleReact = (type: ReactionType) => {
    onReact(type);
    setPickerOpen(false);
  };

  // Aggregate counts for display
  const aggregated = aggregateReactions(reactions);
  const hasReactions = reactions.length > 0;

  return (
    <div className="relative">
      {/* Floating Reactions Container */}
      <div className="fixed inset-0 pointer-events-none z-40 overflow-hidden">
        <AnimatePresence>
          {floatingReactions.map((reaction) => {
            const position = getRandomPosition();
            return (
              <FloatingReaction
                key={reaction.id}
                emoji={reaction.emoji}
                position={position}
              />
            );
          })}
        </AnimatePresence>
      </div>

      {/* Reaction Controls */}
      {showPicker && (
        <div className="flex items-center gap-2">
          {/* Reaction Picker Button */}
          <div className="relative">
            <button
              onClick={() => setPickerOpen(!pickerOpen)}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-full hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
            >
              <Smile className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                React
              </span>
            </button>

            {/* Picker Dropdown */}
            <AnimatePresence>
              {pickerOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: -10 }}
                  className="absolute bottom-full mb-2 left-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl p-3 min-w-[280px]"
                >
                  <div className="grid grid-cols-4 gap-2">
                    {Object.entries(REACTIONS).map(([type, data]) => (
                      <motion.button
                        key={type}
                        onClick={() => handleReact(type as ReactionType)}
                        whileHover={{ scale: 1.2 }}
                        whileTap={{ scale: 0.9 }}
                        className="flex flex-col items-center gap-1 p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        style={{
                          backgroundColor: `${data.color}10`,
                        }}
                      >
                        <span className="text-3xl">{data.emoji}</span>
                        <span className="text-xs text-gray-600 dark:text-gray-400">
                          {data.label}
                        </span>
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Reaction Counts */}
          {hasReactions && (
            <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-full shadow-sm">
              {Object.entries(aggregated).map(([type, count]) => {
                if (count === 0) return null;
                const data = REACTIONS[type as ReactionType];
                return (
                  <div
                    key={type}
                    className="flex items-center gap-1"
                    title={`${count} ${data.label}`}
                  >
                    <span className="text-lg">{data.emoji}</span>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Individual floating reaction component
 */
interface FloatingReactionProps {
  emoji: string;
  position: {
    x: number;
    rotation: number;
    duration: number;
  };
}

function FloatingReaction({ emoji, position }: FloatingReactionProps) {
  return (
    <motion.div
      initial={{
        x: `${position.x}vw`,
        y: "100vh",
        opacity: 0,
        scale: 0.5,
        rotate: 0,
      }}
      animate={{
        y: "-20vh",
        opacity: [0, 1, 1, 0],
        scale: [0.5, 1.5, 1.2, 0.8],
        rotate: position.rotation,
      }}
      exit={{ opacity: 0 }}
      transition={{
        duration: position.duration,
        ease: "easeOut",
        opacity: {
          times: [0, 0.1, 0.8, 1],
        },
      }}
      className="absolute text-6xl pointer-events-none"
      style={{
        filter: "drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))",
      }}
    >
      {emoji}
    </motion.div>
  );
}

/**
 * Hook for managing reactions state
 */
export function useReactions() {
  const [reactions, setReactions] = useState<Reaction[]>([]);

  const addReaction = (reaction: Reaction) => {
    setReactions((prev) => [...prev, reaction]);
    
    // Auto-cleanup old reactions (older than 5 minutes)
    setTimeout(() => {
      setReactions((prev) => prev.filter((r) => r.id !== reaction.id));
    }, 5 * 60 * 1000);
  };

  const clearReactions = () => {
    setReactions([]);
  };

  return {
    reactions,
    addReaction,
    clearReactions,
  };
}
