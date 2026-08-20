"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { defineAction } from "@/lib/actions/define-action";
import { communityById, communityOfSession } from "@/lib/actions/resolvers";

/**
 * Get upcoming session for a community (for pre-session discussion block)
 */
export const getCommunityUpcomingSession = defineAction(
  {
    name: "getCommunityUpcomingSession",
    auth: "member",
    args: [z.string().min(1).max(64)],
    community: ([communityId]) => communityById(communityId),
  },
  async (_ctx, communityId: string) => {
    try {
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
);

/**
 * Get hot discussions (posts with most comments) for a community
 */
export const getCommunityHotDiscussions = defineAction(
  {
    name: "getCommunityHotDiscussions",
    auth: "member",
    args: [z.string().min(1).max(64), z.number().int().min(1).max(50).default(5)],
    community: ([communityId]) => communityById(communityId),
  },
  async (_ctx, communityId: string, limit: number = 5) => {
    try {
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
        orderBy: [{ comments: { _count: "desc" } }, { createdAt: "desc" }],
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
);

/**
 * Get pinned session recap (recording ready) for a community
 */
export const getCommunityPinnedRecap = defineAction(
  {
    name: "getCommunityPinnedRecap",
    auth: "member",
    args: [z.string().min(1).max(64)],
    community: ([communityId]) => communityById(communityId),
  },
  async (_ctx, communityId: string) => {
    try {
      // Get the most recent completed session with recording
      const session = await prisma.mentorSession.findFirst({
        where: {
          communityId,
          status: "COMPLETED",
          recording: {
            isNot: null,
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
          keyTakeaways: null,
        },
      };
    } catch (error) {
      console.error("Error getting pinned recap:", error);
      return { success: false, error: "Failed to load recap" };
    }
  }
);

/**
 * Get dynamic state for session announcement cards (pre/live/recording/discussion)
 */
export const getSessionFeedState = defineAction(
  {
    name: "getSessionFeedState",
    auth: "member",
    args: [z.string().min(1).max(64)],
    community: ([sessionId]) => communityOfSession(sessionId),
  },
  async (_ctx, sessionId: string) => {
    try {
      const session = await prisma.mentorSession.findUnique({
        where: { id: sessionId },
        select: {
          id: true,
          status: true,
          communityId: true,
          recording: {
            select: {
              id: true,
              status: true,
              url: true,
            },
          },
        },
      });

      if (!session) {
        return { success: false, error: "Session not found" };
      }

      let discussionCount = 0;
      if (session.communityId) {
        const questionPosts = await prisma.post.findMany({
          where: {
            communityId: session.communityId,
            contentType: "QUESTION",
          },
          select: {
            id: true,
            attachments: true,
          },
        });

        discussionCount = questionPosts.filter((p) => {
          const att = p.attachments as { targetSessionId?: string } | null;
          return att?.targetSessionId === sessionId;
        }).length;
      }

      const hasRecording = !!session.recording?.url;

      return {
        success: true,
        state: {
          status: session.status,
          hasRecording,
          recordingUrl: session.recording?.url || null,
          discussionCount,
        },
      };
    } catch (error) {
      console.error("Error getting session feed state:", error);
      return { success: false, error: "Failed to load session state" };
    }
  }
);
