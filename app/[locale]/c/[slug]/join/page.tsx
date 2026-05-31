import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ plan?: string }>;
};

/**
 * Stub join flow for community membership.
 *
 * Behavior:
 * - Not authenticated → redirect to /auth/signin with callbackUrl back here.
 * - Authenticated + free community → ensure Member row + redirect to /c/{slug}.
 * - Authenticated + paid community → redirect to the community landing's tier
 *   section (/c/{slug}#tiers).
 *
 * Full Stripe community-checkout flow for paid tiers is a tracked follow-up.
 * This stub exists to remove the 404 that default-template Hero/CTA/tier CTAs
 * would otherwise hit.
 *
 * Routing notes:
 * - /auth/signin is root-mounted (no locale prefix) and reads `callbackUrl`,
 *   matching every other dashboard auth redirect in the app.
 * - There is no /dashboard/c/{slug}/upgrade route; /dashboard/upgrade is the
 *   HOST platform-plan pricing (wrong audience for a prospective member), so
 *   paid joins land on the community's own tiers instead.
 */
export default async function CommunityJoinPage(props: Props) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  setRequestLocale(params.locale);

  const session = await auth();
  const callbackUrl = `/${params.locale}/c/${params.slug}/join${
    searchParams.plan ? `?plan=${searchParams.plan}` : ""
  }`;

  if (!session?.user?.id) {
    redirect(`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  const community = await prisma.community.findUnique({
    where: { slug: params.slug },
    select: { id: true, isPaid: true, slug: true },
  });

  if (!community) {
    redirect(`/${params.locale}/explore`);
  }

  // Free community: ensure an ACTIVE Member row exists; only bump the
  // denormalized memberCount when a brand-new membership is created (avoids
  // over-counting on repeat visits to /join).
  if (!community.isPaid) {
    const existing = await prisma.member.findUnique({
      where: {
        userId_communityId: {
          userId: session.user.id,
          communityId: community.id,
        },
      },
      select: { id: true, status: true },
    });

    if (!existing) {
      await prisma.$transaction([
        prisma.member.create({
          data: {
            userId: session.user.id,
            communityId: community.id,
            role: "MEMBER",
            status: "ACTIVE",
          },
        }),
        prisma.community.update({
          where: { id: community.id },
          data: { memberCount: { increment: 1 } },
        }),
      ]);
    } else if (existing.status !== "ACTIVE") {
      await prisma.member.update({
        where: { id: existing.id },
        data: { status: "ACTIVE" },
      });
    }

    redirect(`/${params.locale}/c/${community.slug}`);
  }

  // Paid community: full checkout flow is a follow-up. Send the visitor back
  // to the community's tier section to choose a plan.
  redirect(`/${params.locale}/c/${community.slug}#tiers`);
}
