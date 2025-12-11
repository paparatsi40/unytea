"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getCurrentUserId } from "@/lib/auth-utils";
import { checkAndUnlockAchievements } from "./achievements";

/**
 * Create a new post
 */
export async function createPost(formData: FormData) {
  try {
    const userId = await getCurrentUserId();
    
    if (!userId) {
      return { success: false, error: "Not authenticated" };
    }

    const communityId = formData.get("communityId") as string;
    const content = formData.get("content") as string;
    const title = formData.get("title") as string | null;

    if (!communityId || !content) {
      return { success: false, error: "Missing required fields" };
    }

    // Verify user is a member
    const member = await prisma.member.findUnique({
      where: {
        userId_communityId: {
          userId,
          communityId,
        },
      },
    });

    if (!member || member.status !== "ACTIVE") {
      return { success: false, error: "Not a member of this community" };
    }

    // Create post
    const post = await prisma.post.create({
      data: {
        title: title || null,
        content,
        authorId: userId,
        communityId,
        isPublished: true,
        publishedAt: new Date(),
      },
    });

    // Update community post count
    await prisma.community.update({
      where: { id: communityId },
      data: {
        postCount: {
          increment: 1,
        },
      },
    });

    // Check for achievements (don't await to not block response)
    checkAndUnlockAchievements(userId).catch(console.error);

    revalidatePath(`/c/[slug]`);
    return { success: true, post };
  } catch (error) {
    console.error("Error creating post:", error);
    return { success: false, error: "Failed to create post" };
  }
}

/**
 * Delete a post
 */
export async function deletePost(postId: string) {
  try {
    const userId = await getCurrentUserId();
    
    if (!userId) {
      return { success: false, error: "Not authenticated" };
    }

    // Get post
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: {
        community: true,
      },
    });

    if (!post) {
      return { success: false, error: "Post not found" };
    }

    // Check if user is author or community owner/admin
    if (post.authorId !== userId) {
      const member = await prisma.member.findUnique({
        where: {
          userId_communityId: {
            userId,
            communityId: post.communityId,
          },
        },
      });

      if (!member || !["OWNER", "ADMIN", "MODERATOR"].includes(member.role)) {
        return { success: false, error: "Not authorized to delete this post" };
      }
    }

    // Delete post
    await prisma.post.delete({
      where: { id: postId },
    });

    // Update community post count
    await prisma.community.update({
      where: { id: post.communityId },
      data: {
        postCount: {
          decrement: 1,
        },
      },
    });

    revalidatePath(`/c/[slug]`);
    return { success: true };
  } catch (error) {
    console.error("Error deleting post:", error);
    return { success: false, error: "Failed to delete post" };
  }
}

/**
 * Update a post
 */
export async function updatePost(postId: string, formData: FormData) {
  try {
    const userId = await getCurrentUserId();
    
    if (!userId) {
      return { success: false, error: "Not authenticated" };
    }

    const content = formData.get("content") as string;
    const title = formData.get("title") as string | null;

    if (!content) {
      return { success: false, error: "Content is required" };
    }

    // Get post
    const post = await prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      return { success: false, error: "Post not found" };
    }

    // Check if user is author
    if (post.authorId !== userId) {
      return { success: false, error: "Not authorized to edit this post" };
    }

    // Update post
    const updatedPost = await prisma.post.update({
      where: { id: postId },
      data: {
        title: title || null,
        content,
      },
    });

    revalidatePath(`/c/[slug]`);
    return { success: true, post: updatedPost };
  } catch (error) {
    console.error("Error updating post:", error);
    return { success: false, error: "Failed to update post" };
  }
}

/**
 * Toggle post pin
 */
export async function togglePostPin(postId: string) {
  try {
    const userId = await getCurrentUserId();
    
    if (!userId) {
      return { success: false, error: "Not authenticated" };
    }

    const post = await prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      return { success: false, error: "Post not found" };
    }

    // Check if user is owner/admin/moderator
    const member = await prisma.member.findUnique({
      where: {
        userId_communityId: {
          userId,
          communityId: post.communityId,
        },
      },
    });

    if (!member || !["OWNER", "ADMIN", "MODERATOR"].includes(member.role)) {
      return { success: false, error: "Not authorized" };
    }

    // Toggle pin
    const updatedPost = await prisma.post.update({
      where: { id: postId },
      data: {
        isPinned: !post.isPinned,
      },
    });

    revalidatePath(`/c/[slug]`);
    return { success: true, isPinned: updatedPost.isPinned };
  } catch (error) {
    console.error("Error toggling pin:", error);
    return { success: false, error: "Failed to toggle pin" };
  }
}
