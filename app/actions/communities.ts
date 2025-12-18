"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getCurrentUserId } from "@/lib/auth-utils";
import { checkAndUnlockAchievements } from "./achievements";
import { canCreateCommunity, canAddMember } from "@/lib/subscription-plans";
import { updateMemberCount } from "@/lib/usage-tracking";

/**
 * Create a new community
 */
export async function createCommunity(data: {
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  coverImageUrl?: string;
  isPrivate?: boolean;
  requireApproval?: boolean;
  // Layout & Theme
  layoutType?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  fontFamily?: string;
  heroTitle?: string;
  heroSubtitle?: string;
}) {
  try {
    const userId = await getCurrentUserId();
    
    if (!userId) {
      return { success: false, error: "Not authenticated" };
    }

    // 🔐 CHECK SUBSCRIPTION LIMIT
    const limitCheck = await canCreateCommunity(userId);
    if (!limitCheck.allowed) {
      return { 
        success: false, 
        error: limitCheck.reason || "Community limit reached",
        limitReached: true,
        currentCount: limitCheck.currentCount,
        limit: limitCheck.limit,
      };
    }

    // DEBUG: Verify user exists in database
    const userExists = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });

    if (!userExists) {
      console.error("User not found in database:", userId);
      return { 
        success: false, 
        error: "User account not found. Please sign in again." 
      };
    }

    console.log("Creating community for user:", userExists.email);

    // Check if slug is already taken
    const existingCommunity = await prisma.community.findUnique({
      where: { slug: data.slug },
    });

    if (existingCommunity) {
      return { success: false, error: "Community slug already taken" };
    }

    // Use transaction to ensure both community and membership are created atomically
    const result = await prisma.$transaction(async (tx) => {
      // Create community
      const community = await tx.community.create({
        data: {
          name: data.name,
          slug: data.slug,
          description: data.description,
          imageUrl: data.imageUrl,
          coverImageUrl: data.coverImageUrl,
          isPrivate: data.isPrivate || false,
          requireApproval: data.requireApproval || false,
          ownerId: userId,
          memberCount: 1, // Owner is the first member
          // Layout & Theme
          layoutType: (data.layoutType as any) || "MODERN_GRID",
          primaryColor: data.primaryColor || "#8B5CF6",
          secondaryColor: data.secondaryColor || "#EC4899",
          accentColor: data.accentColor || "#F59E0B",
          fontFamily: data.fontFamily || "Inter",
          heroTitle: data.heroTitle,
          heroSubtitle: data.heroSubtitle,
        },
      });

      console.log("✓ Community created:", community.id);

      // Add owner as first member with OWNER role (MUST be in same transaction)
      const membership = await tx.member.create({
        data: {
          userId,
          communityId: community.id,
          role: "OWNER",
          status: "ACTIVE", // Explicitly set to ACTIVE
        },
      });

      console.log("✓ Membership created:", membership.id, "Status:", membership.status);

      return { community, membership };
    });

    console.log("✅ Transaction completed successfully");

    // Check for achievements (don't await)
    checkAndUnlockAchievements(userId).catch(console.error);

    // Revalidate paths BEFORE returning
    revalidatePath("/dashboard/communities");
    revalidatePath(`/dashboard/communities/${result.community.slug}`);
    
    console.log("✅ Paths revalidated, returning success");
    
    // Return success - let client handle redirect
    return { 
      success: true, 
      community: result.community,
      membership: result.membership 
    };
  } catch (error) {
    console.error("❌ Error creating community:", error);
    console.error("❌ Error details:", error instanceof Error ? error.message : String(error));
    console.error("❌ Error stack:", error instanceof Error ? error.stack : "No stack");
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to create community" 
    };
  }
}

/**
 * Update community details
 */
