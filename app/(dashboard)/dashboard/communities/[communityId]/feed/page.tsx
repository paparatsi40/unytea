import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { PostFeed } from "@/components/community/PostFeed";
import { Home, Sparkles } from "lucide-react";

export default async function CommunityFeedPage({
  params,
}: {
  params: { communityId: string };
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  // Fetch community
  const community = await prisma.community.findFirst({
    where: {
      id: params.communityId,
    },
    include: {
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

  // Fetch posts for this community
  const posts = await prisma.post.findMany({
    where: {
      communityId: params.communityId,
      isPublished: true,
    },
    include: {
      author: {
        select: {
          id: true,
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

      <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
        <div className="container py-8">
          <PostFeed
            communityId={params.communityId}
            initialPosts={transformedPosts}
          />
        </div>
      </div>
    </div>
  );
}
