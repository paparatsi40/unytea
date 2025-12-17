"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export type ReactionType = "LIKE" | "LOVE" | "CELEBRATE" | "FIRE" | "IDEA" | "CLAP" | "THINKING" | "SUPPORT" | "ROCKET" | "STAR" | "EYES" | "CHECK";

/**
 * Toggle reaction on a post
 */
export async function toggleReaction(
  userId: string,
  postId: string,
  reactionType: ReactionType
) {
  try {
    // Check if reaction already exists
    const existingReaction = await prisma.reaction.findFirst({
      where: {
        userId,
        postId,
        type: reactionType,
      },
    });

    if (existingReaction) {
      // Remove reaction
      await prisma.reaction.delete({
        where: { id: existingReaction.id },
      });

      revalidatePath("/communities/[slug]");
      return { success: true, action: "removed" };
    } else {
      // Add reaction
      await prisma.reaction.create({
        data: {
          userId,
          postId,
          type: reactionType,
        },
      });

      revalidatePath("/communities/[slug]");
      return { success: true, action: "added" };
    }
  } catch (error) {
    console.error("Error toggling reaction:", error);
    return { success: false, error: "Failed to toggle reaction" };
  }
}

/**
 * Get reactions for a post
 */
export async function getPostReactions(postId: string, currentUserId?: string) {
  try {
    const reactions = await prisma.reaction.findMany({
      where: { postId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    });

    // Group by type
    const grouped = reactions.reduce((acc, reaction) => {
      if (!acc[reaction.type]) {
        acc[reaction.type] = {
          count: 0,
          users: [],
          userReacted: false,
        };
      }
      acc[reaction.type].count++;
      acc[reaction.type].users.push({
        id: reaction.user.id,
        name: reaction.user.name || "Unknown",
        imageUrl: reaction.user.image,
      });
      if (currentUserId && reaction.userId === currentUserId) {
        acc[reaction.type].userReacted = true;
      }
      return acc;
    }, {} as Record<string, { count: number; users: Array<{ id: string; name: string; imageUrl: string | null }>; userReacted: boolean }>);

    const totalCount = reactions.length;

    return { success: true, reactions: grouped, totalCount };
  } catch (error) {
    console.error("Error getting reactions:", error);
    return { success: false, error: "Failed to get reactions", reactions: {}, totalCount: 0 };
  }
}
