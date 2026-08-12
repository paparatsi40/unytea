"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { defineAction } from "@/lib/actions/define-action";
import { communityById, communityOfSection } from "@/lib/actions/resolvers";
import { jsonValueSchema } from "@/lib/actions/schemas";
import { prisma } from "@/lib/prisma";
import { sanitizeHTML } from "@/lib/sanitize";
import { Prisma, type CommunitySectionType } from "@prisma/client";

/**
 * Zod schema for updateCommunityTheme input.
 *
 * Validates field shapes + length limits. Note: customCSS is intentionally
 * NOT included — it has no rendering consumer in the codebase (verified by
 * grep in Phase 2c.5 recon), so we reject it at the input gate rather than
 * accepting and storing dead data. When customCSS becomes a real feature
 * with product requirements, design proper CSS sanitization at that time.
 */
const themeUpdateSchema = z.object({
  primaryColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Invalid hex color")
    .optional(),
  secondaryColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Invalid hex color")
    .optional(),
  accentColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Invalid hex color")
    .optional(),
  fontFamily: z.string().max(100).optional(),
  heroTitle: z.string().max(200).optional(),
  heroSubtitle: z.string().max(500).optional(),
  heroCTA: z.string().max(50).optional(),
  heroCTALink: z
    .union([
      z.string().url(),
      z.string().regex(/^\/[^\s]*$/, "Must be a relative path starting with /"),
      z.literal(""),
    ])
    .optional(),
  aboutSection: z.string().max(50000).optional(),
  showStats: z.boolean().optional(),
  showMembers: z.boolean().optional(),
  showCourses: z.boolean().optional(),
});

/**
 * Update community theme (colors, fonts, hero)
 */
export const updateCommunityTheme = defineAction(
  {
    name: "updateCommunityTheme",
    auth: "admin",
    args: [z.string().min(1).max(64), z.record(z.string().max(64), z.unknown())],
    community: ([communityId]) => communityById(communityId),
  },
  async (ctx, communityId: string, data: { primaryColor?: string; secondaryColor?: string; accentColor?: string; fontFamily?: string; heroTitle?: string; heroSubtitle?: string; heroCTA?: string; heroCTALink?: string; aboutSection?: string; showStats?: boolean; showMembers?: boolean; showCourses?: boolean; }) => {
  try {

    const userId = ctx.userId;

    // Verify ownership or admin
    const member = await prisma.member.findUnique({
      where: {
        userId_communityId: {
          userId,
          communityId,
        },
      },
    });

    if (!member || (member.role !== "OWNER" && member.role !== "ADMIN")) {
      return { success: false, error: "Not authorized to edit community" };
    }

    // Validate input shape and lengths
    const parsed = themeUpdateSchema.safeParse(data);
    if (!parsed.success) {
      return {
        success: false,
        error: "Validation failed",
        details: parsed.error.flatten(),
      };
    }

    // Sanitize HTML in aboutSection (Tiptap WYSIWYG output → DOMPurify allowlist)
    const sanitized = {
      ...parsed.data,
      aboutSection:
        parsed.data.aboutSection !== undefined ? sanitizeHTML(parsed.data.aboutSection) : undefined,
    };

    const community = await prisma.community.update({
      where: { id: communityId },
      data: sanitized,
    });

    revalidatePath(`/dashboard/c/${community.slug}`);
    revalidatePath(`/dashboard/c/${community.slug}/settings`);

    return { success: true, community };
  } catch (error) {
    console.error("Error updating community theme:", error);
    return { success: false, error: "Failed to update theme" };
  }
}
);

/**
 * Update community layout type
 */
export const updateCommunityLayout = defineAction(
  {
    name: "updateCommunityLayout",
    auth: "admin",
    args: [z.string().min(1).max(64), z.enum(["MODERN_GRID", "CLASSIC_FORUM", "ACADEMY", "DASHBOARD", "MINIMALIST"])],
    community: ([communityId]) => communityById(communityId),
  },
  async (ctx, communityId: string, layoutType: "MODERN_GRID" | "CLASSIC_FORUM" | "ACADEMY" | "DASHBOARD" | "MINIMALIST") => {
  try {

    const userId = ctx.userId;

    // Verify ownership or admin
    const member = await prisma.member.findUnique({
      where: {
        userId_communityId: {
          userId,
          communityId,
        },
      },
    });

    if (!member || (member.role !== "OWNER" && member.role !== "ADMIN")) {
      return { success: false, error: "Not authorized" };
    }

    const community = await prisma.community.update({
      where: { id: communityId },
      data: { layoutType },
    });

    revalidatePath(`/dashboard/c/${community.slug}`);

    return { success: true, community };
  } catch (error) {
    console.error("Error updating layout:", error);
    return { success: false, error: "Failed to update layout" };
  }
}
);

/**
 * Create a new section for community page
 */
