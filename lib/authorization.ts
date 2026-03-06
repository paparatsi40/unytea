import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MemberRole } from "@prisma/client";

/**
 * Check if user is authenticated
 */
export async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized - Please sign in");
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
    throw new Error("Not a member of this community");
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
    throw new Error("Insufficient permissions");
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
    throw new Error("Not authorized to access this resource");
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
  canCreateCommunity: async (_userId: string) => {
    // Anyone can create a community
    return true;
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