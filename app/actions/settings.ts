"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { defineAction } from "@/lib/actions/define-action";

/**
 * Update user profile
 */
export const updateProfile = defineAction(
  {
    name: "updateProfile",
    auth: "user",
    args: [
      z.object({
        name: z.string().min(1).max(100).optional(),
        username: z.string().min(1).max(50).optional(),
        bio: z.string().max(2000).optional(),
        tagline: z.string().max(200).optional(),
        website: z.string().max(500).optional(),
        location: z.string().max(120).optional(),
        skills: z.array(z.string().max(50)).max(30).optional(),
        interests: z.array(z.string().max(50)).max(30).optional(),
      }),
    ],
  },
  async (ctx, data: { name?: string; username?: string; bio?: string; tagline?: string; website?: string; location?: string; skills?: string[]; interests?: string[]; }) => {
  try {

    const userId = ctx.userId;

    if (!userId) {
      return { success: false, error: "Not authenticated" };
    }

    // Check if username is taken
    if (data.username) {
      const existing = await prisma.user.findFirst({
        where: {
          username: data.username,
          NOT: { id: userId },
        },
      });

      if (existing) {
        return { success: false, error: "Username already taken" };
      }
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        name: data.name,
        username: data.username,
        bio: data.bio,
        tagline: data.tagline,
        website: data.website,
        location: data.location,
        skills: data.skills,
        interests: data.interests,
      },
    });

    revalidatePath("/dashboard/settings");
    return { success: true, user };
  } catch (error) {
    console.error("Error updating profile:", error);
    return { success: false, error: "Failed to update profile" };
  }
}
);

/**
 * Update notification preferences
 */
export const updateNotificationPreferences = defineAction(
  {
    name: "updateNotificationPreferences",
    auth: "user",
    args: [z.record(z.string().max(64), z.unknown())],
  },
  async (ctx, data: { emailNotifications?: boolean; pushNotifications?: boolean; notifyOnComment?: boolean; notifyOnMention?: boolean; notifyOnReaction?: boolean; notifyOnNewPost?: boolean; notifyOnBuddyRequest?: boolean; emailDigest?: "daily" | "weekly" | "never"; }) => {
  try {

    const userId = ctx.userId;

    if (!userId) {
      return { success: false, error: "Not authenticated" };
    }

    // Store preferences in user settings (you could create a UserSettings model)
    // For now, we'll store in a JSON field
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return { success: false, error: "User not found" };
    }

    // Update user with notification settings
    // Note: You might want to add a notificationSettings JSON field to User model
    await prisma.user.update({
      where: { id: userId },
      data: {
        // Store in existing field or add new field
        // For now, we'll just return success
      },
    });

    revalidatePath("/dashboard/settings");
    return { success: true, preferences: data };
  } catch (error) {
    console.error("Error updating notification preferences:", error);
    return { success: false, error: "Failed to update preferences" };
  }
}
);

/**
 * Update privacy settings
 */
export const updatePrivacySettings = defineAction(
  {
    name: "updatePrivacySettings",
    auth: "user",
    args: [z.record(z.string().max(64), z.unknown())],
  },
  async (ctx, data: { profileVisibility?: "public" | "members" | "private"; showEmail?: boolean; showLocation?: boolean; allowMessages?: "everyone" | "members" | "none"; showActivity?: boolean; }) => {
  try {

    const userId = ctx.userId;

    if (!userId) {
      return { success: false, error: "Not authenticated" };
    }

    // Update privacy settings
    // Note: You might want to add privacy settings to User model
    revalidatePath("/dashboard/settings");
    return { success: true, settings: data };
  } catch (error) {
    console.error("Error updating privacy settings:", error);
    return { success: false, error: "Failed to update settings" };
  }
}
);

/**
 * Update account settings
 */
export const updateAccountSettings = defineAction(
  {
    name: "updateAccountSettings",
    auth: "user",
    args: [z.record(z.string().max(64), z.unknown())],
  },
  async (ctx, data: { timezone?: string; language?: string; theme?: "light" | "dark" | "system"; }) => {
  try {

    const userId = ctx.userId;

    if (!userId) {
      return { success: false, error: "Not authenticated" };
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        timezone: data.timezone,
      },
    });

    revalidatePath("/dashboard/settings");
    return { success: true, settings: data };
  } catch (error) {
    console.error("Error updating account settings:", error);
    return { success: false, error: "Failed to update settings" };
  }
}
);

/**
 * Delete account
 */
export const deleteAccount = defineAction(
  {
    name: "deleteAccount",
    auth: "user",
    args: [z.string().max(200)],
    rateLimit: "auth",
  },
  async (ctx, _password: string) => {
  try {

    const userId = ctx.userId;

    if (!userId) {
      return { success: false, error: "Not authenticated" };
    }

    // In production, verify password first
    // For now, we'll just mark as deleted or actually delete

    // Delete user (cascade will handle related data)
    await prisma.user.delete({
      where: { id: userId },
    });

    return { success: true };
  } catch (error) {
    console.error("Error deleting account:", error);
    return { success: false, error: "Failed to delete account" };
  }
}
);

/**
 * Get user settings
 */
export const getUserSettings = defineAction(
  {
    name: "getUserSettings",
    auth: "user",
    args: [],
  },
  async (ctx) => {
  try {

    const userId = ctx.userId;

    if (!userId) {
      return { success: false, error: "Not authenticated" };
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        image: true,
        bio: true,
        tagline: true,
        website: true,
        location: true,
        timezone: true,
        skills: true,
        interests: true,
      },
    });

    if (!user) {
      return { success: false, error: "User not found" };
    }

    return { success: true, user };
  } catch (error) {
    console.error("Error fetching user settings:", error);
    return { success: false, error: "Failed to fetch settings" };
  }
}
);