export const createCommunitySection = defineAction(
  {
    name: "createCommunitySection",
    auth: "admin",
    args: [
      z.string().min(1).max(64),
      z.object({
        type: z.string().min(1).max(64),
        title: z.string().max(300).optional(),
        content: jsonValueSchema.optional(),
        position: z.number().int().min(0).max(10_000).optional(),
        isVisible: z.boolean().optional(),
        settings: jsonValueSchema.optional(),
      }),
    ],
    community: ([communityId]) => communityById(communityId),
  },
  async (ctx, communityId: string, data: { type: string; title?: string; content?: Prisma.InputJsonValue; position?: number; isVisible?: boolean; settings?: Prisma.InputJsonValue; }) => {
  try {

    const userId = ctx.userId;

    // Verify ownership or admin
    const member = await prisma.member.findUnique({
      where: {
        userId_communityId: {
          userId,
          communityId,
        },
      },
    });

    if (!member || (member.role !== "OWNER" && member.role !== "ADMIN")) {
      return { success: false, error: "Not authorized" };
    }

    // Get max position
    const maxPosition = await prisma.communitySection.findFirst({
      where: { communityId },
      orderBy: { position: "desc" },
      select: { position: true },
    });

    const section = await prisma.communitySection.create({
      data: {
        communityId,
        type: data.type as CommunitySectionType,
        title: data.title,
        content: data.content,
        position: data.position ?? (maxPosition?.position ?? 0) + 1,
        isVisible: data.isVisible ?? true,
        settings: data.settings,
      },
    });

    const community = await prisma.community.findUnique({
      where: { id: communityId },
      select: { slug: true },
    });

    revalidatePath(`/dashboard/c/${community?.slug}`);

    return { success: true, section };
  } catch (error) {
    console.error("Error creating section:", error);
    return { success: false, error: "Failed to create section" };
  }
}
);

/**
 * Update an existing section
 */
export const updateCommunitySection = defineAction(
  {
    name: "updateCommunitySection",
    auth: "admin",
    args: [
      z.string().min(1).max(64),
      z.object({
        title: z.string().max(300).optional(),
        content: jsonValueSchema.optional(),
        isVisible: z.boolean().optional(),
        settings: jsonValueSchema.optional(),
      }),
    ],
    community: ([sectionId]) => communityOfSection(sectionId),
  },
  async (ctx, sectionId: string, data: { title?: string; content?: Prisma.InputJsonValue; isVisible?: boolean; settings?: Prisma.InputJsonValue; }) => {
  try {

    const userId = ctx.userId;

    // Get section to verify ownership
    const section = await prisma.communitySection.findUnique({
      where: { id: sectionId },
      include: {
        community: {
          include: {
            members: {
              where: { userId },
            },
          },
        },
      },
    });

    if (!section) {
      return { success: false, error: "Section not found" };
    }

    const member = section.community.members[0];
    if (!member || (member.role !== "OWNER" && member.role !== "ADMIN")) {
      return { success: false, error: "Not authorized" };
    }

    const updatedSection = await prisma.communitySection.update({
      where: { id: sectionId },
      data,
    });

    revalidatePath(`/dashboard/c/${section.community.slug}`);

    return { success: true, section: updatedSection };
  } catch (error) {
    console.error("Error updating section:", error);
    return { success: false, error: "Failed to update section" };
  }
}
);

/**
 * Delete a section
 */
export const deleteCommunitySection = defineAction(
  {
    name: "deleteCommunitySection",
    auth: "admin",
    args: [z.string().min(1).max(64)],
    community: ([sectionId]) => communityOfSection(sectionId),
  },
  async (ctx, sectionId: string) => {
  try {

    const userId = ctx.userId;

    // Get section to verify ownership
    const section = await prisma.communitySection.findUnique({
      where: { id: sectionId },
      include: {
        community: {
          include: {
            members: {
              where: { userId },
            },
          },
        },
      },
    });

    if (!section) {
      return { success: false, error: "Section not found" };
    }

    const member = section.community.members[0];
    if (!member || (member.role !== "OWNER" && member.role !== "ADMIN")) {
      return { success: false, error: "Not authorized" };
    }

    await prisma.communitySection.delete({
      where: { id: sectionId },
    });

    revalidatePath(`/dashboard/c/${section.community.slug}`);

    return { success: true };
  } catch (error) {
    console.error("Error deleting section:", error);
    return { success: false, error: "Failed to delete section" };
  }
}
);

/**
 * Reorder sections
 */
export const reorderCommunitySections = defineAction(
  {
    name: "reorderCommunitySections",
    auth: "admin",
    args: [z.string().min(1).max(64), z.array(z.string().min(1).max(64)).max(500)],
    community: ([communityId]) => communityById(communityId),
  },
  async (ctx, communityId: string, sectionIds: string[]) => {
  try {

    const userId = ctx.userId;

    // Verify ownership or admin
    const member = await prisma.member.findUnique({
      where: {
        userId_communityId: {
          userId,
          communityId,
        },
      },
    });

    if (!member || (member.role !== "OWNER" && member.role !== "ADMIN")) {
      return { success: false, error: "Not authorized" };
    }

    // Update positions in transaction
    await prisma.$transaction(
      sectionIds.map((id, index) =>
        prisma.communitySection.update({
          where: { id },
          data: { position: index },
        })
      )
    );

    const community = await prisma.community.findUnique({
      where: { id: communityId },
      select: { slug: true },
    });

    revalidatePath(`/dashboard/c/${community?.slug}`);

    return { success: true };
  } catch (error) {
    console.error("Error reordering sections:", error);
    return { success: false, error: "Failed to reorder sections" };
  }
}
);

/**
 * Get community with all sections
 */
export const getCommunityWithSections = defineAction(
  {
    name: "getCommunityWithSections",
    auth: "public",
    args: [z.string().min(1).max(120)],
    rateLimit: "api",
  },
  async (_ctx, slug: string) => {
  try {
    console.log("🔍 getCommunityWithSections - Looking for slug:", slug);

    const community = await prisma.community.findUnique({
      where: { slug },
      include: {
        sections: {
          where: { isVisible: true },
          orderBy: { position: "asc" },
        },
        owner: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        _count: {
          select: {
            members: true,
            posts: true,
            courses: true,
          },
        },
      },
    });

    if (!community) {
      console.log("❌ Community not found with slug:", slug);
      return { success: false, error: "Community not found" };
    }

    console.log("✅ Community found:", community.name, "ID:", community.id);
    return { success: true, community };
  } catch (error) {
    console.error("❌ Error fetching community:", error);
    return { success: false, error: "Failed to fetch community" };
  }
}
);
