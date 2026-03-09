import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Get personalized feed posts from user's communities
 * GET /api/feed/posts
 */
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Get user's community memberships
    const memberships = await prisma.member.findMany({
      where: {
        userId,
        status: "ACTIVE",
      },
      select: {
        communityId: true,
      },
    });

    const communityIds = memberships.map((m) => m.communityId);

    if (communityIds.length === 0) {
      return NextResponse.json({ posts: [] });
    }

    // Get posts from user's communities
    const posts = await prisma.post.findMany({
      where: {
        communityId: {
          in: communityIds,
        },
        isPinned: false,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 20,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        community: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        _count: {
          select: {
            reactions: true,
            comments: true,
          },
        },
        reactions: {
          where: {
            userId,
          },
          select: {
            type: true,
          },
        },
      },
    });

    // Format posts for the feed
    const formattedPosts = posts.map((post) => {
      // Parse attachments to get images
      let image = null;
      try {
        const attachments = post.attachments as any;
        if (attachments && attachments.images && attachments.images.length > 0) {
          image = attachments.images[0];
        }
      } catch {
        // Ignore parsing errors
      }
      
      return {
        id: post.id,
        author: {
          name: post.author.name || "Anonymous",
          avatar: post.author.image || "",
          role: "Member",
          community: post.community.name,
        },
        content: post.content,
        image: image,
        likes: post._count.reactions,
        comments: post._count.comments,
        shares: 0,
        timestamp: formatTimestamp(post.createdAt),
        isLiked: post.reactions.length > 0,
        tags: [],
      };
    });

    return NextResponse.json({ posts: formattedPosts });
  } catch (error: any) {
    console.error("Error fetching feed posts:", error);
    return NextResponse.json(
      { error: "Failed to fetch posts" },
      { status: 500 }
    );
  }
}

function formatTimestamp(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
