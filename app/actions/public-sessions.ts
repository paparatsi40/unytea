"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth-utils";
import { PostContentType, Prisma } from "@prisma/client";

function safeParseStringArray(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === "string") : [];
  } catch {
    return [];
  }
}

function safeParseResources(value: string | null): any[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function safeParseChapters(value: string | null): { title: string; timestamp?: string }[] {
  return safeParseResources(value)
    .filter((r) => r?.type === "chapter" && typeof r?.title === "string")
    .map((r) => ({ title: r.title as string, timestamp: typeof r.timestamp === "string" ? r.timestamp : undefined }));
}

function safeParseQuotes(value: string | null): { text: string; reason?: string }[] {
  return safeParseResources(value)
    .filter((r) => r?.type === "quote" && typeof r?.text === "string")
    .map((r) => ({ text: r.text as string, reason: typeof r.reason === "string" ? r.reason : undefined }));
}

export interface PublicSessionData {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  status: string;
  visibility: string;
  canWatchRecording: boolean;
  isMember: boolean;
  scheduledAt: Date;
  duration: number | null;
  attendeeCount: number;
  host: {
    id: string;
    name: string | null;
    image: string | null;
    bio: string | null;
  };
  community: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    imageUrl: string | null;
    memberCount: number;
  };
  recording: {
    id: string;
    url: string | null;
    status: string;
    durationSeconds: number | null;
  } | null;
  notes: {
    id: string;
    content: string;
    summary: string | null;
    keyInsights: string[];
    chapters: { title: string; timestamp?: string }[];
    quotes: { text: string; reason?: string }[];
    createdAt: Date;
  } | null;
}

export async function getPublicSession(
  slug: string
): Promise<{ success: boolean; session?: PublicSessionData; error?: string }> {
  try {
    const session = await prisma.mentorSession.findUnique({
      where: { slug },
      include: {
        mentor: {
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
            description: true,
            imageUrl: true,
            _count: {
              select: { members: true },
            },
          },
        },
        recording: {
          where: { status: "READY" },
          select: {
            id: true,
            url: true,
            status: true,
            durationSeconds: true,
          },
        },
        notes: {
          select: {
            id: true,
            content: true,
            summary: true,
            keyInsights: true,
            resources: true,
            createdAt: true,
          },
        },
        _count: {
          select: { participations: true },
        },
      },
    });

    if (!session) {
      return { success: false, error: "Session not found" };
    }

    // Only show completed sessions with recordings
    if (session.status !== "COMPLETED" || !session.recording) {
      return { success: false, error: "Session not available" };
    }

    if (!session.community) {
      return { success: false, error: "Session community not found" };
    }

    const viewerId = await getCurrentUserId();
    let isMember = false;

    if (viewerId) {
      const membership = await prisma.member.findUnique({
        where: {
          userId_communityId: {
            userId: viewerId,
            communityId: session.community.id,
          },
        },
        select: { status: true },
      });
      isMember = membership?.status === "ACTIVE";
    }

    const canWatchRecording = session.visibility !== "community" || isMember;

    const data: PublicSessionData = {
      id: session.id,
      slug: session.slug!,
      title: session.title,
      description: session.description,
      status: session.status,
      visibility: session.visibility,
      canWatchRecording,
      isMember,
      scheduledAt: session.scheduledAt,
      duration: session.duration,
      attendeeCount: session._count.participations,
      host: {
        id: session.mentor.id,
        name: session.mentor.name,
        image: session.mentor.image,
        bio: null, // Could be added to User model
      },
      community: {
        id: session.community.id,
        name: session.community.name,
        slug: session.community.slug,
        description: session.community.description,
        imageUrl: session.community.imageUrl,
        memberCount: session.community._count.members,
      },
      recording: session.recording
        ? {
            ...session.recording,
            url: canWatchRecording ? session.recording.url : null,
          }
        : null,
      notes: session.notes
        ? {
            id: session.notes.id,
            content: session.notes.content,
            summary: session.notes.summary,
            keyInsights: safeParseStringArray(session.notes.keyInsights),
            chapters: safeParseChapters(session.notes.resources),
            quotes: safeParseQuotes(session.notes.resources),
            createdAt: session.notes.createdAt,
          }
        : null,
    };

    return { success: true, session: data };
  } catch (error) {
    console.error("Error fetching public session:", error);
    return { success: false, error: "Failed to load session" };
  }
}

