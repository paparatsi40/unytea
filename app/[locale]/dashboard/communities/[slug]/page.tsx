import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CommunityPreview } from "@/components/community/CommunityPreview";

export default async function CommunityPage({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}) {
  const { slug, locale } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  // Get community and membership
  const community = await prisma.community.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      imageUrl: true,
      coverImageUrl: true,
      isPaid: true,
      membershipPrice: true,
      isPrivate: true,
      requireApproval: true,
      ownerId: true,
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
    redirect("/dashboard/communities");
  }

  const membership = await prisma.member.findFirst({
    where: {
      communityId: community.id,
      userId: session.user.id,
    },
  });

  const isOwner = community.ownerId === session.user.id;
  const isMember = !!membership;

  // If user is member or owner, redirect to feed
  if (isMember || isOwner) {
    redirect(`/${locale}/dashboard/communities/${slug}/feed`);
  }

  // Otherwise, show community preview/landing page
  return (
    <CommunityPreview
      community={community}
      locale={locale}
    />
  );
}
