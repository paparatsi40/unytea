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

  const community = await prisma.community.findUnique({
    where: { id: communityId },
    include: {
      owner: {
        select: { name: true, image: true },
      },
    },
  });

  if (!community) {
    throw new Error("Community not found");
  }

  if (community.ownerId !== session.user.id) {
    throw new Error("Forbidden — only owner can reset template");
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

  await prisma.community.update({
    where: { id: communityId },
    // Persist the bare sections array — landingLayout stores SectionInstance[].
    data: { landingLayout: layout.sections as unknown as Prisma.InputJsonValue },
  });

  revalidatePath(`/dashboard/c/${community.slug}/settings/landing`);
  revalidatePath(`/c/${community.slug}`);

  return { success: true };
}
