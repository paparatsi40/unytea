"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { defineAction } from "@/lib/actions/define-action";
import { communityOfSession } from "@/lib/actions/resolvers";

/**
 * Get or create session notes
 */
export const getOrCreateSessionNotes = defineAction(
  {
    name: "getOrCreateSessionNotes",
    auth: "member",
    args: [z.string().min(1).max(64)],
    community: ([sessionId]) => communityOfSession(sessionId),
  },
  async (ctx, sessionId) => {
  const session = { user: { id: ctx.userId } };
  // Check if user is part of this session
  const mentorSession = await prisma.mentorSession.findUnique({
    where: { id: sessionId },
    select: {
      mentorId: true,
      menteeId: true,
      communityId: true,
    },
  });

  if (!mentorSession) {
    throw new Error("Session not found");
  }

  // Check access (mentor, mentee, or community member)
  const userId = session.user.id;
  const hasAccess = mentorSession.mentorId === userId || mentorSession.menteeId === userId;

  if (!hasAccess && mentorSession.communityId) {
    // Check if user is community member
    const membership = await prisma.member.findFirst({
      where: {
        userId,
        communityId: mentorSession.communityId,
        status: "ACTIVE",
      },
    });
    if (!membership) {
      throw new Error("Unauthorized");
    }
  } else if (!hasAccess) {
    throw new Error("Unauthorized");
  }

  // Get existing note or create empty one
  let note = await prisma.sessionNote.findUnique({
    where: { sessionId },
  });

  if (!note) {
    note = await prisma.sessionNote.create({
      data: {
        sessionId,
        content: "", // Empty initial content
        lastEditedBy: userId,
      },
    });
  }

  return {
    success: true,
    note: {
      id: note.id,
      content: note.content,
      summary: note.summary,
      keyInsights: note.keyInsights ? JSON.parse(note.keyInsights) : [],
      resources: note.resources ? JSON.parse(note.resources) : [],
      updatedAt: note.updatedAt,
      lastEditedBy: note.lastEditedBy,
    },
  };
  }
);

/**
 * Update session notes
 */
export const updateSessionNotes = defineAction(
  {
    name: "updateSessionNotes",
    auth: "member",
    args: [
      z.object({
        noteId: z.string().min(1).max(64),
        content: z.string().max(100_000).optional(),
        summary: z.string().max(10_000).optional(),
        keyInsights: z.array(z.string().max(2000)).max(100).optional(),
        resources: z.array(z.unknown()).max(100).optional(),
      }),
    ],
    community: async ([data]) => {
      const note = await prisma.sessionNote.findUnique({
        where: { id: data.noteId },
        select: { session: { select: { communityId: true } } },
      });
      return note?.session?.communityId ?? null;
    },
    rateLimit: "create",
  },
  async (ctx, data) => {
  const session = { user: { id: ctx.userId } };
  const { noteId, content, summary, keyInsights, resources } = data;

  // Get the note to check session
  const existingNote = await prisma.sessionNote.findUnique({
    where: { id: noteId },
    include: { session: true },
  });

  if (!existingNote) {
    throw new Error("Note not found");
  }

  // Check access
  const userId = session.user.id;
  const hasAccess =
    existingNote.session.mentorId === userId || existingNote.session.menteeId === userId;

  if (!hasAccess) {
    throw new Error("Unauthorized");
  }

  // Update note
  const updatedNote = await prisma.sessionNote.update({
    where: { id: noteId },
    data: {
      content,
      ...(summary !== undefined && { summary }),
      ...(keyInsights !== undefined && { keyInsights: JSON.stringify(keyInsights) }),
      ...(resources !== undefined && { resources: JSON.stringify(resources) }),
      lastEditedBy: userId,
    },
  });

  // Revalidate paths
  revalidatePath(`/dashboard/sessions/${existingNote.sessionId}/room`);
  revalidatePath(`/dashboard/sessions/${existingNote.sessionId}`);

  return {
    success: true,
    note: {
      id: updatedNote.id,
      content: updatedNote.content,
      summary: updatedNote.summary,
      keyInsights: updatedNote.keyInsights ? JSON.parse(updatedNote.keyInsights) : [],
      resources: updatedNote.resources ? JSON.parse(updatedNote.resources) : [],
      updatedAt: updatedNote.updatedAt,
      lastEditedBy: updatedNote.lastEditedBy,
    },
  };
  }
);

/**
 * Get session notes for display (public view after session)
 */
/**
 * PUBLIC: notes for a session the host has published to the open web.
 *
 * Gated on `session.visibility === "public"`. Without that check this returned
 * the shared notes of any session by id, including sessions belonging to
 * private, paid communities.
 */
export const getSessionNotesForPublic = defineAction(
  {
    name: "getSessionNotesForPublic",
    auth: "public",
    args: [z.string().min(1).max(64)],
    rateLimit: "api",
  },
  async (_ctx, sessionId) => {
  const note = await prisma.sessionNote.findUnique({
    where: { sessionId },
    include: {
      session: {
        select: {
          id: true,
          title: true,
          mentorId: true,
          visibility: true,
          mentor: {
            select: {
              name: true,
              image: true,
            },
          },
        },
      },
    },
  });

  // Only sessions the host explicitly published are readable anonymously.
  if (!note || note.session.visibility !== "public") {
    return null;
  }

  return {
    id: note.id,
    content: note.content,
    summary: note.summary,
    keyInsights: note.keyInsights ? JSON.parse(note.keyInsights) : [],
    resources: note.resources ? JSON.parse(note.resources) : [],
    updatedAt: note.updatedAt,
    session: {
      id: note.session.id,
      title: note.session.title,
      mentor: note.session.mentor,
    },
  };
  }
);
