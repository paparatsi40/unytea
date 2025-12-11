export type AchievementType =
  | "FIRST_POST"
  | "FIRST_COMMENT"
  | "FIRST_MESSAGE"
  | "FIRST_BUDDY"
  | "POST_STREAK_7"
  | "POST_STREAK_30"
  | "CHAT_MASTER_100"
  | "CHAT_MASTER_500"
  | "LEVEL_UP_5"
  | "LEVEL_UP_10"
  | "LEVEL_UP_20"
  | "POINTS_100"
  | "POINTS_500"
  | "POINTS_1000"
  | "COMMUNITY_CREATOR"
  | "COMMUNITY_MEMBER_10"
  | "HELPFUL_10"
  | "HELPFUL_50"
  | "SOCIAL_BUTTERFLY"
  | "EARLY_BIRD"
  | "NIGHT_OWL"
  | "CONVERSATION_STARTER"
  | "QUESTION_MASTER"
  | "BUDDY_GOALS_5"
  | "BUDDY_GOALS_20"
  | "PERFECT_ATTENDANCE";

export interface AchievementDefinition {
  id: AchievementType;
  name: string;
  description: string;
  icon: string;
  points: number;
  category: "social" | "content" | "engagement" | "milestone" | "special";
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary";
  criteria: {
    type: string;
    value?: number;
    condition?: string;
  };
}

