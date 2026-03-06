import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { PremiumCommunityHeader } from "@/components/community/PremiumCommunityHeader";

interface LayoutProps {
  children: React.ReactNode;
  params: { slug: string };
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

export default async function CommunityLayout({
  children,
  params,
}: LayoutProps) {
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
  const isOwner = membership?.role === "OWNER";
  const isPending = membership?.status === "PENDING";

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
