"use server";

import { prisma } from "@/lib/prisma";

export interface PublicSessionData {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  status: string;
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
    url: string;
    status: string;
    durationSeconds: number | null;
  } | null;
  notes: {
    id: string;
    content: string;
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

    const data: PublicSessionData = {
      id: session.id,
      slug: session.slug!,
      title: session.title,
      description: session.description,
      status: session.status,
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
      recording: session.recording,
      notes: session.notes,
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
): Promise<{ slug: string; updatedAt: Date }[]> {
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
      },
      orderBy: { updatedAt: "desc" },
      take: limit,
    });
    
    return sessions
      .filter((s): s is { slug: string; updatedAt: Date } => s.slug !== null)
      .map((s) => ({ slug: s.slug, updatedAt: s.updatedAt }));
  } catch (error) {
    console.error("Error fetching sessions for SEO:", error);
    return [];
  }
}