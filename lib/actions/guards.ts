import { prisma } from "@/lib/prisma";
import { ForbiddenError } from "@/lib/authorization";
import type { AuthedActionContext } from "./define-action";

/**
 * Resource-level guards that sit on top of `defineAction`'s community gate.
 *
 * The seam answers "is this caller a member / admin of the tenant?". These
 * answer the narrower "does this caller own *this row*?" — the question that
 * `auth: "member"` alone cannot, because a community can hold many sessions,
 * posts and partnerships belonging to different members.
 *
 * Each throws `ForbiddenError`, which the seam maps to a FORBIDDEN failure.
 */

const COMMUNITY_ADMIN_ROLES = new Set(["OWNER", "ADMIN"]);

function isCommunityAdmin(ctx: AuthedActionContext): boolean {
  return ctx.member != null && COMMUNITY_ADMIN_ROLES.has(ctx.member.role);
}

/**
 * The session's host, or an OWNER/ADMIN of the community hosting it.
 *
 * Replaces the `session.mentorId !== userId` checks that compared against a
 * caller-supplied `userId` and were therefore defeated by passing the host's
 * public id (SEC-05).
 */
export async function assertSessionHost(
  ctx: AuthedActionContext,
  sessionId: string
): Promise<{ mentorId: string }> {
  const session = await prisma.mentorSession.findUnique({
    where: { id: sessionId },
    select: { mentorId: true },
  });
  if (!session) throw new ForbiddenError("Session not found");

  if (session.mentorId !== ctx.userId && !isCommunityAdmin(ctx)) {
    throw new ForbiddenError("Only the session host can do this");
  }
  return session;
}

/** The post's author, or an OWNER/ADMIN/MODERATOR of its community. */
export async function assertPostAuthorOrModerator(
  ctx: AuthedActionContext,
  postId: string
): Promise<void> {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { authorId: true },
  });
  if (!post) throw new ForbiddenError("Post not found");

  const isModerator =
    ctx.member != null && ["OWNER", "ADMIN", "MODERATOR"].includes(ctx.member.role);
  if (post.authorId !== ctx.userId && !isModerator) {
    throw new ForbiddenError("Not authorized to modify this post");
  }
}

/** Strictly the post's author — used where moderators must not edit content. */
export async function assertPostAuthor(ctx: AuthedActionContext, postId: string): Promise<void> {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { authorId: true },
  });
  if (!post) throw new ForbiddenError("Post not found");
  if (post.authorId !== ctx.userId) {
    throw new ForbiddenError("Not authorized to edit this post");
  }
}

/** A participant in the buddy partnership. */
export async function assertBuddyPartner(
  ctx: AuthedActionContext,
  partnershipId: string
): Promise<void> {
  const partnership = await prisma.buddyPartnership.findUnique({
    where: { id: partnershipId },
    select: { user1Id: true, user2Id: true },
  });
  if (!partnership) throw new ForbiddenError("Partnership not found");

  if (partnership.user1Id !== ctx.userId && partnership.user2Id !== ctx.userId) {
    throw new ForbiddenError("Not part of this partnership");
  }
}

/** The owner of the community, as opposed to any admin. */
export function assertCommunityOwner(ctx: AuthedActionContext): void {
  if (ctx.member?.role !== "OWNER") {
    throw new ForbiddenError("Only the community owner can do this");
  }
}
