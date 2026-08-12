"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { defineAction } from "@/lib/actions/define-action";

/**
 * The caller's own notification centre.
 *
 * Notification *creation* is not here: `createNotification`, `notifyUser` and
 * `createNotificationInternal` took a caller-supplied `userId` with no auth
 * check, so anyone could write arbitrary text into any user's feed (SEC-02c).
 * They now live in lib/notifications.ts as plain functions, callable only by
 * server code that has already authorized whatever triggered the notification.
 *
 * Everything below is scoped to `ctx.userId`, so one account can never read or
 * mutate another's notifications.
 */

const notificationIdSchema = z.string().min(1).max(64);

export const getUserNotifications = defineAction(
  {
    name: "getUserNotifications",
    auth: "user",
    args: [z.number().int().min(1).max(100).default(20)],
  },
  async (ctx, limit) => {
    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: ctx.userId },
        orderBy: { createdAt: "desc" },
        take: limit,
      }),
      prisma.notification.count({ where: { userId: ctx.userId, isRead: false } }),
    ]);

    return { success: true as const, notifications, unreadCount };
  }
);

export const getUnreadCount = defineAction(
  { name: "getUnreadCount", auth: "user", args: [] },
  async (ctx) => {
    const count = await prisma.notification.count({
      where: { userId: ctx.userId, isRead: false },
    });
    return { success: true as const, count };
  }
);

export const markNotificationAsRead = defineAction(
  { name: "markNotificationAsRead", auth: "user", args: [notificationIdSchema] },
  async (ctx, notificationId) => {
    // Scoping the write by userId means a foreign id updates nothing rather
    // than needing a separate ownership read.
    const { count } = await prisma.notification.updateMany({
      where: { id: notificationId, userId: ctx.userId },
      data: { isRead: true },
    });

    if (count === 0) {
      return { success: false as const, error: "Notification not found" };
    }

    revalidatePath("/dashboard");
    return { success: true as const };
  }
);

export const markAllNotificationsAsRead = defineAction(
  { name: "markAllNotificationsAsRead", auth: "user", args: [] },
  async (ctx) => {
    await prisma.notification.updateMany({
      where: { userId: ctx.userId, isRead: false },
      data: { isRead: true },
    });

    revalidatePath("/dashboard");
    return { success: true as const };
  }
);

export const deleteNotification = defineAction(
  { name: "deleteNotification", auth: "user", args: [notificationIdSchema] },
  async (ctx, notificationId) => {
    const { count } = await prisma.notification.deleteMany({
      where: { id: notificationId, userId: ctx.userId },
    });

    if (count === 0) {
      return { success: false as const, error: "Notification not found" };
    }

    revalidatePath("/dashboard");
    return { success: true as const };
  }
);

export const deleteAllReadNotifications = defineAction(
  { name: "deleteAllReadNotifications", auth: "user", args: [] },
  async (ctx) => {
    await prisma.notification.deleteMany({
      where: { userId: ctx.userId, isRead: true },
    });

    revalidatePath("/dashboard");
    return { success: true as const };
  }
);
