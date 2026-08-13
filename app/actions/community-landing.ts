"use server";

import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { defineAction } from "@/lib/actions/define-action";
import { communityById } from "@/lib/actions/resolvers";
import { buildDefaultLandingLayout } from "@/lib/community-landing-template";
import { revalidatePath } from "next/cache";
import { revalidateLocalizedPath } from "@/lib/cache-invalidation";

/**
 * Resets a community's landingLayout to the default Patreon-style template.
 * Only callable by the community owner. Idempotent — each call regenerates
 * fresh section ids and re-applies the latest template.
 */
export const resetCommunityLandingToDefault = defineAction(
  {
    name: "resetCommunityLandingToDefault",
    auth: "admin",
    args: [z.string().min(1).max(64)],
    community: ([communityId]) => communityById(communityId),
    roles: ["OWNER"],
    rateLimit: "create",
  },
  async (ctx, communityId) => {
  // Atomic ownership check retained on top of the seam's OWNER gate: the
  // ownerId guard in the WHERE clause means a mid-call ownership change cannot
  // slip a write through.
  const community = await prisma.community.findFirst({
    where: { id: communityId, ownerId: ctx.userId },
    include: {
      owner: {
        select: { name: true, image: true },
      },
    },
  });

  if (!community) {
    throw new Error("Community not found or not authorized");
  }

  const layout = buildDefaultLandingLayout({
    name: community.name,
    slug: community.slug,
    description: community.description,
    coverImageUrl: community.coverImageUrl,
    ownerTitle: community.ownerTitle,
    ownerBio: community.ownerBio,
    owner: community.owner,
  });

  // Re-assert ownership in the update WHERE clause so a mid-call ownership
  // change / deletion can't slip a write through. Persist the bare sections
  // array — landingLayout stores SectionInstance[].
  const result = await prisma.community.updateMany({
    where: { id: communityId, ownerId: ctx.userId },
    data: { landingLayout: layout.sections as unknown as Prisma.InputJsonValue },
  });

  if (result.count === 0) {
    throw new Error("Failed to update — community may have been modified");
  }

  revalidatePath(`/dashboard/c/${community.slug}/settings/landing`);
  revalidateLocalizedPath(`/c/${community.slug}`);

  return { success: true as const };
  }
);
