import { prisma } from "@/lib/prisma";

/**
 * The paywall gate, factored out so `defineAction`'s `member`/`admin` levels and
 * the row-level guards in `guards.ts` cannot drift apart.
 *
 * A community whose owner's platform subscription lapsed is `paywallLocked`.
 * Everyone is held at the paywall except the owner, who must still be able to
 * reach their own community to fix billing.
 */
export async function isPaywallBlocked(communityId: string, userId: string): Promise<boolean> {
  const community = await prisma.community.findUnique({
    where: { id: communityId },
    select: { paywallLocked: true, ownerId: true },
  });

  return Boolean(community?.paywallLocked) && community?.ownerId !== userId;
}
