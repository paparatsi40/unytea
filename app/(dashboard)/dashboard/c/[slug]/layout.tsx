import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { getLocale } from "next-intl/server";
import { PremiumCommunityHeader } from "@/components/community/PremiumCommunityHeader";
import { PaywallLockedView } from "@/components/community/PaywallLockedView";
import { VideoUsageBanner } from "@/components/billing/VideoUsageBanner";

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}

async function getCommunity(slug: string) {
  const community = await prisma.community.findUnique({
    where: { slug },
    include: {
      _count: {
        select: {
          members: true,
          posts: true,
        },
      },
    },
  });
  return community;
}

async function getMembership(communityId: string, userId: string) {
  const membership = await prisma.member.findFirst({
    where: {
      communityId,
      userId,
    },
  });
  return membership;
}

export default async function CommunityLayout(props: LayoutProps) {
  const params = await props.params;

  const { children } = props;

  const session = await auth();
  const community = await getCommunity(params.slug);

  if (!community) {
    notFound();
  }

  let membership = null;
  if (session?.user?.id) {
    membership = await getMembership(community.id, session.user.id);
  }

  const isMember = membership?.status === "ACTIVE";
  const isOwner = membership?.role === "OWNER" || community.ownerId === session?.user?.id;
  const isPending = membership?.status === "PENDING";

  /**
   * Who may see the video allowance. Its own boolean, deliberately.
   *
   * `isOwner` above is OWNER-only and is shared with `PremiumCommunityHeader`
   * and the paywall gate below — widening it to reach the banner would quietly
   * change who those two treat as an owner, which is a different decision than
   * the one being made here.
   *
   * This one matches `getCommunityVideoUsage`, which the usage card calls with
   * `roles: ["OWNER", "ADMIN"]`. The banner and the card now answer to the same
   * rule; before this, an admin saw the card and never the warning above it.
   */
  const canSeeVideoUsage =
    membership?.role === "OWNER" ||
    membership?.role === "ADMIN" ||
    community.ownerId === session?.user?.id;

  // Paywall gate: non-owner viewers see the locked screen. Owner passes through
  // to admin views (their dashboard route group will mount the PaywallBanner
  // global banner above the page content).
  if (community.paywallLocked && !isOwner) {
    const locale = await getLocale();
    return (
      <PaywallLockedView
        communityName={community.name}
        communityImageUrl={community.imageUrl}
        locale={locale}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PremiumCommunityHeader
        community={community}
        isMember={isMember}
        isOwner={isOwner}
        isPending={isPending}
      />
      {/* The community's allowance, for the people who administer it — a member
          has no allowance and no way to act on one. Silent below 80%. */}
      {canSeeVideoUsage && (
        <VideoUsageBanner
          communityId={community.id}
          communityName={community.name}
          communitySlug={community.slug}
        />
      )}
      {children}
    </div>
  );
}
