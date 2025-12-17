import { prisma } from "@/lib/prisma";
import { NotificationType } from "@prisma/client";

type CreateNotificationParams = {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: any;
};

/**
 * Create a notification for a user
 */
export async function createNotification({
  userId,
  type,
  title,
  message,
  data,
}: CreateNotificationParams) {
  try {
    // Check user's notification preferences
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        pushNotifications: true,
        sessionReminders: true,
        sessionStarted: true,
        newPostNotifications: true,
        newMemberNotifications: true,
        newMessageNotifications: true,
      },
    });

    if (!user) return null;

    // Check if user wants this type of notification
    let shouldNotify = user.pushNotifications; // Global push setting

    switch (type) {
      case "SESSION_REMINDER":
        shouldNotify = shouldNotify && user.sessionReminders;
        break;
      case "SESSION_CANCELLED":
        shouldNotify = shouldNotify && user.sessionStarted;
        break;
      case "NEW_POST":
        shouldNotify = shouldNotify && user.newPostNotifications;
        break;
      case "NEW_MEMBER":
        shouldNotify = shouldNotify && user.newMemberNotifications;
        break;
      case "MESSAGE":
        shouldNotify = shouldNotify && user.newMessageNotifications;
        break;
      default:
        shouldNotify = true; // Always notify for other types (mentions, reactions, etc.)
    }

    if (!shouldNotify) {
      return null; // User has disabled this notification type
    }

    // Create notification
    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        data: data || {},
      },
    });

    return notification;
  } catch (error) {
    console.error("Error creating notification:", error);
    return null;
  }
}

/**
 * Notify all participants when a session starts
 */
export async function notifySessionStarted(sessionId: string) {
  try {
    const session = await prisma.mentorSession.findUnique({
      where: { id: sessionId },
      include: {
        mentor: { select: { id: true, name: true } },
        mentee: { select: { id: true, name: true } },
        community: { select: { id: true, name: true } },
        participations: { 
          select: { userId: true },
          where: { leftAt: null } // Only active participants
        },
      },
    });

    if (!session) return;

    // Get all participants (mentor, mentee, and community members)
    const participantIds = new Set<string>();
    
    // Add mentor and mentee
    participantIds.add(session.mentorId);
    participantIds.add(session.menteeId);
    
    // Add all participations
    session.participations.forEach(p => participantIds.add(p.userId));

    // If it's a community session, notify all members
    if (session.communityId) {
      const members = await prisma.member.findMany({
        where: { 
          communityId: session.communityId,
          status: "ACTIVE"
        },
        select: { userId: true },
      });
      members.forEach(m => participantIds.add(m.userId));
    }

    // Create notifications for all participants
    const notifications = Array.from(participantIds).map(userId =>
      createNotification({
        userId,
        type: "SESSION_REMINDER", // Using SESSION_REMINDER as closest type
        title: "🎥 Session Started!",
        message: `"${session.title}" has started. Join now!`,
        data: {
          sessionId: session.id,
          sessionTitle: session.title,
          mentorName: session.mentor.name,
          communityName: session.community?.name,
          action: "join_session",
        },
      })
    );

    await Promise.all(notifications);

    console.log(`✅ Notified ${participantIds.size} users about session start`);
  } catch (error) {
    console.error("Error notifying session started:", error);
  }
}

/**
 * Send reminder 15 minutes before session
 */
export async function sendSessionReminder(sessionId: string) {
  try {
    const session = await prisma.mentorSession.findUnique({
      where: { id: sessionId },
      include: {
        mentor: { select: { id: true, name: true } },
        mentee: { select: { id: true, name: true } },
        community: { select: { id: true, name: true } },
      },
    });

    if (!session) return;

    const participantIds = new Set<string>([
      session.mentorId,
      session.menteeId,
    ]);

    // If it's a community session, notify all members
    if (session.communityId) {
      const members = await prisma.member.findMany({
        where: { 
          communityId: session.communityId,
          status: "ACTIVE"
        },
        select: { userId: true },
      });
      members.forEach(m => participantIds.add(m.userId));
    }

    // Create reminder notifications
    const notifications = Array.from(participantIds).map(userId =>
      createNotification({
        userId,
        type: "SESSION_REMINDER",
        title: "⏰ Session Starting Soon!",
        message: `"${session.title}" starts in 15 minutes. Get ready!`,
        data: {
          sessionId: session.id,
          sessionTitle: session.title,
          scheduledAt: session.scheduledAt,
          communityName: session.community?.name,
          action: "prepare_session",
        },
      })
    );

    await Promise.all(notifications);

    console.log(`✅ Sent reminders to ${participantIds.size} users`);
  } catch (error) {
    console.error("Error sending session reminder:", error);
  }
}

/**
 * Get upcoming sessions that need reminders (15 minutes before)
 */
export async function getSessionsNeedingReminders() {
  const now = new Date();
  const in15Minutes = new Date(now.getTime() + 15 * 60 * 1000);
  const in16Minutes = new Date(now.getTime() + 16 * 60 * 1000);

  try {
    const sessions = await prisma.mentorSession.findMany({
      where: {
        status: "SCHEDULED",
        scheduledAt: {
          gte: in15Minutes,
          lte: in16Minutes,
        },
      },
      select: { id: true, title: true, scheduledAt: true },
    });

    return sessions;
  } catch (error) {
    console.error("Error getting sessions needing reminders:", error);
    return [];
  }
}