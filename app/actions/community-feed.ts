"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth-utils";

/**
 * Get upcoming session for a community (for pre-session discussion block)
 */
export async function getCommunityUpcomingSession(communityId: string) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    const now = new Date();
    const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const session = await prisma.mentorSession.findFirst({
      where: {
        communityId,
        scheduledAt: {
          gte: now,
          lte: oneWeekFromNow, // Only sessions within next week
        },
        status: { in: ["SCHEDULED", "IN_PROGRESS"] },
      },
      include: {
        mentor: { select: { id: true, name: true, image: true } },
        participations: { select: { id: true } },
      },
      orderBy: { scheduledAt: "asc" },
    });

    if (!session) {
      return { success: true, session: null };
    }

    return {
      success: true,
      session: {
        id: session.id,
        title: session.title,
        slug: session.slug,
        scheduledAt: session.scheduledAt,
        duration: session.duration,
        mode: session.mode,
        mentorName: session.mentor?.name,
        mentorImage: session.mentor?.image,
        attendeeCount: session.participations.length,
      },
    };
  } catch (error) {
    console.error("Error getting upcoming session:", error);
    return { success: false, error: "Failed to load session" };
  }
}

/**
 * Get hot discussions (posts with most comments) for a community
 */
export async function getCommunityHotDiscussions(
  communityId: string,
  limit: number = 5
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    // Get posts with comment count, ordered by popularity
    const posts = await prisma.post.findMany({
      where: {
        communityId,
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
        },
      },
      include: {
        _count: {
          select: { comments: true },
        },
        author: { select: { name: true } },
      },
      orderBy: [
        { comments: { _count: "desc" } },
        { createdAt: "desc" },
      ],
      take: limit,
    });

    const hotTopics = posts.map((post) => ({
      id: post.id,
      title: post.title || post.content.substring(0, 50) + "...",
      commentCount: post._count.comments,
      authorName: post.author.name,
    }));

    return {
      success: true,
      topics: hotTopics,
    };
  } catch (error) {
    console.error("Error getting hot discussions:", error);
    return { success: false, error: "Failed to load discussions" };
  }
}

/**
 * Get pinned session recap (recording ready) for a community
 */
export async function getCommunityPinnedRecap(communityId: string) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    // Get the most recent completed session with recording
    const session = await prisma.mentorSession.findFirst({
      where: {
        communityId,
        status: "COMPLETED",
        recording: {
          isNot: null,
          url: { not: null },
        },
      },
      include: {
        mentor: { select: { name: true, image: true } },
        recording: true,
        _count: {
          select: { participations: true },
        },
      },
      orderBy: { endedAt: "desc" },
    });

    if (!session) {
      return { success: true, recap: null };
    }

    return {
      success: true,
      recap: {
        id: session.id,
        title: session.title,
        slug: session.slug,
        mentorName: session.mentor?.name,
        mentorImage: session.mentor?.image,
        recordingUrl: session.recording?.url,
        attendeeCount: session._count.participations,
        endedAt: session.endedAt,
        keyTakeaways: session.notes?.content?.substring(0, 200) || null,
      },
    };
  } catch (error) {
    console.error("Error getting pinned recap:", error);
    return { success: false, error: "Failed to load recap" };
  }
}
