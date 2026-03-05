"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getCurrentUserId } from "@/lib/auth-utils";

// Optimized select for member data
const memberSelect = {
  id: true,
  role: true,
  points: true,
  level: true,
  status: true,
  joinedAt: true,
  user: {
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      username: true,
      bio: true,
      tagline: true,
      skills: true,
      interests: true,
      availabilityStatus: true,
      location: true,
      level: true,
      points: true,
      lastActiveAt: true,
    },
  },
};

/**
 * Get all members of a community with optional filters
 */
export async function getCommunityMembers(
  communityId: string,
  filters?: {
    search?: string;
    minLevel?: number;
    status?: string;
    sortBy?: "recent" | "points" | "level" | "name";
  }
) {
  try {
    const where: any = {
      communityId,
      status: "ACTIVE",
    };

    // Build query
    const members = await prisma.member.findMany({
      where,
      select: memberSelect,
      orderBy: filters?.sortBy === "recent"
        ? { joinedAt: "desc" }
        : filters?.sortBy === "points"
        ? { points: "desc" }
        : filters?.sortBy === "level"
        ? { level: "desc" }
        : { user: { name: "asc" } },
    });

    // Apply client-side filters
    let filteredMembers = members;

    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      filteredMembers = filteredMembers.filter(m =>
        m.user.name?.toLowerCase().includes(searchLower) ||
        m.user.bio?.toLowerCase().includes(searchLower) ||
        m.user.tagline?.toLowerCase().includes(searchLower) ||
        m.user.skills?.some(s => s.toLowerCase().includes(searchLower)) ||
        m.user.interests?.some(i => i.toLowerCase().includes(searchLower))
      );
    }

    if (filters?.minLevel) {
      filteredMembers = filteredMembers.filter(m => m.user.level >= filters.minLevel!);
    }

    if (filters?.status) {
      filteredMembers = filteredMembers.filter(m => m.user.availabilityStatus === filters.status);
    }

    return { success: true, members: filteredMembers };
  } catch (error) {
    console.error("Error getting community members:", error);
    return { success: false, error: "Failed to get members", members: [] };
  }
}

/**
 * Get member profile
 */
export async function getMemberProfile(userId: string, communityId?: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        username: true,
        bio: true,
        tagline: true,
        skills: true,
        interests: true,
        website: true,
        location: true,
        timezone: true,
        availabilityStatus: true,
        level: true,
        points: true,
        createdAt: true,
        lastActiveAt: true,
      },
    });

    if (!user) {
      return { success: false, error: "User not found" };
    }

    // Get membership info if communityId provided
    let membership = null;
    if (communityId) {
      membership = await prisma.member.findUnique({
        where: {
          userId_communityId: {
            userId,
            communityId,
          },
        },
        select: {
          role: true,
          level: true,
          points: true,
          joinedAt: true,
        },
      });
    }

    // Get stats
    const stats = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        _count: {
          select: {
            posts: true,
            comments: true,
            channelMessages: true,
          },
        },
      },
    });

    return {
      success: true,
      user,
      membership,
      stats: stats?._count,
    };
  } catch (error) {
    console.error("Error getting member profile:", error);
    return { success: false, error: "Failed to get profile" };
  }
}

/**
 * Update user profile
 */
export async function updateUserProfile(data: {
  name?: string;
  bio?: string;
  tagline?: string;
  skills?: string[];
  interests?: string[];
  website?: string;
  location?: string;
  availabilityStatus?: string;
}) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return { success: false, error: "Not authenticated" };
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });

    revalidatePath("/dashboard/settings/profile");
    revalidatePath("/c/[slug]/members");

    return { success: true, user };
  } catch (error) {
    console.error("Error updating profile:", error);
    return { success: false, error: "Failed to update profile" };
  }
}

/**
 * Get online members count
 */
export async function getOnlineMembersCount(communityId: string) {
  try {
    // Get members who were active in last 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const count = await prisma.member.count({
      where: {
        communityId,
        status: "ACTIVE",
        user: {
          lastActiveAt: {
            gte: fiveMinutesAgo,
          },
        },
      },
    });

    return { success: true, count };
  } catch (error) {
    console.error("Error getting online count:", error);
    return { success: false, error: "Failed to get count", count: 0 };
  }
}

/**
 * Update last active timestamp
 */
export async function updateLastActive() {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return { success: false, error: "Not authenticated" };
    }

    await prisma.user.update({
      where: { id: userId },
      data: { lastActiveAt: new Date() },
    });

    return { success: true };
  } catch (error) {
    console.error("Error updating last active:", error);
    return { success: false, error: "Failed to update" };
  }
}
