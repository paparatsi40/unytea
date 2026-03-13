"use server";

import { prisma } from "@/lib/prisma";
import { SessionVisibility, SessionStatus } from "@prisma/client";

export interface PublicSessionData {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  scheduledAt: Date;
  duration: number;
  timezone: string;
  status: SessionStatus;
  mode: "VIDEO" | "AUDIO";
  visibility: SessionVisibility;
  attendeeCount: number;
  mentor: {
    id: string;
    name: string | null;
    image: string | null;
    bio: string | null;
  };
  community: {
    id: string;
    name: string;
    slug: string;
    imageUrl: string | null;
    description: string | null;
  } | null;
  notes: {
    summary: string | null;
    keyInsights: string[];
    resources: { title: string; url: string; type: string }[];
  } | null;
  recording: {
    status: "PROCESSING" | "READY" | "FAILED";
    url: string | null;
    durationSeconds: number | null;
  } | null;
  series: {
    id: string;
    frequency: string;
    interval: number;
  } | null;
}

export async function getPublicSessionBySlug(
  slug: string
): Promise<PublicSessionData | null> {
  const session = await prisma.mentorSession.findUnique({
    where: { slug },
    include: {
      mentor: {
        select: {
          id: true,
          name: true,
          image: true,
          bio: true,
        },
      },
      community: {
        select: {
          id: true,
          name: true,
          slug: true,
          imageUrl: true,
          description: true,
        },
      },
      notes: {
        select: {
          summary: true,
          keyInsights: true,
          resources: true,
        },
      },
      recording: {
        select: {
          status: true,
          url: true,
          durationSeconds: true,
        },
      },
      series: {
        select: {
          id: true,
          frequency: true,
          interval: true,
        },
      },
    },
  });

  if (!session) return null;

  // Only show public sessions
  if (session.visibility !== SessionVisibility.public) {
    return null;
  }

  // Parse JSON fields from SessionNote
  let parsedNotes: PublicSessionData["notes"] = null;
  if (session.notes) {
    try {
      const keyInsights = session.notes.keyInsights 
        ? JSON.parse(session.notes.keyInsights) 
        : [];
      const resources = session.notes.resources 
        ? JSON.parse(session.notes.resources) 
        : [];
      
      parsedNotes = {
        summary: session.notes.summary,
        keyInsights: Array.isArray(keyInsights) ? keyInsights : [],
        resources: Array.isArray(resources) ? resources : [],
      };
    } catch {
      // If JSON parsing fails, return empty arrays
      parsedNotes = {
        summary: session.notes.summary,
        keyInsights: [],
        resources: [],
      };
    }
  }

  return {
    id: session.id,
    slug: session.slug!,
    title: session.title,
    description: session.description,
    scheduledAt: session.scheduledAt,
    duration: session.duration,
    timezone: session.timezone,
    status: session.status,
    mode: session.mode,
    visibility: session.visibility,
    attendeeCount: session.attendeeCount,
    mentor: session.mentor,
    community: session.community,
    notes: parsedNotes,
    recording: session.recording,
    series: session.series,
  };
}

export async function getPublicSessionsForSEO(
  limit: number = 100
): Promise<{ slug: string; title: string; scheduledAt: Date }[]> {
  const sessions = await prisma.mentorSession.findMany({
    where: {
      visibility: SessionVisibility.public,
      status: { not: SessionStatus.CANCELLED },
    },
    select: {
      slug: true,
      title: true,
      scheduledAt: true,
    },
    orderBy: {
      scheduledAt: "desc",
    },
    take: limit,
  });

  return sessions.filter((s) => s.slug) as { slug: string; title: string; scheduledAt: Date }[];
}
