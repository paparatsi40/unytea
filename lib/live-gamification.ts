/**
 * Live Session Gamification System
 * 
 * Tracks events during live sessions and awards points automatically
 */

// Points awarded for different actions
export const LIVE_SESSION_POINTS = {
  JOIN_SESSION: 10,           // Join a live session
  ASK_QUESTION: 20,           // Ask a question in Q&A
  ANSWER_QUESTION: 15,        // Answer another participant's question
  SPEAK_ON_STAGE: 50,         // Get on stage (camera + mic)
  COMPLETE_POLL: 5,           // Complete a poll/quiz
  COMPLETE_TASK: 25,          // Complete an assigned task
  SHARE_RESOURCE: 10,         // Share a helpful link/resource
  REACT_TO_CONTENT: 2,        // React with emoji (limited per session)
  STAY_FULL_SESSION: 30,      // Stay for entire session duration
} as const;

// Event types that can be tracked
export type LiveSessionEventType = keyof typeof LIVE_SESSION_POINTS;

// Achievement IDs for live sessions
export const LIVE_SESSION_ACHIEVEMENTS = {
  FIRST_LIVE_SESSION: "first-live-session",           // Join first live session
  ATTENDED_10_SESSIONS: "attended-10-sessions",       // Join 10 sessions
  ATTENDED_50_SESSIONS: "attended-50-sessions",       // Join 50 sessions
  ASKED_10_QUESTIONS: "asked-10-questions",           // Ask 10 questions total
  ANSWERED_20_QUESTIONS: "answered-20-questions",     // Answer 20 questions
  SPOKE_ON_STAGE_5_TIMES: "spoke-on-stage-5-times", // Speak 5 times
  COMPLETED_100_POLLS: "completed-100-polls",         // Complete 100 polls
  FULL_ATTENDANCE_STREAK_5: "full-attendance-5",      // Stay full session 5 times in a row
  EARLY_BIRD: "early-bird",                           // Join 10 sessions in first 5 mins
  ENGAGED_PARTICIPANT: "engaged-participant",         // Earn 500+ points in a single session
} as const;

// Session participation data structure
export interface SessionParticipationData {
  questionsAsked: number;
  questionsAnswered: number;
  pollsCompleted: number;
  tasksCompleted: number;
  resourcesShared: number;
  reactionsGiven: number;
  spokeOnStage: boolean;
  joinedEarly: boolean;     // Joined within 5 mins of start
  stayedFull: boolean;      // Stayed for >=90% of duration
}

// Default participation data
export const DEFAULT_PARTICIPATION_DATA: SessionParticipationData = {
  questionsAsked: 0,
  questionsAnswered: 0,
  pollsCompleted: 0,
  tasksCompleted: 0,
  resourcesShared: 0,
  reactionsGiven: 0,
  spokeOnStage: false,
  joinedEarly: false,
  stayedFull: false,
};

/**
 * Calculate points for a specific event
 */
export function calculateEventPoints(
  eventType: LiveSessionEventType,
  currentData: SessionParticipationData
): number {
  let points = LIVE_SESSION_POINTS[eventType];

  // Apply limits to prevent spam
  if (eventType === "REACT_TO_CONTENT" && currentData.reactionsGiven >= 20) {
    return 0; // Max 20 reactions per session
  }

  // Bonus points for milestones
  if (eventType === "ASK_QUESTION") {
    if (currentData.questionsAsked === 0) {
      points += 10; // First question bonus
    }
  }

  if (eventType === "SPEAK_ON_STAGE" && !currentData.spokeOnStage) {
    points += 20; // First time speaking bonus
  }

  return points;
}

/**
 * Check if user should unlock an achievement based on participation
 */
export function checkLiveSessionAchievements(
  totalSessions: number,
  totalQuestionsAsked: number,
  totalQuestionsAnswered: number,
  totalSpokeOnStage: number,
  totalPollsCompleted: number,
  fullAttendanceStreak: number
): string[] {
  const unlockedAchievements: string[] = [];

  // Session attendance achievements
  if (totalSessions === 1) {
    unlockedAchievements.push(LIVE_SESSION_ACHIEVEMENTS.FIRST_LIVE_SESSION);
  }
  if (totalSessions === 10) {
    unlockedAchievements.push(LIVE_SESSION_ACHIEVEMENTS.ATTENDED_10_SESSIONS);
  }
  if (totalSessions === 50) {
    unlockedAchievements.push(LIVE_SESSION_ACHIEVEMENTS.ATTENDED_50_SESSIONS);
  }

  // Engagement achievements
  if (totalQuestionsAsked === 10) {
    unlockedAchievements.push(LIVE_SESSION_ACHIEVEMENTS.ASKED_10_QUESTIONS);
  }
  if (totalQuestionsAnswered === 20) {
    unlockedAchievements.push(LIVE_SESSION_ACHIEVEMENTS.ANSWERED_20_QUESTIONS);
  }
  if (totalSpokeOnStage === 5) {
    unlockedAchievements.push(LIVE_SESSION_ACHIEVEMENTS.SPOKE_ON_STAGE_5_TIMES);
  }
  if (totalPollsCompleted === 100) {
    unlockedAchievements.push(LIVE_SESSION_ACHIEVEMENTS.COMPLETED_100_POLLS);
  }

  // Streak achievement
  if (fullAttendanceStreak === 5) {
    unlockedAchievements.push(LIVE_SESSION_ACHIEVEMENTS.FULL_ATTENDANCE_STREAK_5);
  }

  return unlockedAchievements;
}

/**
 * Format points notification message
 */
export function formatPointsNotification(
  eventType: LiveSessionEventType,
  points: number
): { title: string; message: string; emoji: string } {
  const messages: Record<LiveSessionEventType, { title: string; message: string; emoji: string }> = {
    JOIN_SESSION: {
      title: "Welcome!",
      message: `You earned ${points} points for joining`,
      emoji: "👋",
    },
    ASK_QUESTION: {
      title: "Great question!",
      message: `+${points} points for asking`,
      emoji: "❓",
    },
    ANSWER_QUESTION: {
      title: "Helpful answer!",
      message: `+${points} points for contributing`,
      emoji: "💡",
    },
    SPEAK_ON_STAGE: {
      title: "Brave move!",
      message: `+${points} points for speaking up`,
      emoji: "🎤",
    },
    COMPLETE_POLL: {
      title: "Poll completed!",
      message: `+${points} points`,
      emoji: "📊",
    },
    COMPLETE_TASK: {
      title: "Task done!",
      message: `+${points} points`,
      emoji: "✅",
    },
    SHARE_RESOURCE: {
      title: "Thanks for sharing!",
      message: `+${points} points`,
      emoji: "🔗",
    },
    REACT_TO_CONTENT: {
      title: "Nice reaction!",
      message: `+${points} points`,
      emoji: "👍",
    },
    STAY_FULL_SESSION: {
      title: "Fully engaged!",
      message: `+${points} points for staying the whole time`,
      emoji: "⭐",
    },
  };

  return messages[eventType];
}
