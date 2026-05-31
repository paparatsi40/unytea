import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { getLocale } from "next-intl/server";
import { PremiumCommunityHeader } from "@/components/community/PremiumCommunityHeader";
import { PaywallLockedView } from "@/components/community/PaywallLockedView";

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
      {children}
    </div>
  );
}
