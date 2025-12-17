import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { PostFeed } from "@/components/community/PostFeed";
import { WelcomeBanner } from "@/components/community/WelcomeBanner";
import { Home, Sparkles } from "lucide-react";

export default async function CommunityFeedPage({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}) {
  const { slug, locale } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  // Fetch community
  const community = await prisma.community.findFirst({
    where: {
      slug: slug,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      isPrivate: true,
      ownerId: true,
      welcomeMessage: true,
      showWelcomeMessage: true,
      owner: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
    },
  });

  if (!community) {
    redirect("/dashboard");
  }

  // Check if user is member or owner
  const isOwner = community.ownerId === session.user.id;
  const membership = await prisma.member.findFirst({
    where: {
      communityId: community.id,
      userId: session.user.id,
    },
    select: {
      id: true,
      welcomeMessageSeen: true,
    },
  });

  // Redirect non-members to community preview page
  if (!isOwner && !membership) {
    // If community is private, show error message
    if (community.isPrivate) {
      redirect(`/${locale}/dashboard?error=private-community`);
    }
    redirect(`/${locale}/dashboard/communities/${slug}`);
  }

  // Determine if we should show welcome banner
  const showWelcomeBanner = 
    !isOwner && // Don't show to owner
    membership && // User must be a member
    !membership.welcomeMessageSeen && // Haven't seen it yet
    community.showWelcomeMessage && // Community has it enabled
    community.welcomeMessage; // There is a message to show

  // Fetch posts for this community
  const posts = await prisma.post.findMany({
    where: {
      communityId: community.id,
      isPublished: true,
    },
    include: {
      author: {
        select: {
          id: true,
          username: true,
          name: true,
          firstName: true,
          lastName: true,
          image: true,
        },
      },
      _count: {
        select: {
          comments: true,
          reactions: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 50, // Limit to 50 posts for performance
  });

  // Transform posts to match PostFeed component expectations
  const transformedPosts = posts.map((post) => ({
    id: post.id,
    title: post.title,
    content: post.content,
    createdAt: post.createdAt,
    author: {
      id: post.author.id,
      username: post.author.username,
      name: post.author.name,
      firstName: post.author.firstName,
      lastName: post.author.lastName,
      imageUrl: post.author.image,
    },
    _count: {
      comments: post._count.comments,
      reactions: post._count.reactions,
    },
  }));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          {community.name} - Feed
        </h1>
        <p className="mt-2 text-muted-foreground">
          {community.description || "Welcome to your community feed"}
        </p>
      </div>

      {/* Welcome Banner for New Members */}
      {showWelcomeBanner && community.welcomeMessage && (
        <WelcomeBanner
          communitySlug={community.slug}
          communityName={community.name}
          welcomeMessage={community.welcomeMessage}
        />
      )}

      <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
        <div className="container py-8">
          <PostFeed
            communityId={community.id}
            initialPosts={transformedPosts}
          />
        </div>
      </div>
    </div>
  );
}
