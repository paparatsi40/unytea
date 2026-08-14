"use server";

import { Prisma, type CommunityLayoutType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { defineAction } from "@/lib/actions/define-action";
import { communityById } from "@/lib/actions/resolvers";
import { getLimitsForPlan } from "@/lib/plans";
import { buildDefaultLandingLayout } from "@/lib/community-landing-template";

/**
 * Create a new community
 */
export const createCommunity = defineAction(
  {
    name: "createCommunity",
    auth: "user",
    args: [
      z.object({
        name: z.string().min(1).max(200),
        slug: z.string().min(1).max(120),
        description: z.string().max(10_000).optional(),
        imageUrl: z.string().max(1000).optional(),
        coverImageUrl: z.string().max(1000).optional(),
        isPrivate: z.boolean().optional(),
        requireApproval: z.boolean().optional(),
        category: z.string().max(64).optional(),
        language: z.string().max(8).optional(),
        layoutType: z.string().max(32).optional(),
        primaryColor: z.string().max(32).optional(),
        secondaryColor: z.string().max(32).optional(),
        accentColor: z.string().max(32).optional(),
        fontFamily: z.string().max(64).optional(),
        heroTitle: z.string().max(300).optional(),
        heroSubtitle: z.string().max(1000).optional(),
      }),
    ],
    rateLimit: "create",
  },
  async (
    ctx,
    data: {
      name: string;
      slug: string;
      description?: string;
      imageUrl?: string;
      coverImageUrl?: string;
      isPrivate?: boolean;
      requireApproval?: boolean;
      layoutType?: string;
      primaryColor?: string;
      secondaryColor?: string;
      accentColor?: string;
      fontFamily?: string;
      heroTitle?: string;
      heroSubtitle?: string;
    }
  ) => {
    try {
      const userId = ctx.userId;

      // DEBUG: Verify user exists in database
      const userExists = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, platformPlan: true },
      });

      if (!userExists) {
        console.error("User not found in database:", userId);
        return {
          success: false,
          error: "User account not found. Please sign in again.",
        };
      }

      console.log("Creating community for user:", userExists.email);

      // ── PLAN GATE: community limit ────────────────────────────────────────
      const planLimits = getLimitsForPlan(userExists.platformPlan);
      const ownedCount = await prisma.community.count({
        where: { ownerId: userId },
      });
      if (ownedCount >= planLimits.maxCommunities) {
        return {
          success: false,
          error: `Tu plan ${userExists.platformPlan ?? "START"} solo permite ${planLimits.maxCommunities} comunidad${planLimits.maxCommunities === 1 ? "" : "es"}. Actualiza tu plan para crear más.`,
          code: "PLAN_LIMIT_COMMUNITIES",
        };
      }
      // ─────────────────────────────────────────────────────────────────────

      // Check if slug is already taken
      const existingCommunity = await prisma.community.findUnique({
        where: { slug: data.slug },
      });

      if (existingCommunity) {
        return { success: false, error: "Community slug already taken" };
      }

      // Use transaction to ensure both community and membership are created atomically
      const result = await prisma.$transaction(async (tx) => {
        // Default Patreon-style landing layout (Sub-Phase D). Persist the bare
        // sections array — the landingLayout column stores SectionInstance[].
        const defaultLanding = buildDefaultLandingLayout({
          name: data.name,
          slug: data.slug,
          description: data.description,
          coverImageUrl: data.coverImageUrl,
        });

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
            layoutType: (data.layoutType as CommunityLayoutType) || "MODERN_GRID",
            primaryColor: data.primaryColor || "#8B5CF6",
            secondaryColor: data.secondaryColor || "#EC4899",
            accentColor: data.accentColor || "#F59E0B",
            fontFamily: data.fontFamily || "Inter",
            heroTitle: data.heroTitle,
            heroSubtitle: data.heroSubtitle,
            landingLayout: defaultLanding.sections as unknown as Prisma.InputJsonValue,
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

      // Revalidate paths BEFORE returning
      revalidatePath("/dashboard/communities");
      revalidatePath(`/dashboard/c/${result.community.slug}`);

      console.log("✅ Paths revalidated, returning success");

      // Return success - let client handle redirect
      return {
        success: true,
        community: result.community,
        membership: result.membership,
      };
    } catch (error) {
      console.error("❌ Error creating community:", error);
      console.error("❌ Error details:", error instanceof Error ? error.message : String(error));
      console.error("❌ Error stack:", error instanceof Error ? error.stack : "No stack");
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create community",
      };
    }
  }
);

