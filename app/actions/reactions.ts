"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { revalidateLocalizedPath } from "@/lib/cache-invalidation";
import { defineAction } from "@/lib/actions/define-action";
import { communityOfPost } from "@/lib/actions/resolvers";
import { resolveDisplayName } from "@/lib/user-display-name";

export type ReactionType = "LIKE" | "LOVE" | "CELEBRATE" | "FIRE" | "IDEA" | "CLAP";

const reactionTypeSchema = z.enum(["LIKE", "LOVE", "CELEBRATE", "FIRE", "IDEA", "CLAP"]);
const postIdSchema = z.string().min(1).max(64);

/**
 * Toggle the caller's reaction on a post.
 *
 * SEC-05: this previously took `userId` as its first argument and the client
 * passed its own `user.id`, so any caller could react as anybody. Identity now
 * comes from the session and the parameter is gone.
 */
export const toggleReaction = defineAction(
  {
    name: "toggleReaction",
    auth: "member",
    args: [postIdSchema, reactionTypeSchema],
    community: ([postId]) => communityOfPost(postId),
    rateLimit: "create",
  },
  async (ctx, postId, reactionType) => {
    const existingReaction = await prisma.reaction.findFirst({
      where: { userId: ctx.userId, postId, type: reactionType },
    });

    if (existingReaction) {
      await prisma.reaction.delete({ where: { id: existingReaction.id } });
      revalidateLocalizedPath("/c/[slug]", "page");
      return { success: true as const, action: "removed" as const };
    }

    await prisma.reaction.create({
      data: { userId: ctx.userId, postId, type: reactionType },
    });

    revalidateLocalizedPath("/c/[slug]", "page");
    return { success: true as const, action: "added" as const };
  }
);

/**
 * Reaction summary for a post.
 *
 * `currentUserId` was previously a parameter; it is now derived from the
 * session, so `userReacted` cannot be probed for another account.
 */
export const getPostReactions = defineAction(
  {
    name: "getPostReactions",
    auth: "member",
    args: [postIdSchema],
    community: ([postId]) => communityOfPost(postId),
  },
  async (ctx, postId) => {
    const reactions = await prisma.reaction.findMany({
      where: { postId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    const grouped = reactions.reduce(
      (acc, reaction) => {
        if (!acc[reaction.type]) {
          acc[reaction.type] = { count: 0, users: [], userReacted: false };
        }
        acc[reaction.type].count++;
        acc[reaction.type].users.push({
          id: reaction.user.id,
          // Null, not a literal. "Unknown" was English shipped from a server
          // action into a product that renders in three languages, and it beat
          // a perfectly good username sitting one column over.
          name: resolveDisplayName(reaction.user) || null,
          imageUrl: reaction.user.image,
        });
        if (reaction.userId === ctx.userId) {
          acc[reaction.type].userReacted = true;
        }
        return acc;
      },
      {} as Record<
        string,
        {
          count: number;
          users: Array<{ id: string; name: string | null; imageUrl: string | null }>;
          userReacted: boolean;
        }
      >
    );

    return { success: true as const, reactions: grouped, totalCount: reactions.length };
  }
);
