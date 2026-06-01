import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { getCommunityWithSections } from "@/app/actions/community-builder";
import { prisma } from "@/lib/prisma";
import { joinCommunity } from "@/app/actions/communities";
import { CommunityGateView } from "./CommunityGateView";

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function CommunityPage(props: PageProps) {
  const params = await props.params;
  const { slug } = params;

  const session = await auth();

  // Server action bound to this community for the join CTA. Passed to the
  // client gate view (which localizes its own strings — the dashboard route
  // group has no [locale] segment for server getTranslations).
  async function handleJoin(communityId: string, communitySlug: string) {
    "use server";
    const inner = await auth();
    if (!inner?.user?.id) {
      redirect("/auth/signin");
    }
    const result = await joinCommunity(communityId);
    if (result.success) {
      redirect(`/dashboard/c/${communitySlug}`);
    }
  }

  if (!session?.user?.id) {
    // For non-logged-in users, show public landing / join page
    const result = await getCommunityWithSections(slug);
    if (!result.success || !result.community) {
      notFound();
    }
    const community = result.community;
    return (
      <CommunityGateView
        state="join"
        community={{ name: community.name, description: community.description }}
        onJoin={handleJoin.bind(null, community.id, community.slug)}
      />
    );
  }

  // Get community data
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

  if (!community) {
    notFound();
  }

  // Check membership
  const membership = await prisma.member.findFirst({
    where: {
      communityId: community.id,
      userId: session.user.id,
    },
  });

  // If not a member, show join page
  if (!membership) {
    return (
      <CommunityGateView
        state="join"
        community={{
          name: community.name,
          description: community.description,
          members: community._count?.members ?? 0,
          posts: community._count?.posts ?? 0,
        }}
        onJoin={handleJoin.bind(null, community.id, community.slug)}
      />
    );
  }

  // If membership is pending, show pending message
  if (membership.status === "PENDING") {
    return <CommunityGateView state="pending" community={{ name: community.name }} />;
  }

  // If membership is not active (suspended/banned)
  if (membership.status !== "ACTIVE") {
    return <CommunityGateView state="denied" community={{ name: community.name }} />;
  }

  // If active member or owner, redirect to FEED (not chat)
  redirect(`/dashboard/c/${community.slug}/feed`);
}
