import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { getCommunityWithSections } from "@/app/actions/community-builder";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { joinCommunity } from "@/app/actions/communities";
import Link from "next/link";
import { Lock, ArrowLeft } from "lucide-react";

interface PageProps {
  params: {
    slug: string;
  };
}

import { Community } from "@prisma/client";

interface CommunityStats {
  _count: {
    members: number;
    posts: number;
  };
}

// Component for Join Community UI - PUBLIC LANDING PAGE
function JoinCommunityView({ community, stats }: { community: Community; stats?: CommunityStats | null }) {
  async function handleJoin() {
    "use server";
    const session = await auth();
    if (!session?.user?.id) {
      redirect("/auth/signin");
    }
    
    const result = await joinCommunity(community.id);
    if (result.success) {
      redirect(`/dashboard/c/${community.slug}`);
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="relative overflow-hidden bg-gradient-to-br from-purple-900 via-purple-700 to-pink-600 py-24">
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-white mb-4">{community.name}</h1>
            {community.description && (
              <p className="text-xl text-white/80 mb-8 max-w-2xl mx-auto">{community.description}</p>
            )}
            <div className="flex items-center justify-center gap-4 text-white/60 mb-8">
              <span>{stats?._count?.members || 0} members</span>
              <span>•</span>
              <span>{stats?._count?.posts || 0} posts</span>
            </div>
            <form action={handleJoin}>
              <Button type="submit" size="lg" className="bg-white text-purple-900 hover:bg-white/90">
                Join Community
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default async function CommunityPage({ params }: PageProps) {
  const { slug } = params;
  
  const session = await auth();
  
  if (!session?.user?.id) {
    // For non-logged in users, show public landing page
    const result = await getCommunityWithSections(slug);
    
    if (!result.success || !result.community) {
      notFound();
    }
    
    const community = result.community;
    
    return <JoinCommunityView community={community} />;
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
    const stats: CommunityStats | null = community._count ? {
      _count: {
        members: community._count.members || 0,
        posts: community._count.posts || 0,
      }
    } : null;
    return <JoinCommunityView community={community} stats={stats} />;
  }

  // If membership is pending, show pending message
  if (membership.status === "PENDING") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
        <div className="container mx-auto px-4 py-16">
          <div className="mx-auto max-w-2xl">
            <Link href="/dashboard/communities">
              <Button variant="ghost" className="mb-6 flex items-center space-x-2">
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Communities</span>
              </Button>
            </Link>

            <div className="rounded-2xl border border-border bg-card p-8 shadow-xl text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10">
                <Lock className="h-8 w-8 text-amber-500" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">
                Membership Pending
              </h1>
              <p className="mt-2 text-muted-foreground">
                Your request to join <strong>{community.name}</strong> is pending approval.
                You'll be notified when the community owner reviews your request.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If membership is not active (suspended/banned)
  if (membership.status !== "ACTIVE") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
        <div className="container mx-auto px-4 py-16">
          <div className="mx-auto max-w-2xl">
            <Link href="/dashboard/communities">
              <Button variant="ghost" className="mb-6 flex items-center space-x-2">
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Communities</span>
              </Button>
            </Link>

            <div className="rounded-2xl border border-border bg-card p-8 shadow-xl text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
                <Lock className="h-8 w-8 text-red-500" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">
                Access Denied
              </h1>
              <p className="mt-2 text-muted-foreground">
                Your access to <strong>{community.name}</strong> has been restricted.
                Please contact the community owner for more information.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If active member or owner, redirect to chat where the navigation tabs are visible
  redirect(`/dashboard/c/${community.slug}/chat`);
}
