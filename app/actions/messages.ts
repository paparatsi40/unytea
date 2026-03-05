"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getCurrentUserId } from "@/lib/auth-utils";
import { checkAndUnlockAchievements } from "./achievements";

/**
 * Get or create a conversation between two users
 */
export async function getOrCreateConversation(otherUserId: string) {
  try {
    const currentUserId = await getCurrentUserId();
    if (!currentUserId) {
      return { success: false, error: "Not authenticated" };
    }

    if (currentUserId === otherUserId) {
      return { success: false, error: "Cannot message yourself" };
    }

    // Sort user IDs to ensure consistent conversation lookup
    const [participant1Id, participant2Id] = [currentUserId, otherUserId].sort();

    // Try to find existing conversation
    let conversation = await prisma.conversation.findFirst({
      where: {
        participant1Id,
        participant2Id,
      },
      include: {
        participant1: {
          select: {
            id: true,
            name: true,
            firstName: true,
            lastName: true,
            username: true,
            image: true,
          },
        },
        participant2: {
          select: {
            id: true,
            name: true,
            firstName: true,
            lastName: true,
            username: true,
            image: true,
          },
        },
        messages: {
          take: 50,
          orderBy: { createdAt: "desc" },
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                firstName: true,
                lastName: true,
                username: true,
                image: true,
              },
            },
          },
        },
      },
    });

    // Create conversation if it doesn't exist
    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          participant1Id,
          participant2Id,
          lastMessageAt: new Date(),
        },
        include: {
          participant1: {
            select: {
              id: true,
              name: true,
              firstName: true,
              lastName: true,
              username: true,
              image: true,
            },
          },
          participant2: {
            select: {
              id: true,
              name: true,
              firstName: true,
              lastName: true,
              username: true,
              image: true,
            },
          },
          messages: {
            include: {
              sender: {
                select: {
                  id: true,
                  name: true,
                  firstName: true,
                  lastName: true,
                  username: true,
                  image: true,
                },
              },
            },
          },
        },
      });
    }

    return { success: true, conversation };
  } catch (error) {
    console.error("Error getting/creating conversation:", error);
    return { success: false, error: "Failed to get conversation" };
  }
}

/**
 * Send a message in a conversation
 */
export async function sendMessage(
  conversationId: string,
  content: string,
  attachments?: string[]
) {
  try {
    const currentUserId = await getCurrentUserId();
    if (!currentUserId) {
      return { success: false, error: "Not authenticated" };
    }

    // Verify user is part of conversation
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        OR: [
          { participant1Id: currentUserId },
          { participant2Id: currentUserId },
        ],
      },
    });

    if (!conversation) {
      return { success: false, error: "Conversation not found" };
    }

    // Check if conversation is blocked
    if (conversation.isBlocked) {
      return { success: false, error: "This conversation is blocked" };
    }

    // Determine receiver
    const receiverId = conversation.participant1Id === currentUserId 
      ? conversation.participant2Id 
      : conversation.participant1Id;

    // Create message
    const message = await prisma.directMessage.create({
      data: {
        content,
        senderId: currentUserId,
        receiverId,
        conversationId,
        attachments: attachments ? JSON.stringify(attachments) : undefined,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            firstName: true,
            lastName: true,
            username: true,
            image: true,
          },
        },
      },
    });

    // Update conversation's lastMessageAt
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
    });

    // Create notification for receiver
    await prisma.notification.create({
      data: {
        userId: receiverId,
        type: "MESSAGE",
        title: "New message",
        message: `${message.sender.firstName || message.sender.name} sent you a message`,
        data: {
          conversationId,
          messageId: message.id,
          senderId: currentUserId,
        },
      },
    });

    // Check for achievements (don't await)
    checkAndUnlockAchievements(currentUserId).catch(console.error);

    revalidatePath("/dashboard/messages");
    return { success: true, message };
  } catch (error) {
    console.error("Error sending message:", error);
    return { success: false, error: "Failed to send message" };
  }
}

/**
 * Mark messages as read
 */
