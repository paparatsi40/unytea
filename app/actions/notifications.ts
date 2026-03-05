"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getCurrentUserId } from "@/lib/auth-utils";
import { getSocketInstance } from "@/lib/socket-instance";
import { NotificationType } from "@prisma/client";

/**
 * Create a notification
 */
export async function createNotification(data: {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: any;
}) {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        data: data.data || {},
      },
    });

    // Emit WebSocket event for instant delivery
    const io = getSocketInstance();
    if (io) {
      io.to(`user:${data.userId}`).emit("notification:new", notification);
    }

    return { success: true, notification };
  } catch (error) {
    console.error("Failed to create notification:", error);
    return { success: false, error: "Failed to create notification" };
  }
}

/**
 * Helper: Send notification to user
 * Can be called from other server actions
 */
export async function notifyUser(params: {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: any;
}) {
  return createNotification(params);
}

/**
 * Get user's notifications
 */
export async function getUserNotifications(limit = 20) {
  try {
    const userId = await getCurrentUserId();
    
    if (!userId) {
      return { success: false, error: "Not authenticated" };
    }

    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    const unreadCount = await prisma.notification.count({
      where: { userId, isRead: false },
    });

    return {
      success: true,
      notifications,
      unreadCount,
    };
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return { success: false, error: "Failed to fetch notifications" };
  }
}

/**
 * Get unread notification count
 */
export async function getUnreadCount() {
  try {
    const userId = await getCurrentUserId();
    
    if (!userId) {
      return { success: false, count: 0 };
    }

    const count = await prisma.notification.count({
      where: { userId, isRead: false },
    });

    return { success: true, count };
  } catch (error) {
    console.error("Error getting unread count:", error);
    return { success: false, count: 0 };
  }
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(notificationId: string) {
  try {
    const userId = await getCurrentUserId();
    
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    const notification = await prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      return { success: false, error: "Notification not found" };
    }

    await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });

    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("Error marking notification as read:", error);
    return { success: false, error: "Failed to mark as read" };
  }
}

/**
 * Mark all notifications as read
 */
export async function markAllNotificationsAsRead() {
  try {
    const userId = await getCurrentUserId();
    
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });

    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("Error marking all as read:", error);
    return { success: false, error: "Failed to mark all as read" };
  }
}

/**
 * Delete a notification
 */
export async function deleteNotification(notificationId: string) {
  try {
    const userId = await getCurrentUserId();
    
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    const notification = await prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      return { success: false, error: "Notification not found" };
    }

    await prisma.notification.delete({
      where: { id: notificationId },
    });

    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("Error deleting notification:", error);
    return { success: false, error: "Failed to delete notification" };
  }
}

/**
 * Delete all read notifications
 */
export async function deleteAllReadNotifications() {
  try {
    const userId = await getCurrentUserId();
    
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    await prisma.notification.deleteMany({
      where: { userId, isRead: true },
    });

    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("Error deleting read notifications:", error);
    return { success: false, error: "Failed to delete notifications" };
  }
}

// Create notification (internal use)
export async function createNotificationInternal(data: {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  senderId?: string;
}) {
  try {
    await prisma.notification.create({
      data,
    });

    revalidatePath("/dashboard/notifications");
    return { success: true };
  } catch (error) {
    console.error("Error creating notification:", error);
    return { success: false, error: "Failed to create notification" };
  }
}
