/**
 * Server-side authorization primitives for unytea.
 *
 * This module provides primitives that THROW on failure — designed for use
 * in Server Actions where error handling is explicit and a thrown Error
 * propagates as a failed action.
 *
 * For redirect-based auth (pages, Server Components), see lib/auth-utils.ts.
 *
 * Primitives:
 * - requireUserId() — assert auth, return userId
 * - requireAdmin() — assert authenticated + platform ADMIN role
 * - requireCommunityMember(userId, communityId) — assert active membership
 * - requireCommunityRole(userId, communityId, roles) — assert role
 * - requireCommunityAdmin/Moderator/Owner — role shortcuts
 * - requireResourceOwner(userId, resourceId, type) — assert ownership
 * - canEditPost / canDeletePost / canAccessCommunity / canSendMessage —
 *   composite checks that return boolean
 * - Permissions — declarative permission map (returns boolean)
 *
 * Typed errors:
 * - UnauthorizedError (caught → HTTP 401)
 * - ForbiddenError (caught → HTTP 403)
 *
 * Map these to HTTP responses with lib/api-error-handler.ts.
 */
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MemberRole } from "@prisma/client";

/**
 * Server-side: Require authenticated user, return userId.
 *
 * Throws Error("Unauthorized - Please sign in") if not authenticated.
 *
 * Use in Server Actions where you want explicit error handling.
 * For Server Components / pages, use auth-utils.requireAuth() which redirects.
 */
export async function requireUserId() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new UnauthorizedError("Unauthorized - Please sign in");
  }
  return session.user.id;
}

/**
 * Check if user is a member of a community
 */
export async function requireCommunityMember(userId: string, communityId: string) {
  const member = await prisma.member.findUnique({
    where: {
      userId_communityId: {
        userId,
        communityId,
      },
    },
  });

  if (!member || member.status !== "ACTIVE") {
    throw new ForbiddenError("Not a member of this community");
  }

  return member;
}

/**
 * Check if user has specific role in community
 */
export async function requireCommunityRole(
  userId: string,
  communityId: string,
  allowedRoles: MemberRole[]
) {
  const member = await requireCommunityMember(userId, communityId);

  if (!allowedRoles.includes(member.role)) {
    throw new ForbiddenError("Insufficient permissions");
  }

  return member;
}

/**
 * Check if user is owner or admin of community
 */
export async function requireCommunityAdmin(userId: string, communityId: string) {
  return requireCommunityRole(userId, communityId, ["OWNER", "ADMIN"]);
}

/**
 * Check if user is owner, admin, or moderator of community
 */
export async function requireCommunityModerator(userId: string, communityId: string) {
  return requireCommunityRole(userId, communityId, ["OWNER", "ADMIN", "MODERATOR"]);
}

/**
 * Check if user is owner of community
 */
export async function requireCommunityOwner(userId: string, communityId: string) {
  return requireCommunityRole(userId, communityId, ["OWNER"]);
}

/**
 * Check if user owns a resource
 */
export async function requireResourceOwner(
  userId: string,
  resourceId: string,
  resourceType: "post" | "comment" | "message"
) {
  let resource;

  switch (resourceType) {
    case "post":
      resource = await prisma.post.findUnique({
        where: { id: resourceId },
        select: { authorId: true },
      });
      break;
    case "comment":
      resource = await prisma.comment.findUnique({
        where: { id: resourceId },
        select: { authorId: true },
      });
      break;
    case "message":
      resource = await prisma.directMessage.findUnique({
        where: { id: resourceId },
        select: { senderId: true },
      });
      if (resource && "senderId" in resource) {
        resource = { authorId: resource.senderId };
      }
      break;
  }

  if (!resource) {
    throw new Error("Resource not found");
  }

  if (resource.authorId !== userId) {
    throw new ForbiddenError("Not authorized to access this resource");
  }

  return true;
}

/**
 * Check if user can edit post (owner or community moderator)
 */