export async function updateCommunity(
  communityId: string,
  data: {
    name?: string;
    description?: string;
    imageUrl?: string;
    coverImageUrl?: string;
    isPrivate?: boolean;
    requireApproval?: boolean;
  }
) {
  try {
    const userId = await getCurrentUserId();
    
    if (!userId) {
      return { success: false, error: "Not authenticated" };
    }

    // Verify user is owner or admin
    const member = await prisma.member.findFirst({
      where: {
        userId,
        communityId,
        role: { in: ["OWNER", "ADMIN"] },
      },
    });

    if (!member) {
      return { success: false, error: "Not authorized" };
    }

    const community = await prisma.community.update({
      where: { id: communityId },
      data,
    });

    revalidatePath(`/dashboard/communities/${community.slug}`);
    return { success: true, community };
  } catch (error) {
    console.error("Error updating community:", error);
    return { success: false, error: "Failed to update community" };
  }
}

/**
 * Join a community
 */
export async function joinCommunity(communityId: string) {
  try {
    const userId = await getCurrentUserId();
    
    if (!userId) {
      return { success: false, error: "Not authenticated" };
    }

    // CHECK MEMBER LIMIT
    const memberLimitCheck = await canAddMember(communityId);
    if (!memberLimitCheck.allowed) {
      return { 
        success: false, 
        error: memberLimitCheck.reason || "This community has reached its member limit",
        limitReached: true,
        currentCount: memberLimitCheck.currentCount,
        limit: memberLimitCheck.limit,
      };
    }

    // Check if already a member
    const existingMember = await prisma.member.findUnique({
      where: {
        userId_communityId: {
          userId,
          communityId,
        },
      },
    });

    if (existingMember) {
      return { success: false, error: "Already a member" };
    }

    // Get community to check if approval is required
    const community = await prisma.community.findUnique({
      where: { id: communityId },
      select: {
        id: true,
        requireApproval: true,
        slug: true,
        ownerId: true,
      },
    });

    if (!community) {
      return { success: false, error: "Community not found" };
    }

    // Create membership
    const member = await prisma.member.create({
      data: {
        userId,
        communityId,
        role: "MEMBER",
        status: community.requireApproval ? "PENDING" : "ACTIVE",
      },
    });

    // Update member count if active
    if (member.status === "ACTIVE") {
      await prisma.community.update({
        where: { id: communityId },
        data: {
          memberCount: {
            increment: 1,
          },
        },
      });

      // UPDATE OWNER'S MEMBER COUNT FOR BILLING
      try {
        await updateMemberCount(community.ownerId);
      } catch (trackingError) {
        console.error("Error updating member count for billing:", trackingError);
        // Don't fail the join if tracking fails
      }
    }

    revalidatePath(`/dashboard/communities/${community.slug}`);
    revalidatePath("/dashboard/communities");
    return { success: true, member };
  } catch (error) {
    console.error("Error joining community:", error);
    return { success: false, error: "Failed to join community" };
  }
}

/**
 * Leave a community
 */
export async function leaveCommunity(communityId: string) {
  try {
    const userId = await getCurrentUserId();
    
    if (!userId) {
      return { success: false, error: "Not authenticated" };
    }

    // Get member info
    const member = await prisma.member.findUnique({
      where: {
        userId_communityId: {
          userId,
          communityId,
        },
      },
      include: {
        community: {
          select: {
            slug: true,
            ownerId: true,
          },
        },
      },
    });

    if (!member) {
      return { success: false, error: "Not a member" };
    }

    // Owners cannot leave (they must transfer ownership first)
    if (member.role === "OWNER") {
      return { success: false, error: "Owners cannot leave. Transfer ownership first." };
    }

    // Delete membership
    await prisma.member.delete({
      where: {
        userId_communityId: {
          userId,
          communityId,
        },
      },
    });

    // Update member count if was active
    if (member.status === "ACTIVE") {
      await prisma.community.update({
        where: { id: communityId },
        data: {
          memberCount: {
            decrement: 1,
          },
        },
      });

      // UPDATE OWNER'S MEMBER COUNT FOR BILLING
      try {
        await updateMemberCount(member.community.ownerId);
      } catch (trackingError) {
        console.error("Error updating member count for billing:", trackingError);
        // Don't fail the leave if tracking fails
      }
    }

    revalidatePath(`/dashboard/communities/${member.community.slug}`);
    revalidatePath("/dashboard/communities");
    return { success: true };
  } catch (error) {
    console.error("Error leaving community:", error);
    return { success: false, error: "Failed to leave community" };
  }
}

