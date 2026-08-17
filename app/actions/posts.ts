"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { revalidateLocalizedPath } from "@/lib/cache-invalidation";
import { PostContentType } from "@prisma/client";
import { defineAction } from "@/lib/actions/define-action";
import { assertPostAuthor, assertPostAuthorOrModerator } from "@/lib/actions/guards";
import { communityById, communityOfPost } from "@/lib/actions/resolvers";
import { postAttachmentsSchema, type PostAttachment } from "@/lib/attachments";

const postIdSchema = z.string().min(1).max(64);

/**
 * Posts.
 *
 * These already carried hand-written membership and role checks, which were
 * correct. Routing them through the seam keeps that behaviour but moves the
 * decision into one reviewable place, adds Zod bounds on user content, and
 * brings rate limiting — none of these had any.
 */

export const createPost = defineAction(
  {
    name: "createPost",
    auth: "member",
    args: [z.instanceof(FormData)],
    community: ([formData]) => {
      const communityId = formData.get("communityId");
      return typeof communityId === "string" && communityId ? communityById(communityId) : null;
    },
    rateLimit: "create",
  },
  async (ctx, formData) => {
    const communityId = formData.get("communityId") as string;
    const content = formData.get("content") as string;
    const title = formData.get("title") as string | null;
    const contentType = (formData.get("contentType") as string | null) || "DISCUSSION";
    const attachmentsRaw = formData.get("attachments") as string | null;

    if (!content?.trim() && !attachmentsRaw) {
      return { success: false as const, error: "Missing required fields" };
    }
    // FormData bypasses the args schema for its individual fields, so bound the
    // user-supplied strings explicitly here.
    if ((content?.length ?? 0) > 50_000 || (title?.length ?? 0) > 300) {
      return { success: false as const, error: "Content is too long" };
    }

    // Parsed AND validated. This used to be a bare `JSON.parse` written to the
    // row cast to `never`, so an attachment could carry a `javascript:` URL
    // that `PremiumPostCard` then rendered into an `<a href>` — stored XSS on
    // click. `postAttachmentsSchema` admits only absolute http/https URLs.
    let parsedAttachments: PostAttachment[] | null = null;
    if (attachmentsRaw) {
      let decoded: unknown;
      try {
        decoded = JSON.parse(attachmentsRaw);
      } catch {
        return { success: false as const, error: "Invalid attachments" };
      }

      const validated = postAttachmentsSchema.safeParse(decoded);
      if (!validated.success) {
        return { success: false as const, error: "Invalid attachments" };
      }
      parsedAttachments = validated.data;
    }

    const normalizedContent = content?.trim() || (parsedAttachments ? "Shared an attachment" : "");

    // Post and counter written together so a mid-write failure cannot leave
    // community.postCount drifting from reality (ARCH-04).
    const post = await prisma.$transaction(async (tx) => {
      const created = await tx.post.create({
        data: {
          title: title || null,
          content: normalizedContent,
          authorId: ctx.userId,
          communityId,
          isPublished: true,
          publishedAt: new Date(),
          attachments: parsedAttachments ?? undefined,
          contentType: ["DISCUSSION", "QUESTION", "ANNOUNCEMENT", "RESOURCE"].includes(contentType)
            ? (contentType as PostContentType)
            : "DISCUSSION",
        },
      });

      await tx.community.update({
        where: { id: communityId },
        data: { postCount: { increment: 1 } },
      });

      return created;
    });

    revalidateLocalizedPath("/c/[slug]", "page");
    return { success: true as const, post };
  }
);

export const deletePost = defineAction(
  {
    name: "deletePost",
    auth: "member",
    args: [postIdSchema],
    community: ([postId]) => communityOfPost(postId),
  },
  async (ctx, postId) => {
    await assertPostAuthorOrModerator(ctx, postId);

    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { communityId: true },
    });
    if (!post) {
      return { success: false as const, error: "Post not found" };
    }

    await prisma.$transaction(async (tx) => {
      await tx.post.delete({ where: { id: postId } });
      await tx.community.update({
        where: { id: post.communityId },
        data: { postCount: { decrement: 1 } },
      });
    });

    revalidateLocalizedPath("/c/[slug]", "page");
    return { success: true as const };
  }
);

export const updatePost = defineAction(
  {
    name: "updatePost",
    auth: "member",
    args: [postIdSchema, z.instanceof(FormData)],
    community: ([postId]) => communityOfPost(postId),
  },
  async (ctx, postId, formData) => {
    // Editing is author-only — a moderator may remove a post but must not
    // rewrite someone else's words.
    await assertPostAuthor(ctx, postId);

    const content = formData.get("content") as string;
    const title = formData.get("title") as string | null;

    if (!content) {
      return { success: false as const, error: "Content is required" };
    }
    if (content.length > 50_000 || (title?.length ?? 0) > 300) {
      return { success: false as const, error: "Content is too long" };
    }

    const updatedPost = await prisma.post.update({
      where: { id: postId },
      data: { title: title || null, content },
    });

    revalidateLocalizedPath("/c/[slug]", "page");
    return { success: true as const, post: updatedPost };
  }
);

export const togglePostPin = defineAction(
  {
    name: "togglePostPin",
    auth: "admin",
    args: [postIdSchema],
    community: ([postId]) => communityOfPost(postId),
    roles: ["OWNER", "ADMIN", "MODERATOR"],
  },
  async (_ctx, postId) => {
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { isPinned: true },
    });
    if (!post) {
      return { success: false as const, error: "Post not found" };
    }

    const updatedPost = await prisma.post.update({
      where: { id: postId },
      data: { isPinned: !post.isPinned },
    });

    revalidateLocalizedPath("/c/[slug]", "page");
    return { success: true as const, isPinned: updatedPost.isPinned };
  }
);
