/**
 * Live Reactions System
 * 
 * Handles emoji reactions during live sessions with animations
 */

export type ReactionType = 
  | "thumbsup" 
  | "heart" 
  | "fire" 
  | "clap" 
  | "laugh"
  | "mind_blown"
  | "tada"
  | "rocket";

export interface Reaction {
  id: string;
  type: ReactionType;
  emoji: string;
  userId: string;
  userName: string;
  timestamp: number;
}

export const REACTIONS: Record<ReactionType, { emoji: string; label: string; color: string }> = {
  thumbsup: { emoji: "👍", label: "Thumbs Up", color: "#3B82F6" },
  heart: { emoji: "❤️", label: "Love", color: "#EF4444" },
  fire: { emoji: "🔥", label: "Fire", color: "#F59E0B" },
  clap: { emoji: "👏", label: "Clap", color: "#10B981" },
  laugh: { emoji: "😂", label: "Laugh", color: "#FBBF24" },
  mind_blown: { emoji: "🤯", label: "Mind Blown", color: "#8B5CF6" },
  tada: { emoji: "🎉", label: "Celebrate", color: "#EC4899" },
  rocket: { emoji: "🚀", label: "Rocket", color: "#06B6D4" },
};

/**
 * Create a reaction object
 */
export function createReaction(
  type: ReactionType,
  userId: string,
  userName: string
): Reaction {
  return {
    id: `${userId}-${Date.now()}-${Math.random()}`,
    type,
    emoji: REACTIONS[type].emoji,
    userId,
    userName,
    timestamp: Date.now(),
  };
}

/**
 * Generate random position for floating animation
 */
export function getRandomPosition() {
  return {
    x: Math.random() * 80 + 10, // 10-90% from left
    rotation: Math.random() * 40 - 20, // -20 to 20 degrees
    duration: Math.random() * 2 + 3, // 3-5 seconds
  };
}

/**
 * Aggregate reactions by type for display
 */
export function aggregateReactions(reactions: Reaction[]): Record<ReactionType, number> {
  const aggregated = {} as Record<ReactionType, number>;
  
  Object.keys(REACTIONS).forEach((type) => {
    aggregated[type as ReactionType] = 0;
  });
  
  reactions.forEach((reaction) => {
    aggregated[reaction.type]++;
  });
  
  return aggregated;
}

/**
 * Filter recent reactions (last 30 seconds)
 */
export function getRecentReactions(reactions: Reaction[], seconds: number = 30): Reaction[] {
  const cutoff = Date.now() - seconds * 1000;
  return reactions.filter((r) => r.timestamp > cutoff);
}
