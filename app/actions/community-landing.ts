"use server";

import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildDefaultLandingLayout } from "@/lib/community-landing-template";
import { revalidatePath } from "next/cache";

/**
 * Resets a community's landingLayout to the default Patreon-style template.
 * Only callable by the community owner. Idempotent — each call regenerates
 * fresh section ids and re-applies the latest template.
 */
export async function resetCommunityLandingToDefault(communityId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  // Atomic ownership check: the ownerId guard in the WHERE clause means a
  // non-owner simply gets no row back (no separate ownerId comparison).
  const community = await prisma.community.findFirst({
    where: { id: communityId, ownerId: session.user.id },
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
    where: { id: communityId, ownerId: session.user.id },
    data: { landingLayout: layout.sections as unknown as Prisma.InputJsonValue },
  });

  if (result.count === 0) {
    throw new Error("Failed to update — community may have been modified");
  }

  revalidatePath(`/dashboard/c/${community.slug}/settings/landing`);
  revalidatePath(`/c/${community.slug}`);

  return { success: true };
}