/**
 * Update community details
 */
export const updateCommunity = defineAction(
  {
    name: "updateCommunity",
    auth: "admin",
    args: [
      z.string().min(1).max(64),
      z.object({
        name: z.string().min(1).max(200).optional(),
        description: z.string().max(10_000).optional(),
        imageUrl: z.string().max(1000).optional(),
        coverImageUrl: z.string().max(1000).optional(),
        isPrivate: z.boolean().optional(),
        requireApproval: z.boolean().optional(),
      }),
    ],
    community: ([communityId]) => communityById(communityId),
  },
  async (
    ctx,
    communityId: string,
    data: {
      name?: string;
      description?: string;
      imageUrl?: string;
      coverImageUrl?: string;
      isPrivate?: boolean;
      requireApproval?: boolean;
    }
  ) => {
    try {
      const userId = ctx.userId;

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

      revalidatePath(`/dashboard/c/${community.slug}`);
      return { success: true, community };
    } catch (error) {
      console.error("Error updating community:", error);
      return { success: false, error: "Failed to update community" };
    }
  }
);

/**
 * Join a community
 */
/**
 * Prisma's unique-constraint violation (P2002).
 *
 * Narrowed by code rather than by `instanceof`: a Prisma client instantiated in
 * a different module realm (which the generated client does under Next's
 * bundling) fails the instance check while still carrying the code.
 */
function isUniqueConstraintViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError
    ? error.code === "P2002"
    : typeof error === "object" && error !== null && (error as { code?: unknown }).code === "P2002";
}

export const joinCommunity = defineAction(
  {
    name: "joinCommunity",
    auth: "user",
    args: [z.string().min(1).max(64)],
    rateLimit: "create",
  },
  async (ctx, communityId: string) => {
    try {
      const userId = ctx.userId;

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
        return { success: false, error: "Already a member", code: "ALREADY_MEMBER" };
      }

      // Get community to check if approval is required
      const community = await prisma.community.findUnique({
        where: { id: communityId },
      });

      if (!community) {
        return { success: false, error: "Community not found" };
      }

      if (community.isPaid) {
        return {
          success: false,
          error: "Payment required to join this community",
          code: "PAYMENT_REQUIRED",
        };
      }

      // ── PLAN GATE: member limit (based on owner's plan) ──────────────────
      const owner = await prisma.user.findUnique({
        where: { id: community.ownerId },
        select: { platformPlan: true },
      });
      const ownerLimits = getLimitsForPlan(owner?.platformPlan);
      if (ownerLimits.maxMembers !== Infinity && community.memberCount >= ownerLimits.maxMembers) {
        return {
          success: false,
          error: "Esta comunidad ha alcanzado su límite de miembros.",
          code: "PLAN_LIMIT_MEMBERS",
        };
      }
      // ─────────────────────────────────────────────────────────────────────

      // Create the membership and move the denormalized counter in one
      // transaction. They used to be two sequential writes: if the second failed,
      // the member existed and memberCount did not know about them, and nothing
      // ever reconciled it.
      let member;
      try {
        member = await prisma.$transaction(async (tx) => {
          const created = await tx.member.create({
            data: {
              userId,
              communityId,
              role: "MEMBER",
              status: community.requireApproval ? "PENDING" : "ACTIVE",
            },
          });

          // PENDING members are not counted until they are approved.
          if (created.status === "ACTIVE") {
            await tx.community.update({
              where: { id: communityId },
              data: { memberCount: { increment: 1 } },
            });
          }

          return created;
        });
      } catch (error) {
        // The findUnique above is a check, not a lock. Two joins racing — a link
        // prefetch alongside the click, a double-submit, two tabs — both pass it
        // and both reach the create; the loser hits the (userId, communityId)
        // unique index. That is the same outcome as "already a member", so it is
        // reported as one instead of thrown. Reaching this branch means no row
        // was created by THIS call, so the counter is deliberately not touched:
        // the winning transaction already incremented it.
        if (isUniqueConstraintViolation(error)) {
          return { success: false, error: "Already a member", code: "ALREADY_MEMBER" };
        }
        throw error;
      }

      revalidatePath(`/dashboard/c/${community.slug}`);
      revalidatePath("/dashboard/communities");
      return { success: true, member };
    } catch (error) {
      console.error("Error joining community:", error);
      return { success: false, error: "Failed to join community" };
    }
  }
);

