import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";

/**
 * Create a new community
 */
export async function createCommunity(data: {
  name: string;
  description?: string;
  ownerId: string;
  imageUrl?: string;
  coverImageUrl?: string;
}) {
  // Generate unique slug
  const baseSlug = slugify(data.name);
  let slug = baseSlug;
  let counter = 1;

  // Ensure slug is unique
  while (await prisma.community.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  // Create community
  const community = await prisma.community.create({
    data: {
      name: data.name,
      slug,
      description: data.description,
      ownerId: data.ownerId,
      imageUrl: data.imageUrl,
      coverImageUrl: data.coverImageUrl,
      memberCount: 1, // Owner is first member
    },
  });

  // Add owner as member with OWNER role
  await prisma.member.create({
    data: {
      userId: data.ownerId,
      communityId: community.id,
      role: "OWNER",
      status: "ACTIVE",
    },
  });

  // Create default "General" channel
  await prisma.channel.create({
    data: {
      name: "General",
      slug: "general",
      description: "General discussion",
      communityId: community.id,
      position: 0,
    },
  });

  return community;
}

/**
 * Get communities for a user
 */
export async function getUserCommunities(userId: string) {
  const memberships = await prisma.member.findMany({
    where: {
      userId,
      status: "ACTIVE",
    },
    include: {
      community: {
        include: {
          owner: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
      },
    },
    orderBy: {
      joinedAt: "desc",
    },
  });

  return memberships.map((m) => m.community);
}

/**
 * Get community by slug
 */
export async function getCommunityBySlug(slug: string) {
  return await prisma.community.findUnique({
    where: { slug },
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          image: true,
          username: true,
        },
      },
      channels: {
        orderBy: { position: "asc" },
      },
      _count: {
        select: {
          members: true,
          posts: true,
        },
      },
    },
  });
}

/**
 * Update community
 */
export async function updateCommunity(
  communityId: string,
  data: {
    name?: string;
    description?: string;
    imageUrl?: string;
    coverImageUrl?: string;
    theme?: any;
    customDomain?: string;
    subdomain?: string;
    isPrivate?: boolean;
    requireApproval?: boolean;
  }
) {
  return await prisma.community.update({
    where: { id: communityId },
    data,
  });
}

/**
 * Delete community
 */
export async function deleteCommunity(communityId: string) {
  return await prisma.community.delete({
    where: { id: communityId },
  });
}

/**
 * Check if user is owner of community
 */
export async function isUserCommunityOwner(
  userId: string,
  communityId: string
): Promise<boolean> {
  const community = await prisma.community.findUnique({
    where: { id: communityId },
    select: { ownerId: true },
  });

  return community?.ownerId === userId;
}

/**
 * Get community members
 */
export async function getCommunityMembers(communityId: string) {
  return await prisma.member.findMany({
    where: { communityId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          username: true,
          image: true,
          email: true,
        },
      },
    },
    orderBy: [{ role: "asc" }, { joinedAt: "desc" }],
  });
}

/**
 * Update member role
 */
export async function updateMemberRole(
  memberId: string,
  role: "OWNER" | "ADMIN" | "MODERATOR" | "MENTOR" | "MEMBER"
) {
  return await prisma.member.update({
    where: { id: memberId },
    data: { role },
  });
}

/**
 * Remove member from community
 */
export async function removeMember(memberId: string) {
  const member = await prisma.member.delete({
    where: { id: memberId },
    include: { community: true },
  });

  // Update member count
  await prisma.community.update({
    where: { id: member.communityId },
    data: {
      memberCount: {
        decrement: 1,
      },
    },
  });

  return member;
}

/**
 * Add member to community
 */
export async function addMemberToCommunity(
  userId: string,
  communityId: string,
  role: "MEMBER" | "MENTOR" = "MEMBER"
) {
  const member = await prisma.member.create({
    data: {
      userId,
      communityId,
      role,
      status: "ACTIVE",
    },
  });

  // Update member count
  await prisma.community.update({
    where: { id: communityId },
    data: {
      memberCount: {
        increment: 1,
      },
    },
  });

  return member;
}
