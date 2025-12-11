"use server";

import { moderateContent } from "@/lib/openai";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export interface ModerationResult {
  flagged: boolean;
  categories: string[];
  action: "ALLOW" | "FLAG" | "BLOCK";
  reason?: string;
}

/**
 * Moderate post content using AI
 */
export async function moderatePost(postId: string): Promise<ModerationResult> {
  try {
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: {
        content: true,
        title: true,
      },
    });

    if (!post) {
      throw new Error("Post not found");
    }

    // Moderate content
    const content = `${post.title || ""} ${post.content}`;
    const moderation = await moderateContent(content);

    // Determine action based on categories
    let action: "ALLOW" | "FLAG" | "BLOCK" = "ALLOW";
    let reason = "";

    if (moderation.flagged) {
      // High severity categories = BLOCK
      const blockCategories = ["violence", "sexual", "hate"];
      const hasBlockCategory = moderation.categories.some((cat) =>
        blockCategories.some((block) => cat.includes(block))
      );

      if (hasBlockCategory) {
        action = "BLOCK";
        reason = `Content violates community guidelines: ${moderation.categories.join(", ")}`;

        // Update post status
        await prisma.post.update({
          where: { id: postId },
          data: {
            // You may want to add a status field to Post model
            // status: "BLOCKED"
          },
        });
      } else {
        // Lower severity = FLAG for review
        action = "FLAG";
        reason = `Content flagged for review: ${moderation.categories.join(", ")}`;
      }
    }

    return {
      flagged: moderation.flagged,
      categories: moderation.categories,
      action,
      reason,
    };
  } catch (error) {
    console.error("Moderation error:", error);
    return {
      flagged: false,
      categories: [],
      action: "ALLOW",
    };
  }
}

/**
 * Moderate comment content using AI
 */
export async function moderateComment(commentId: string): Promise<ModerationResult> {
  try {
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      select: {
        content: true,
      },
    });

    if (!comment) {
      throw new Error("Comment not found");
    }

    // Moderate content
    const moderation = await moderateContent(comment.content);

    // Determine action
    let action: "ALLOW" | "FLAG" | "BLOCK" = "ALLOW";
    let reason = "";

    if (moderation.flagged) {
      const blockCategories = ["violence", "sexual", "hate"];
      const hasBlockCategory = moderation.categories.some((cat) =>
        blockCategories.some((block) => cat.includes(block))
      );

      if (hasBlockCategory) {
        action = "BLOCK";
        reason = `Comment violates community guidelines: ${moderation.categories.join(", ")}`;

        // Delete or hide comment
        await prisma.comment.delete({
          where: { id: commentId },
        });
      } else {
        action = "FLAG";
        reason = `Comment flagged for review: ${moderation.categories.join(", ")}`;
      }
    }

    return {
      flagged: moderation.flagged,
      categories: moderation.categories,
      action,
      reason,
    };
  } catch (error) {
    console.error("Moderation error:", error);
    return {
      flagged: false,
      categories: [],
      action: "ALLOW",
    };
  }
}

/**
 * Batch moderate multiple posts
 */
export async function batchModeratePostsInCommunity(communitySlug: string) {
  try {
    const posts = await prisma.post.findMany({
      where: {
        community: { slug: communitySlug },
      },
      select: {
        id: true,
      },
      take: 50, // Moderate last 50 posts
      orderBy: { createdAt: "desc" },
    });

    const results = await Promise.all(
      posts.map((post) => moderatePost(post.id))
    );

    const flagged = results.filter((r) => r.flagged);
    const blocked = results.filter((r) => r.action === "BLOCK");

    return {
      total: posts.length,
      flagged: flagged.length,
      blocked: blocked.length,
      details: results,
    };
  } catch (error) {
    console.error("Batch moderation error:", error);
    throw error;
  }
}

/**
 * Get moderation statistics for a community
 */
export async function getModerationStats(communitySlug: string) {
  try {
    // This is a placeholder - you'd need to store moderation results
    // in the database to have proper statistics
    const community = await prisma.community.findUnique({
      where: { slug: communitySlug },
      select: {
        _count: {
          select: {
            posts: true,
          },
        },
      },
    });

    return {
      totalContent: community?._count.posts || 0,
      // Add more stats once moderation history is stored
    };
  } catch (error) {
    console.error("Stats error:", error);
    return {
      totalContent: 0,
    };
  }
}