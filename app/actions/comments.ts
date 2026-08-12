"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { revalidateLocalizedPath } from "@/lib/cache-invalidation";
import { defineAction } from "@/lib/actions/define-action";
import { communityOfComment, communityOfPost } from "@/lib/actions/resolvers";

const postIdSchema = z.string().min(1).max(64);
const commentIdSchema = z.string().min(1).max(64);

export const createComment = defineAction(
  {
    name: "createComment",
    auth: "member",
    args: [postIdSchema, z.string().max(10_000), postIdSchema.optional()],
    community: ([postId]) => communityOfPost(postId),
    rateLimit: "create",
  },
  async (ctx, postId, content, parentId) => {
    const userId = ctx.userId;
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

    revalidateLocalizedPath("/c/[slug]", "page");

    return { success: true as const, comment };
  }
);

/**
 * Comments on a post. Was unauthenticated, so any thread in any private or paid
 * community could be read by anyone holding a postId.
 */
export const getPostComments = defineAction(
  {
    name: "getPostComments",
    auth: "member",
    args: [postIdSchema],
    community: ([postId]) => communityOfPost(postId),
  },
  async (_ctx, postId) => {
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
      take: 200,
    });

    return { success: true as const, comments };
  }
);

export const deleteComment = defineAction(
  {
    name: "deleteComment",
    auth: "member",
    args: [commentIdSchema],
    community: ([commentId]) => communityOfComment(commentId),
  },
  async (ctx, commentId) => {
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      select: { authorId: true },
    });

    if (!comment) {
      return { success: false as const, error: "Comment not found" };
    }

    // Author, or a moderator of the community owning the post.
    const isModerator =
      ctx.member != null && ["OWNER", "ADMIN", "MODERATOR"].includes(ctx.member.role);
    if (comment.authorId !== ctx.userId && !isModerator) {
      return { success: false as const, error: "Unauthorized to delete this comment" };
    }

    await prisma.comment.delete({ where: { id: commentId } });
    revalidateLocalizedPath("/c/[slug]", "page");

    return { success: true as const };
  }
);
