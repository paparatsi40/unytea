"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth-utils";

export interface RecommendedPost {
  id: string;
  title: string | null;
  content: string;
  author: {
    name: string | null;
  };
  _count: {
    comments: number;
    reactions: number;
  };
  createdAt: Date;
  relevanceScore: number;
}

/**
 * Get recommended posts for a user in a community
 */
export async function getRecommendedPosts(
  communitySlug: string,
  limit: number = 5
): Promise<RecommendedPost[]> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Get user's interaction history
    const [userReactions, userComments] = await Promise.all([
      prisma.reaction.findMany({
        where: { userId },
        select: { postId: true },
        take: 20,
      }),
      prisma.comment.findMany({
        where: { authorId: userId },
        select: { postId: true },
        take: 20,
      }),
    ]);

    const interactedPostIds = [
      ...userReactions.map((r) => r.postId),
      ...userComments.map((c) => c.postId),
    ].filter((id): id is string => id !== null);

    // Get trending posts user hasn't interacted with
    const posts = await prisma.post.findMany({
      where: {
        community: { slug: communitySlug },
        id: { notIn: interactedPostIds },
      },
      select: {
        id: true,
        title: true,
        content: true,
        createdAt: true,
        author: {
          select: { name: true },
        },
        _count: {
          select: {
            comments: true,
            reactions: true,
          },
        },
      },
      orderBy: [
        { createdAt: "desc" }, // Recent first
      ],
      take: 20,
    });

    // Calculate relevance score
    const postsWithScore = posts.map((post) => {
      // Simple relevance algorithm:
      // - Recency (newer = better)
      // - Engagement (more interactions = better)
      const daysSinceCreated = (Date.now() - post.createdAt.getTime()) / (1000 * 60 * 60 * 24);
      const recencyScore = Math.max(0, 10 - daysSinceCreated);
      const engagementScore = post._count.comments * 2 + post._count.reactions;
      
      const relevanceScore = recencyScore + engagementScore;

      return {
        ...post,
        relevanceScore,
      };
    });

    // Sort by relevance and return top N
    return postsWithScore
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, limit);
  } catch (error) {
    console.error("Recommendation error:", error);
    return [];
  }
}

/**
 * Get personalized feed for user
 */
export async function getPersonalizedFeed(communitySlug: string) {
  try {
    const recommendedPosts = await getRecommendedPosts(communitySlug, 5);

    return {
      posts: recommendedPosts,
      members: [],
    };
  } catch (error) {
    console.error("Feed error:", error);
    return {
      posts: [],
      members: [],
    };
  }
}