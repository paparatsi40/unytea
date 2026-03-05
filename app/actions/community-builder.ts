"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserId } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";

/**
 * Update community theme (colors, fonts, hero)
 */
export async function updateCommunityTheme(communityId: string, data: {
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  fontFamily?: string;
  heroTitle?: string;
  heroSubtitle?: string;
  heroCTA?: string;
  heroCTALink?: string;
  aboutSection?: string;
  showStats?: boolean;
  showMembers?: boolean;
  showCourses?: boolean;
  customCSS?: string;
}) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

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

    // Update community
    const community = await prisma.community.update({
      where: { id: communityId },
      data,
    });

    revalidatePath(`/dashboard/c/${community.slug}`);
    revalidatePath(`/dashboard/c/${community.slug}/settings`);

    return { success: true, community };
  } catch (error) {
    console.error("Error updating community theme:", error);
    return { success: false, error: "Failed to update theme" };
  }
}

/**
 * Update community layout type
 */
export async function updateCommunityLayout(
  communityId: string,
  layoutType: "MODERN_GRID" | "CLASSIC_FORUM" | "ACADEMY" | "DASHBOARD" | "MINIMALIST"
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

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

/**
 * Create a new section for community page
 */
export async function createCommunitySection(communityId: string, data: {
  type: string;
  title?: string;
  content?: any;
  position?: number;
  isVisible?: boolean;
  settings?: any;
}) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

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
        type: data.type as any,
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

/**
 * Update an existing section
 */
export async function updateCommunitySection(
  sectionId: string,
  data: {
    title?: string;
    content?: any;
    isVisible?: boolean;
    settings?: any;
  }
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

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

/**
 * Delete a section
 */
export async function deleteCommunitySection(sectionId: string) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

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

/**
 * Reorder sections
 */
export async function reorderCommunitySections(
  communityId: string,
  sectionIds: string[]
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

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

/**
 * Get community with all sections
 */
export async function getCommunityWithSections(slug: string) {
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