/**
 * Delete a community (owner only)
 */
export async function deleteCommunity(communityId: string) {
  try {
    console.log("🗑️ Attempting to delete community:", communityId);

    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    // Verify user is the owner
    const community = await prisma.community.findUnique({
      where: { id: communityId },
      select: { 
        id: true, 
        name: true,
        slug: true,
        ownerId: true 
      },
    });

    if (!community) {
      return { success: false, error: "Community not found" };
    }

    if (community.ownerId !== userId) {
      return { success: false, error: "Only the owner can delete this community" };
    }

    console.log("✅ User verified as owner");

    // Delete all related data in order (due to foreign key constraints)
    // This is a cascade delete
    await prisma.$transaction(async (tx) => {
      // Delete sections
      await tx.communitySection.deleteMany({
        where: { communityId },
      });

      // Delete members
      await tx.member.deleteMany({
        where: { communityId },
      });

      // Delete posts and their comments/reactions
      const posts = await tx.post.findMany({
        where: { communityId },
        select: { id: true },
      });

      for (const post of posts) {
        await tx.comment.deleteMany({
          where: { postId: post.id },
        });
        await tx.reaction.deleteMany({
          where: { postId: post.id },
        });
      }

      await tx.post.deleteMany({
        where: { communityId },
      });

      // Delete channels and messages
      const channels = await tx.channel.findMany({
        where: { communityId },
        select: { id: true },
      });

      for (const channel of channels) {
        await tx.channelMessage.deleteMany({
          where: { channelId: channel.id },
        });
      }

      await tx.channel.deleteMany({
        where: { communityId },
      });

      // Delete courses and lessons
      const courses = await tx.course.findMany({
        where: { communityId },
        select: { id: true },
      });

      for (const course of courses) {
        // Get modules for this course
        const modules = await tx.module.findMany({
          where: { courseId: course.id },
          select: { id: true },
        });

        // Delete lessons through modules
        for (const module of modules) {
          await tx.lesson.deleteMany({
            where: { moduleId: module.id },
          });
        }

        // Delete modules
        await tx.module.deleteMany({
          where: { courseId: course.id },
        });
      }

      await tx.course.deleteMany({
        where: { communityId },
      });

      // Delete subscription plans
      await tx.subscriptionPlan.deleteMany({
        where: { communityId },
      });

      // Delete buddy partnerships
      await tx.buddyPartnership.deleteMany({
        where: { communityId },
      });

      // Finally delete the community
      await tx.community.delete({
        where: { id: communityId },
      });

      console.log("✅ Community and all related data deleted successfully");
    });

    return { 
      success: true, 
      message: `Community "${community.name}" deleted successfully` 
    };
  } catch (error) {
    console.error("❌ Error deleting community:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to delete community" 
    };
  }
}

/**
 * Get user's communities
 */
export async function getUserCommunities() {
  try {
    const userId = await getCurrentUserId();
    
    if (!userId) {
      return { success: false, error: "Not authenticated" };
    }

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
                firstName: true,
                lastName: true,
                image: true,
              },
            },
            _count: {
              select: {
                members: true,
                posts: true,
              },
            },
          },
        },
      },
      orderBy: {
        joinedAt: "desc",
      },
    });

    const communities = memberships.map((m) => ({
      ...m.community,
      membership: {
        role: m.role,
        status: m.status,
        joinedAt: m.joinedAt,
      },
    }));

    return { success: true, communities };
  } catch (error) {
    console.error("Error getting communities:", error);
    return { success: false, error: "Failed to get communities" };
  }
}
