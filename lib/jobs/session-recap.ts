/**
 * Session recap: drafting and publishing, deliberately kept apart.
 *
 * These were one function. `generateSessionRecap` built the recap text and
 * created the community feed post in the same breath, and three separate
 * triggers called it — the end-of-session job, the recording-ready webhook, and
 * the autopilot distribute job. A host who ended a session found the recap
 * already on the feed, written by a template they had never read. The only
 * "review" the UI offered was a card that said "Already shared".
 *
 * The split is possible because drafting is pure. The recap is a template over
 * session data and the AI summary package on `SessionNote`; nothing about it
 * needs to happen at a particular moment, so there is nothing to schedule and
 * nothing to store. The draft is always available and always reflects the
 * latest notes — including notes edited after the session ended, which the old
 * snapshot-at-end-of-session behaviour got wrong.
 *
 * Publishing is the only half that writes, and it happens only when a host asks
 * for it, with the text they approved.
 */

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { nanoid } from "nanoid";
import { PostContentType } from "@prisma/client";

/** Upper bound on a recap the host may submit. Guards the post body. */
export const RECAP_MAX_LENGTH = 10_000;

interface RecapNotes {
  content: string | null;
  summary: string | null;
  keyInsights: string | null;
  resources: string | null;
}

/** The slice of a session the template reads. */
export interface RecapSource {
  id: string;
  title: string;
  description: string | null;
  mode: string;
  duration: number;
  scheduledAt: Date;
  notes: RecapNotes | null;
}

function safeParseStringArray(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function safeParseChapters(value: string | null): { title: string; timestamp?: string }[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((item) => item?.type === "chapter" && typeof item?.title === "string")
      .map((item) => ({
        title: item.title as string,
        timestamp: typeof item.timestamp === "string" ? item.timestamp : undefined,
      }));
  } catch {
    return [];
  }
}

/**
 * The suggested recap text. Pure: same session in, same string out, no writes.
 *
 * This is the "generation" half, and it is why generation can stay automatic
 * without anything being published — the draft costs a template render.
 */
export function buildSessionRecapContent(session: RecapSource): string {
  const isAudioOnly = session.mode === "AUDIO";
  const sessionDate = session.scheduledAt.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  const noteSummary = session.notes?.summary?.trim() || "";
  const parsedInsights = safeParseStringArray(session.notes?.keyInsights || null);
  const parsedChapters = safeParseChapters(session.notes?.resources || null);

  let keyTakeaways = "";
  if (parsedInsights.length > 0) {
    keyTakeaways = parsedInsights
      .slice(0, 5)
      .map((item) => `• ${item}`)
      .join("\n");
  } else if (session.notes?.content) {
    const lines = session.notes.content.split("\n").filter((l: string) => l.trim());
    keyTakeaways = lines
      .slice(0, 5)
      .map((l: string) => `• ${l}`)
      .join("\n");
  }

  const chaptersBlock = parsedChapters.length
    ? `**Chapters:**\n${parsedChapters
        .slice(0, 5)
        .map((c) => `• ${c.timestamp ? `${c.timestamp} — ` : ""}${c.title}`)
        .join("\n")}\n\n`
    : "";

  return `🎥 **Session Recap**

${session.title}
${isAudioOnly ? "🎙️ Audio session" : "🎬 Video session"} • ${session.duration} min • ${sessionDate}

${session.description ? `*${session.description}*\n\n` : ""}${noteSummary ? `**Summary:**\n${noteSummary}\n\n` : ""}${keyTakeaways ? `**Key Takeaways:**\n${keyTakeaways}\n\n` : ""}${chaptersBlock}💬 **What was your biggest takeaway?**
Share your thoughts below or ask follow-up questions.

[Watch Recording →](/dashboard/sessions/${session.id}?src=recap_post)
[Reuse in Course/Library →](/dashboard/sessions/${session.id}?src=recap_reuse_cta)
`;
}

export type RecapDraftResult =
  | { success: true; content: string; alreadyShared: boolean; feedPostId: string | null }
  | { success: false; error: string };

/**
 * The draft a host reviews before deciding. Read-only.
 *
 * `alreadyShared` is what the UI uses to stop offering the action twice; it is
 * true only once a host has published, because nothing else sets `feedPostId`
 * for a recap any more.
 */
export async function getSessionRecapDraft(sessionId: string): Promise<RecapDraftResult> {
  const session = await prisma.mentorSession.findUnique({
    where: { id: sessionId },
    include: { notes: true },
  });

  if (!session) {
    return { success: false, error: "Session not found" };
  }

  if (!session.communityId) {
    return { success: false, error: "Session not linked to a community" };
  }

  return {
    success: true,
    content: buildSessionRecapContent(session),
    alreadyShared: Boolean(session.feedPostId),
    feedPostId: session.feedPostId,
  };
}

export type PublishRecapResult =
  | { success: true; postId: string; communityId: string }
  | { success: false; error: string };

/**
 * Create the feed post, with the text the host approved.
 *
 * `content` is the host's, not the template's: the preview is editable, and
 * whatever they submit is what members read. The draft is not re-derived here,
 * because doing so would silently discard their edits.
 */
export async function publishSessionRecap(
  sessionId: string,
  content: string
): Promise<PublishRecapResult> {
  const trimmed = content.trim();
  if (!trimmed) {
    return { success: false, error: "Recap is empty" };
  }
  if (trimmed.length > RECAP_MAX_LENGTH) {
    return { success: false, error: "Recap is too long" };
  }

  try {
    const session = await prisma.mentorSession.findUnique({
      where: { id: sessionId },
      include: { community: { select: { slug: true } } },
    });

    if (!session) {
      return { success: false, error: "Session not found" };
    }
    if (!session.communityId) {
      return { success: false, error: "Session not linked to a community" };
    }
    // Publishing twice would put a second recap on the feed with no way to tell
    // which one members should read.
    if (session.feedPostId) {
      return { success: false, error: "Recap already shared" };
    }

    const post = await prisma.post.create({
      data: {
        id: nanoid(),
        content: trimmed,
        authorId: session.mentorId,
        communityId: session.communityId,
        contentType: PostContentType.SESSION_ANNOUNCEMENT,
        attachments: {
          sessionId: session.id,
          sessionTitle: session.title,
          recordingUrl: session.recordingUrl,
          isAudioOnly: session.mode === "AUDIO",
          duration: session.duration,
          attendeeCount: session.attendeeCount,
        },
      },
    });

    await prisma.mentorSession.update({
      where: { id: sessionId },
      data: { feedPostId: post.id },
    });

    revalidatePath(`/dashboard/communities/${session.community?.slug}/feed`);
    revalidatePath("/dashboard/communities");

    return { success: true, postId: post.id, communityId: session.communityId };
  } catch (error) {
    console.error("[publishSessionRecap] Error:", error);
    return { success: false, error: String(error) };
  }
}