export const ACHIEVEMENTS: Record<AchievementType, AchievementDefinition> = {
  // Getting Started
  FIRST_POST: {
    id: "FIRST_POST",
    name: "First Post",
    description: "Create your first post in any community",
    icon: "📝",
    points: 10,
    category: "content",
    rarity: "common",
    criteria: { type: "post_count", value: 1 },
  },
  FIRST_COMMENT: {
    id: "FIRST_COMMENT",
    name: "First Comment",
    description: "Leave your first comment",
    icon: "💬",
    points: 5,
    category: "social",
    rarity: "common",
    criteria: { type: "comment_count", value: 1 },
  },
  FIRST_MESSAGE: {
    id: "FIRST_MESSAGE",
    name: "First Message",
    description: "Send your first chat message",
    icon: "✉️",
    points: 5,
    category: "social",
    rarity: "common",
    criteria: { type: "message_count", value: 1 },
  },
  FIRST_BUDDY: {
    id: "FIRST_BUDDY",
    name: "Accountability Partner",
    description: "Match with your first buddy",
    icon: "🤝",
    points: 20,
    category: "special",
    rarity: "uncommon",
    criteria: { type: "buddy_count", value: 1 },
  },

  // Streaks
  POST_STREAK_7: {
    id: "POST_STREAK_7",
    name: "Week Warrior",
    description: "Post every day for 7 days",
    icon: "🔥",
    points: 50,
    category: "engagement",
    rarity: "uncommon",
    criteria: { type: "post_streak", value: 7 },
  },
  POST_STREAK_30: {
    id: "POST_STREAK_30",
    name: "Monthly Master",
    description: "Post every day for 30 days",
    icon: "🔥🔥",
    points: 200,
    category: "engagement",
    rarity: "rare",
    criteria: { type: "post_streak", value: 30 },
  },

  // Chat Milestones
  CHAT_MASTER_100: {
    id: "CHAT_MASTER_100",
    name: "Chat Master",
    description: "Send 100 chat messages",
    icon: "💬",
    points: 30,
    category: "social",
    rarity: "common",
    criteria: { type: "message_count", value: 100 },
  },
  CHAT_MASTER_500: {
    id: "CHAT_MASTER_500",
    name: "Chat Legend",
    description: "Send 500 chat messages",
    icon: "💬✨",
    points: 100,
    category: "social",
    rarity: "uncommon",
    criteria: { type: "message_count", value: 500 },
  },

  // Levels
  LEVEL_UP_5: {
    id: "LEVEL_UP_5",
    name: "Rising Star",
    description: "Reach Level 5",
    icon: "⭐",
    points: 50,
    category: "milestone",
    rarity: "common",
    criteria: { type: "level", value: 5 },
  },
  LEVEL_UP_10: {
    id: "LEVEL_UP_10",
    name: "Expert",
    description: "Reach Level 10",
    icon: "🌟",
    points: 100,
    category: "milestone",
    rarity: "uncommon",
    criteria: { type: "level", value: 10 },
  },
  LEVEL_UP_20: {
    id: "LEVEL_UP_20",
    name: "Master",
    description: "Reach Level 20",
    icon: "💫",
    points: 250,
    category: "milestone",
    rarity: "rare",
    criteria: { type: "level", value: 20 },
  },

  // Points
  POINTS_100: {
    id: "POINTS_100",
    name: "Century Club",
    description: "Earn 100 points",
    icon: "💯",
    points: 10,
    category: "milestone",
    rarity: "common",
    criteria: { type: "points", value: 100 },
  },
  POINTS_500: {
    id: "POINTS_500",
    name: "Point Collector",
    description: "Earn 500 points",
    icon: "💰",
    points: 50,
    category: "milestone",
    rarity: "uncommon",
    criteria: { type: "points", value: 500 },
  },
  POINTS_1000: {
    id: "POINTS_1000",
    name: "Point Master",
    description: "Earn 1000 points",
    icon: "👑",
    points: 100,
    category: "milestone",
    rarity: "rare",
    criteria: { type: "points", value: 1000 },
  },

  // Community
  COMMUNITY_CREATOR: {
    id: "COMMUNITY_CREATOR",
    name: "Community Builder",
    description: "Create your own community",
    icon: "🏗️",
    points: 100,
    category: "special",
    rarity: "uncommon",
    criteria: { type: "owned_communities", value: 1 },
  },
  COMMUNITY_MEMBER_10: {
    id: "COMMUNITY_MEMBER_10",
    name: "Joiner",
    description: "Join 10 different communities",
    icon: "🌐",
    points: 50,
    category: "social",
    rarity: "common",
    criteria: { type: "community_memberships", value: 10 },
  },

  // Helping
  HELPFUL_10: {
    id: "HELPFUL_10",
    name: "Helper",
    description: "Receive 10 thank you reactions",
    icon: "🙏",
    points: 30,
    category: "social",
    rarity: "common",
    criteria: { type: "helpful_reactions", value: 10 },
  },
  HELPFUL_50: {
    id: "HELPFUL_50",
    name: "Super Helper",
    description: "Receive 50 thank you reactions",
    icon: "🙏✨",
    points: 100,
    category: "social",
    rarity: "uncommon",
    criteria: { type: "helpful_reactions", value: 50 },
  },

  // Social
  SOCIAL_BUTTERFLY: {
    id: "SOCIAL_BUTTERFLY",
    name: "Social Butterfly",
    description: "Message 20 different people",
    icon: "🦋",
    points: 40,
    category: "social",
    rarity: "common",
    criteria: { type: "unique_conversations", value: 20 },
  },
  CONVERSATION_STARTER: {
    id: "CONVERSATION_STARTER",
    name: "Conversation Starter",
    description: "Start 10 new conversations",
    icon: "💭",
    points: 30,
    category: "social",
    rarity: "common",
    criteria: { type: "conversations_started", value: 10 },
  },
  QUESTION_MASTER: {
    id: "QUESTION_MASTER",
    name: "Curious Mind",
    description: "Ask 20 questions",
    icon: "❓",
    points: 40,
    category: "content",
    rarity: "common",
    criteria: { type: "question_posts", value: 20 },
  },

  // Time-based
  EARLY_BIRD: {
    id: "EARLY_BIRD",
    name: "Early Bird",
    description: "Post before 6 AM 10 times",
    icon: "🌅",
    points: 30,
    category: "special",
    rarity: "uncommon",
    criteria: { type: "early_morning_posts", value: 10 },
  },
  NIGHT_OWL: {
    id: "NIGHT_OWL",
    name: "Night Owl",
    description: "Post after 11 PM 10 times",
    icon: "🦉",
    points: 30,
    category: "special",
    rarity: "uncommon",
    criteria: { type: "late_night_posts", value: 10 },
  },

  // Buddy System
  BUDDY_GOALS_5: {
    id: "BUDDY_GOALS_5",
    name: "Goal Achiever",
    description: "Complete 5 buddy goals",
    icon: "🎯",
    points: 50,
    category: "engagement",
    rarity: "uncommon",
    criteria: { type: "buddy_goals_completed", value: 5 },
  },
  BUDDY_GOALS_20: {
    id: "BUDDY_GOALS_20",
    name: "Goal Master",
    description: "Complete 20 buddy goals",
    icon: "🎯✨",
    points: 150,
    category: "engagement",
    rarity: "rare",
    criteria: { type: "buddy_goals_completed", value: 20 },
  },
  PERFECT_ATTENDANCE: {
    id: "PERFECT_ATTENDANCE",
    name: "Perfect Attendance",
    description: "Check in every day for 30 days",
    icon: "📅",
    points: 200,
    category: "engagement",
    rarity: "rare",
    criteria: { type: "check_in_streak", value: 30 },
  },
};

export const ACHIEVEMENT_CATEGORIES = {
  social: { name: "Social", color: "blue", icon: "👥" },
  content: { name: "Content", color: "purple", icon: "📝" },
  engagement: { name: "Engagement", color: "green", icon: "⚡" },
  milestone: { name: "Milestones", color: "yellow", icon: "🏆" },
  special: { name: "Special", color: "pink", icon: "✨" },
};

export const RARITY_CONFIG = {
  common: { name: "Common", color: "gray", glow: "none" },
  uncommon: { name: "Uncommon", color: "green", glow: "green" },
  rare: { name: "Rare", color: "blue", glow: "blue" },
  epic: { name: "Epic", color: "purple", glow: "purple" },
  legendary: { name: "Legendary", color: "orange", glow: "orange" },
};