/**
 * Leave a community
 */
export const leaveCommunity = defineAction(
  {
    name: "leaveCommunity",
    auth: "member",
    args: [z.string().min(1).max(64)],
    community: ([communityId]) => communityById(communityId),
    allowPaywallLocked: true,
  },
  async (ctx, communityId: string) => {
    try {
      const userId = ctx.userId;

      // Get member info
      const member = await prisma.member.findUnique({
        where: {
          userId_communityId: {
            userId,
            communityId,
          },
        },
        include: {
          community: true,
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
      }

      revalidatePath(`/dashboard/c/${member.community.slug}`);
      revalidatePath("/dashboard/communities");
      return { success: true };
    } catch (error) {
      console.error("Error leaving community:", error);
      return { success: false, error: "Failed to leave community" };
    }
  }
);

/**
 * Delete a community (owner only)
 */
export const deleteCommunity = defineAction(
  {
    name: "deleteCommunity",
    auth: "admin",
    args: [z.string().min(1).max(64)],
    community: ([communityId]) => communityById(communityId),
    roles: ["OWNER"],
    allowPaywallLocked: true,
  },
  async (ctx, communityId: string) => {
    try {
      console.log("🗑️ Attempting to delete community:", communityId);

      const userId = ctx.userId;

      // Verify user is the owner
      const community = await prisma.community.findUnique({
        where: { id: communityId },
        select: {
          id: true,
          name: true,
          slug: true,
          ownerId: true,
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

        // Delete courses, modules and lessons
        const courses = await tx.course.findMany({
          where: { communityId },
          select: { id: true },
        });

        for (const course of courses) {
          // Find modules for this course
          const modules = await tx.module.findMany({
            where: { courseId: course.id },
            select: { id: true },
          });

          // Delete lessons for each module
          for (const moduleItem of modules) {
            await tx.lesson.deleteMany({
              where: { moduleId: moduleItem.id },
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
        message: `Community "${community.name}" deleted successfully`,
      };
    } catch (error) {
      console.error("❌ Error deleting community:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to delete community",
      };
    }
  }
);

/**
 * Get user's communities
 */
export const getUserCommunities = defineAction(
  {
    name: "getUserCommunities",
    auth: "user",
    args: [],
  },
  async (ctx) => {
    try {
      const userId = ctx.userId;

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
);

/**
 * Check if the current user can create another community based on their plan
 */
export const checkCommunityPlanLimit = defineAction(
  {
    name: "checkCommunityPlanLimit",
    auth: "user",
    args: [],
  },
  async (ctx) => {
    try {
      const userId = ctx.userId;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { platformPlan: true },
      });

      const planLimits = getLimitsForPlan(user?.platformPlan);
      const current = await prisma.community.count({
        where: { ownerId: userId },
      });

      return {
        canCreate: current < planLimits.maxCommunities,
        plan: (user?.platformPlan ?? "START") as string,
        current,
        max: planLimits.maxCommunities,
      };
    } catch {
      // On error, allow creation (server action will enforce the real limit)
      return { canCreate: true, plan: "START", current: 0, max: 1 };
    }
  }
);