export async function markMessagesAsRead(conversationId: string) {
  try {
    const currentUserId = await getCurrentUserId();
    if (!currentUserId) {
      return { success: false, error: "Not authenticated" };
    }

    await prisma.directMessage.updateMany({
      where: {
        conversationId,
        receiverId: currentUserId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    revalidatePath("/dashboard/messages");
    return { success: true };
  } catch (error) {
    console.error("Error marking messages as read:", error);
    return { success: false, error: "Failed to mark messages as read" };
  }
}

/**
 * Get all conversations for current user
 */
export async function getUserConversations() {
  try {
    const currentUserId = await getCurrentUserId();
    if (!currentUserId) {
      return { success: false, error: "Not authenticated" };
    }

    const conversations = await prisma.conversation.findMany({
      where: {
        OR: [
          { participant1Id: currentUserId },
          { participant2Id: currentUserId },
        ],
      },
      include: {
        participant1: {
          select: {
            id: true,
            name: true,
            firstName: true,
            lastName: true,
            username: true,
            image: true,
          },
        },
        participant2: {
          select: {
            id: true,
            name: true,
            firstName: true,
            lastName: true,
            username: true,
            image: true,
          },
        },
        messages: {
          take: 1,
          orderBy: { createdAt: "desc" },
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                firstName: true,
                lastName: true,
                username: true,
                image: true,
              },
            },
          },
        },
        _count: {
          select: {
            messages: {
              where: {
                receiverId: currentUserId,
                isRead: false,
              },
            },
          },
        },
      },
      orderBy: {
        lastMessageAt: "desc",
      },
    });

    return { success: true, conversations };
  } catch (error) {
    console.error("Error getting conversations:", error);
    return { success: false, error: "Failed to get conversations" };
  }
}

/**
 * Get messages for a conversation
 */
export async function getConversationMessages(conversationId: string, cursor?: string) {
  try {
    const currentUserId = await getCurrentUserId();
    if (!currentUserId) {
      return { success: false, error: "Not authenticated" };
    }

    // Verify user is part of conversation
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        OR: [
          { participant1Id: currentUserId },
          { participant2Id: currentUserId },
        ],
      },
    });

    if (!conversation) {
      return { success: false, error: "Conversation not found" };
    }

    const messages = await prisma.directMessage.findMany({
      where: {
        conversationId,
      },
      take: 50,
      ...(cursor && {
        skip: 1,
        cursor: { id: cursor },
      }),
      orderBy: {
        createdAt: "desc",
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            firstName: true,
            lastName: true,
            username: true,
            image: true,
          },
        },
      },
    });

    return { 
      success: true, 
      messages: messages.reverse(), // Return in chronological order
      hasMore: messages.length === 50,
      nextCursor: messages.length > 0 ? messages[0].id : null,
    };
  } catch (error) {
    console.error("Error getting messages:", error);
    return { success: false, error: "Failed to get messages" };
  }
}

/**
 * Delete a message
 */
export async function deleteMessage(messageId: string) {
  try {
    const currentUserId = await getCurrentUserId();
    if (!currentUserId) {
      return { success: false, error: "Not authenticated" };
    }

    // Verify user is the sender
    const message = await prisma.directMessage.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      return { success: false, error: "Message not found" };
    }

    if (message.senderId !== currentUserId) {
      return { success: false, error: "Not authorized to delete this message" };
    }

    await prisma.directMessage.delete({
      where: { id: messageId },
    });

    revalidatePath("/dashboard/messages");
    return { success: true };
  } catch (error) {
    console.error("Error deleting message:", error);
    return { success: false, error: "Failed to delete message" };
  }
}

/**
 * Block/unblock a conversation
 */
export async function toggleBlockConversation(conversationId: string) {
  try {
    const currentUserId = await getCurrentUserId();
    if (!currentUserId) {
      return { success: false, error: "Not authenticated" };
    }

    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        OR: [
          { participant1Id: currentUserId },
          { participant2Id: currentUserId },
        ],
      },
    });

    if (!conversation) {
      return { success: false, error: "Conversation not found" };
    }

    const isCurrentlyBlocked = conversation.isBlocked && conversation.blockedBy === currentUserId;

    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        isBlocked: !isCurrentlyBlocked,
        blockedBy: !isCurrentlyBlocked ? currentUserId : null,
      },
    });

    revalidatePath("/dashboard/messages");
    return { success: true, isBlocked: !isCurrentlyBlocked };
  } catch (error) {
    console.error("Error toggling block:", error);
    return { success: false, error: "Failed to update block status" };
  }
}
