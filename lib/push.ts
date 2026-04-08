import webpush from "web-push";
import { prisma } from "@/lib/prisma";

// ── VAPID Configuration ──────────────────────────────────────────────
// Generate keys: npx web-push generate-vapid-keys
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:noreply@unytea.com";

let vapidConfigured = false;

function ensureVapid() {
  if (vapidConfigured) return true;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.warn("[push] VAPID keys not configured — push notifications disabled");
    return false;
  }
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  vapidConfigured = true;
  return true;
}

// ── Notification Payload Types ───────────────────────────────────────
export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  tag?: string;
  data?: Record<string, unknown>;
}

// ── Send Push to a Single User ───────────────────────────────────────
export async function sendPushToUser(
  userId: string,
  payload: PushPayload
): Promise<{ sent: number; failed: number }> {
  if (!ensureVapid()) return { sent: 0, failed: 0 };

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId },
  });

  let sent = 0;
  let failed = 0;

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        JSON.stringify({
          title: payload.title,
          body: payload.body,
          icon: payload.icon || "/icons/icon-192x192.png",
          badge: payload.badge || "/icons/icon-72x72.png",
          data: {
            url: payload.url || "/dashboard",
            ...payload.data,
          },
          tag: payload.tag,
        })
      );
      sent++;
    } catch (error: unknown) {
      const statusCode = (error as { statusCode?: number }).statusCode;
      // 410 Gone or 404 Not Found means subscription expired
      if (statusCode === 410 || statusCode === 404) {
        await prisma.pushSubscription
          .delete({ where: { id: sub.id } })
          .catch(() => {});
      }
      failed++;
    }
  }

  return { sent, failed };
}

// ── Send Push to Multiple Users ──────────────────────────────────────
export async function sendPushToUsers(
  userIds: string[],
  payload: PushPayload
): Promise<{ sent: number; failed: number }> {
  let totalSent = 0;
  let totalFailed = 0;

  // Process in batches of 50
  for (let i = 0; i < userIds.length; i += 50) {
    const batch = userIds.slice(i, i + 50);
    const results = await Promise.all(
      batch.map((uid) => sendPushToUser(uid, payload))
    );
    for (const r of results) {
      totalSent += r.sent;
      totalFailed += r.failed;
    }
  }

  return { sent: totalSent, failed: totalFailed };
}

// ── Send to Community Members ────────────────────────────────────────
export async function sendPushToCommunity(
  communityId: string,
  payload: PushPayload,
  excludeUserId?: string
): Promise<{ sent: number; failed: number }> {
  const members = await prisma.member.findMany({
    where: {
      communityId,
      status: "ACTIVE",
      ...(excludeUserId ? { userId: { not: excludeUserId } } : {}),
    },
    select: { userId: true },
  });

  return sendPushToUsers(
    members.map((m: { userId: string }) => m.userId),
    payload
  );
}

// ── Notification Templates ───────────────────────────────────────────
export const pushTemplates = {
  sessionStarting: (sessionTitle: string, communityName: string, sessionId: string): PushPayload => ({
    title: "Session starting soon!",
    body: `${sessionTitle} in ${communityName} is starting in 10 minutes`,
    url: `/dashboard/sessions/${sessionId}`,
    tag: `session-${sessionId}`,
  }),

  sessionLive: (sessionTitle: string, communityName: string, sessionId: string): PushPayload => ({
    title: "Session is LIVE!",
    body: `${sessionTitle} in ${communityName} has started. Join now!`,
    url: `/dashboard/sessions/${sessionId}`,
    tag: `session-live-${sessionId}`,
  }),

  newPost: (authorName: string, communityName: string, postId: string): PushPayload => ({
    title: `New post in ${communityName}`,
    body: `${authorName} shared a new post`,
    url: `/dashboard/communities`,
    tag: `post-${postId}`,
  }),

  buddyCheckIn: (buddyName: string): PushPayload => ({
    title: "Buddy check-in reminder",
    body: `${buddyName} is waiting for your check-in today`,
    url: "/dashboard/communities",
    tag: "buddy-checkin",
  }),

  achievementUnlocked: (achievementTitle: string): PushPayload => ({
    title: "Achievement Unlocked! 🏆",
    body: achievementTitle,
    url: "/dashboard",
    tag: "achievement",
  }),

  courseCompleted: (courseName: string): PushPayload => ({
    title: "Course Completed! 🎓",
    body: `Congratulations on completing ${courseName}`,
    url: "/dashboard/courses",
    tag: "course-complete",
  }),

  streakReminder: (currentStreak: number): PushPayload => ({
    title: `Keep your ${currentStreak}-day streak! 🔥`,
    body: "Don't forget to be active today to maintain your streak",
    url: "/dashboard",
    tag: "streak-reminder",
  }),
};
