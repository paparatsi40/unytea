"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getCurrentUserId } from "@/lib/auth-utils";
import { getSocketInstance } from "@/lib/socket-instance";

/**
 * Get or create default channels for a community
 */
export async function getOrCreateDefaultChannels(communityId: string) {
  try {
    // Check if channels exist
    const existingChannels = await prisma.channel.findMany({
      where: { communityId },
      orderBy: { position: "asc" },
    });

    if (existingChannels.length > 0) {
      return { success: true, channels: existingChannels };
    }

    // Create default channels
    const defaultChannels = [
      { name: "General", slug: "general", emoji: "💬", position: 0, description: "General discussions" },
      { name: "Announcements", slug: "announcements", emoji: "📢", position: 1, description: "Important updates" },
      { name: "Questions", slug: "questions", emoji: "❓", position: 2, description: "Ask anything" },
      { name: "Random", slug: "random", emoji: "🎲", position: 3, description: "Off-topic chat" },
    ];

    const channels = await Promise.all(
      defaultChannels.map((channel) =>
        prisma.channel.create({
          data: {
            ...channel,
            communityId,
          },
        })
      )
    );

    return { success: true, channels };
  } catch (error) {
    console.error("Error getting/creating channels:", error);
    return { success: false, error: "Failed to get channels", channels: [] };
  }
}

/**
 * Get channel messages
 */
export async function getChannelMessages(channelId: string, limit = 50) {
  try {
    const messages = await prisma.channelMessage.findMany({
      where: { channelId },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            image: true,
            level: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return { success: true, messages: messages.reverse() };
  } catch (error) {
    console.error("Error getting messages:", error);
    return { success: false, error: "Failed to get messages", messages: [] };
  }
}

/**
 * Send a message to a channel
 */
export async function sendChannelMessage(channelId: string, content: string, attachments?: any) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return { success: false, error: "Not authenticated" };
    }

    if (!content.trim() && !attachments) {
      return { success: false, error: "Message cannot be empty" };
    }

    const message = await prisma.channelMessage.create({
      data: {
        content: content.trim(),
        attachments: attachments || null,
        authorId: userId,
        channelId,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            image: true,
            level: true,
          },
        },
      },
    });

    // Update user points (+1 for sending message)
    await prisma.user.update({
      where: { id: userId },
      data: { points: { increment: 1 } },
    });

    // Emit WebSocket event for real-time update
    const io = getSocketInstance();
    if (io) {
      io.to(`channel:${channelId}`).emit("message:new", message);
    }

    revalidatePath("/c/[slug]/chat/[channel]");

    return { success: true, message };
  } catch (error) {
    console.error("Error sending message:", error);
    return { success: false, error: "Failed to send message" };
  }
}

/**
 * Delete a message (author only)
 */
export async function deleteChannelMessage(messageId: string) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return { success: false, error: "Not authenticated" };
    }

    const message = await prisma.channelMessage.findUnique({
      where: { id: messageId },
      select: { authorId: true, channelId: true },
    });

    if (!message) {
      return { success: false, error: "Message not found" };
    }

    if (message.authorId !== userId) {
      return { success: false, error: "Unauthorized" };
    }

    await prisma.channelMessage.delete({
      where: { id: messageId },
    });

    // Emit WebSocket event for real-time update
    const io = getSocketInstance();
    if (io) {
      io.to(`channel:${message.channelId}`).emit("message:deleted", { messageId });
    }

    revalidatePath("/c/[slug]/chat/[channel]");

    return { success: true };
  } catch (error) {
    console.error("Error deleting message:", error);
    return { success: false, error: "Failed to delete message" };
  }
}

/**
 * Update user presence in channel
 */
export async function updateChannelPresence(channelId: string, isOnline: boolean) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return { success: false, error: "Not authenticated" };
    }

    await prisma.channelMember.upsert({
      where: {
        userId_channelId: {
          userId,
          channelId,
        },
      },
      create: {
        userId,
        channelId,
        isOnline,
        lastSeenAt: new Date(),
      },
      update: {
        isOnline,
        lastSeenAt: new Date(),
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Error updating presence:", error);
    return { success: false, error: "Failed to update presence" };
  }
}

/**
 * Set typing status
 */
export async function setTypingStatus(channelId: string, isTyping: boolean) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return { success: false, error: "Not authenticated" };
    }

    await prisma.channelMember.upsert({
      where: {
        userId_channelId: {
          userId,
          channelId,
        },
      },
      create: {
        userId,
        channelId,
        isTyping,
        lastTypingAt: isTyping ? new Date() : null,
      },
      update: {
        isTyping,
        lastTypingAt: isTyping ? new Date() : null,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Error setting typing status:", error);
    return { success: false, error: "Failed to set typing status" };
  }
}

/**
 * Get online members in channel
 */
export async function getChannelOnlineMembers(channelId: string) {
  try {
    // Consider online if seen in last 10 seconds
    const onlineThreshold = new Date(Date.now() - 10000);
    
    const members = await prisma.channelMember.findMany({
      where: {
        channelId,
        lastSeenAt: {
          gte: onlineThreshold,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
            level: true,
          },
        },
      },
    });

    return { success: true, members };
  } catch (error) {
    console.error("Error getting online members:", error);
    return { success: false, error: "Failed to get online members", members: [] };
  }
}

/**
 * Get typing users in channel
 */
export async function getTypingUsers(channelId: string) {
  try {
    const typingMembers = await prisma.channelMember.findMany({
      where: {
        channelId,
        isTyping: true,
        lastTypingAt: {
          gte: new Date(Date.now() - 5000), // Last 5 seconds
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return { success: true, users: typingMembers.map(m => m.user) };
  } catch (error) {
    console.error("Error getting typing users:", error);
    return { success: false, error: "Failed to get typing users", users: [] };
  }
}
