import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import type { NotificationType } from "@prisma/client";

/**
 * Notification writes — internal only, deliberately NOT a "use server" module.
 *
 * `createNotification` / `notifyUser` / `createNotificationInternal` were
 * exported from a "use server" file with no authentication and a caller-supplied
 * `userId`, so anyone could write arbitrary title and message text into any
 * user's notification centre. With the notification `link` field that is an
 * in-product phishing channel carrying the platform's own provenance (SEC-02c).
 *
 * Only server-side code that has already authorized the triggering action may
 * create a notification, so these are plain functions imported directly.
 */

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  senderId?: string;
  data?: Record<string, unknown>;
}

export async function createNotification(input: CreateNotificationInput) {
  const { data, ...rest } = input;
  try {
    const notification = await prisma.notification.create({
      data: {
        ...rest,
        data: (data as Prisma.InputJsonValue) ?? Prisma.JsonNull,
      },
    });

    revalidatePath("/dashboard/notifications");
    return { success: true as const, notification };
  } catch (error) {
    console.error("Failed to create notification:", error);
    return { success: false as const, error: "Failed to create notification" };
  }
}

/** Alias kept for call-site readability. */
export const notifyUser = createNotification;
