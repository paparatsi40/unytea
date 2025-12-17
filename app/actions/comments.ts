"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getCurrentUserId } from "@/lib/auth-utils";
import { checkAndUnlockAchievements } from "./achievements";

export async function createComment(postId: string, content: string, parentId?: string) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    if (!content || content.trim().length === 0) {
      return { success: false, error: "Comment content is required" };
    }

    const comment = await prisma.comment.create({
      data: {
        content: content.trim(),
        postId,
        authorId: userId,
        parentId: parentId || null,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        _count: {
          select: {
            replies: true,
            reactions: true,
          },
        },
      },
    });

    // Check for achievements (don't await)
    checkAndUnlockAchievements(userId).catch(console.error);

    revalidatePath(`/communities/[slug]`);

    return { success: true, comment };
  } catch (error) {
    console.error("Error creating comment:", error);
    return { success: false, error: "Failed to create comment" };
  }
}

export async function getPostComments(postId: string) {
  try {
    const comments = await prisma.comment.findMany({
      where: {
        postId,
        parentId: null, // Only get top-level comments
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        replies: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
            _count: {
              select: {
                reactions: true,
              },
            },
          },
          orderBy: {
            createdAt: "asc",
          },
        },
        _count: {
          select: {
            replies: true,
            reactions: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return { success: true, comments };
  } catch (error) {
    console.error("Error fetching comments:", error);
    return { success: false, error: "Failed to fetch comments", comments: [] };
  }
}

export async function deleteComment(commentId: string) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    // Check if user is the author
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      select: { authorId: true },
    });

    if (!comment) {
      return { success: false, error: "Comment not found" };
    }

    if (comment.authorId !== userId) {
      return { success: false, error: "Unauthorized to delete this comment" };
    }

    await prisma.comment.delete({
      where: { id: commentId },
    });

    revalidatePath(`/communities/[slug]`);

    return { success: true };
  } catch (error) {
    console.error("Error deleting comment:", error);
    return { success: false, error: "Failed to delete comment" };
  }
}