export async function canEditPost(userId: string, postId: string): Promise<boolean> {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: {
      community: true,
    },
  });

  if (!post) {
    return false;
  }

  // Check if user is post author
  if (post.authorId === userId) {
    return true;
  }

  // Check if user is community moderator+
  try {
    await requireCommunityModerator(userId, post.communityId);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if user can delete post (owner or community moderator)
 */
export async function canDeletePost(userId: string, postId: string): Promise<boolean> {
  return canEditPost(userId, postId);
}

/**
 * Check if user can access private community
 */
export async function canAccessCommunity(
  userId: string | undefined,
  communityId: string
): Promise<boolean> {
  const community = await prisma.community.findUnique({
    where: { id: communityId },
    select: { isPrivate: true },
  });

  if (!community) {
    return false;
  }

  // Public communities are accessible to everyone
  if (!community.isPrivate) {
    return true;
  }

  // Private communities require membership
  if (!userId) {
    return false;
  }

  const member = await prisma.member.findUnique({
    where: {
      userId_communityId: {
        userId,
        communityId,
      },
    },
  });

  return member?.status === "ACTIVE";
}

/**
 * Check if user can send message to recipient
 */
export async function canSendMessage(
  userId: string,
  recipientId: string
): Promise<boolean> {
  if (userId === recipientId) {
    return false;
  }

  // Check if blocked
  const blockedConversation = await prisma.conversation.findFirst({
    where: {
      OR: [
        {
          participant1Id: userId,
          participant2Id: recipientId,
          isBlocked: true,
        },
        {
          participant1Id: recipientId,
          participant2Id: userId,
          isBlocked: true,
        },
      ],
    },
  });

  return !blockedConversation;
}

/**
 * Permissions helper
 */
export const Permissions = {
  // Community permissions
  canCreateCommunity: async (userId: string) => {
    // Delegates to auth-utils — single source of truth for plan limits.
    // Resolves the contradiction flagged in the Phase 2b TODO.
    // Dynamic import keeps the dependency direction clean (auth-utils doesn't
    // import authorization).
    const { canCreateCommunity: planCheck } = await import("@/lib/auth-utils");
    return planCheck(userId);
  },

  canUpdateCommunity: async (userId: string, communityId: string) => {
    try {
      await requireCommunityAdmin(userId, communityId);
      return true;
    } catch {
      return false;
    }
  },

  canDeleteCommunity: async (userId: string, communityId: string) => {
    try {
      await requireCommunityOwner(userId, communityId);
      return true;
    } catch {
      return false;
    }
  },

  // Post permissions
  canCreatePost: async (userId: string, communityId: string) => {
    try {
      await requireCommunityMember(userId, communityId);
      return true;
    } catch {
      return false;
    }
  },

  canUpdatePost: async (userId: string, postId: string) => {
    return canEditPost(userId, postId);
  },

  canDeletePost: async (userId: string, postId: string) => {
    return canDeletePost(userId, postId);
  },

  // Comment permissions
  canCreateComment: async (userId: string, postId: string) => {
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { communityId: true, isLocked: true },
    });

    if (!post || post.isLocked) {
      return false;
    }

    try {
      await requireCommunityMember(userId, post.communityId);
      return true;
    } catch {
      return false;
    }
  },

  canDeleteComment: async (userId: string, commentId: string) => {
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        post: {
          select: { communityId: true },
        },
      },
    });

    if (!comment) {
      return false;
    }

    // Owner can delete
    if (comment.authorId === userId) {
      return true;
    }

    // Community moderator can delete
    try {
      await requireCommunityModerator(userId, comment.post.communityId);
      return true;
    } catch {
      return false;
    }
  },

  // Message permissions
  canSendMessage: async (userId: string, recipientId: string) => {
    return canSendMessage(userId, recipientId);
  },
};

// ═══════════════════════════════════════════════════════════════
// Typed errors for HTTP status mapping
// ═══════════════════════════════════════════════════════════════

/**
 * Thrown when a request has no authenticated user.
 * API route handlers should catch this and return HTTP 401.
 * See: lib/api-error-handler.ts
 */
export class UnauthorizedError extends Error {
  constructor(message = "Unauthorized - Please sign in") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

/**
 * Thrown when an authenticated user lacks the required permissions.
 * API route handlers should catch this and return HTTP 403.
 * See: lib/api-error-handler.ts
 */
export class ForbiddenError extends Error {
  constructor(message = "Forbidden - Insufficient permissions") {
    super(message);
    this.name = "ForbiddenError";
  }
}

// ═══════════════════════════════════════════════════════════════
// Platform-level role checks
// ═══════════════════════════════════════════════════════════════

/**
 * Server-side: Require authenticated user with platform-level ADMIN role.
 *
 * Throws UnauthorizedError if no session.
 * Throws ForbiddenError if session exists but user.role is not ADMIN.
 *
 * Returns the userId on success.
 */
export async function requireAdmin(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new UnauthorizedError();
  }
  if (session.user.role !== "ADMIN") {
    throw new ForbiddenError("Forbidden - Admin access required");
  }
  return session.user.id;
}