export async function getRelatedSessions(
  communityId: string,
  currentSessionId: string,
  limit: number = 3
): Promise<{ success: boolean; sessions?: any[]; error?: string }> {
  try {
    const sessions = await prisma.mentorSession.findMany({
      where: {
        communityId,
        id: { not: currentSessionId },
        status: "COMPLETED",
        recording: { status: "READY" },
      },
      include: {
        mentor: {
          select: { id: true, name: true, image: true },
        },
        recording: {
          select: { durationSeconds: true },
        },
        _count: {
          select: { participations: true },
        },
      },
      orderBy: { scheduledAt: "desc" },
      take: limit,
    });

    const formatted = sessions.map((s) => ({
      id: s.id,
      slug: s.slug,
      title: s.title,
      description: s.description,
      scheduledAt: s.scheduledAt,
      host: s.mentor,
      attendeeCount: s._count.participations,
      duration: s.recording?.durationSeconds,
    }));

    return { success: true, sessions: formatted };
  } catch (error) {
    console.error("Error fetching related sessions:", error);
    return { success: false, error: "Failed to load related sessions" };
  }
}

// Alias for compatibility with existing code
export async function getPublicSessionBySlug(
  slug: string
): Promise<any | null> {
  const result = await getPublicSession(slug);
  if (!result.success || !result.session) return null;
  
      // Transform to legacy format expected by other components
    const session = result.session;
    return {
      ...session,
      mentor: session.host,
      community: {
        ...session.community,
        imageUrl: session.community.imageUrl,
      },
    };
}

// For sitemap generation
export async function getPublicSessionsForSEO(
  limit: number = 100
): Promise<{ slug: string; updatedAt: Date; scheduledAt: Date }[]> {
  try {
    const sessions = await prisma.mentorSession.findMany({
      where: {
        status: "COMPLETED",
        recording: { status: "READY" },
        slug: { not: null },
      },
      select: {
        slug: true,
        updatedAt: true,
        scheduledAt: true,
      },
      orderBy: { updatedAt: "desc" },
      take: limit,
    });

    return sessions
      .filter((s): s is { slug: string; updatedAt: Date; scheduledAt: Date } => s.slug !== null)
      .map((s) => ({ slug: s.slug, updatedAt: s.updatedAt, scheduledAt: s.scheduledAt }));
  } catch (error) {
    console.error("Error fetching sessions for SEO:", error);
    return [];
  }
}

export async function getNextCommunitySession(communityId: string) {
  try {
    const nextSession = await prisma.mentorSession.findFirst({
      where: {
        communityId,
        status: "SCHEDULED",
        scheduledAt: { gt: new Date() },
      },
      orderBy: { scheduledAt: "asc" },
      select: {
        id: true,
        title: true,
        scheduledAt: true,
        duration: true,
      },
    });

    return { success: true, session: nextSession ?? null };
  } catch (error) {
    console.error("Error fetching next community session:", error);
    return { success: false, error: "Failed to load next session" };
  }
}

export async function askQuestionForNextSession(params: {
  communityId: string;
  question: string;
}) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, error: "Not authenticated" };
    }

    const question = params.question.trim();
    if (question.length < 5) {
      return { success: false, error: "Question is too short" };
    }

    const membership = await prisma.member.findUnique({
      where: {
        userId_communityId: {
          userId,
          communityId: params.communityId,
        },
      },
      select: { status: true },
    });

    if (!membership || membership.status !== "ACTIVE") {
      return { success: false, error: "Join the community to ask questions" };
    }

    const nextSession = await prisma.mentorSession.findFirst({
      where: {
        communityId: params.communityId,
        status: "SCHEDULED",
        scheduledAt: { gt: new Date() },
      },
      orderBy: { scheduledAt: "asc" },
      select: {
        id: true,
        title: true,
      },
    });

    if (!nextSession) {
      return { success: false, error: "No upcoming session available" };
    }

    const post = await prisma.post.create({
      data: {
        title: `❓ Question for next session: ${nextSession.title}`,
        content: question,
        contentType: PostContentType.QUESTION,
        authorId: userId,
        communityId: params.communityId,
        attachments: {
          targetSessionId: nextSession.id,
          targetSessionTitle: nextSession.title,
          source: "public_session_page",
        } as Prisma.InputJsonValue,
      },
    });

    return { success: true, postId: post.id, sessionId: nextSession.id };
  } catch (error) {
    console.error("Error creating pre-session question:", error);
    return { success: false, error: "Failed to submit question" };
  }
}