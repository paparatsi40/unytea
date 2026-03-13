"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";


interface UpdateNoteData {
  noteId: string;
  content: string;
  summary?: string;
  keyInsights?: string[];
  resources?: string[];
}

/**
 * Get or create session notes
 */
export async function getOrCreateSessionNotes(sessionId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

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
  const hasAccess = 
    mentorSession.mentorId === userId || 
    mentorSession.menteeId === userId;

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

/**
 * Update session notes
 */
export async function updateSessionNotes(data: UpdateNoteData) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

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
    existingNote.session.mentorId === userId || 
    existingNote.session.menteeId === userId;

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

/**
 * Get session notes for display (public view after session)
 */
export async function getSessionNotesForPublic(sessionId: string) {
  const note = await prisma.sessionNote.findUnique({
    where: { sessionId },
    include: {
      session: {
        select: {
          id: true,
          title: true,
          mentorId: true,
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

  if (!note) {
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
