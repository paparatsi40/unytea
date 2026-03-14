"use server";

import { getCurrentUserId } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";

/**
 * Analyze session for "golden moments" - high-engagement segments
 * Returns timestamps for clip generation
 */
export async function detectSessionMoments(sessionId: string) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    // Fetch session with all engagement data
    const session = await prisma.mentorSession.findUnique({
      where: { id: sessionId },
      include: {
        host: { select: { id: true, name: true, image: true } },
        community: { select: { id: true, name: true, slug: true } },
        participations: {
          include: {
            user: { select: { id: true, name: true } },
          },
        },
        notes: {
          orderBy: { createdAt: "asc" },
        },
        recording: true,
        events: {
          where: {
            eventType: {
              in: ["QUESTION_ASKED", "REACTION", "HAND_RAISED"],
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!session) {
      return { success: false, error: "Session not found" };
    }

    if (session.hostId !== userId) {
      return { success: false, error: "Only host can create clips" };
    }

    if (!session.recording || session.recording.status !== "READY") {
      return { success: false, error: "Recording not ready" };
    }

    const moments = analyzeMoments(session);

    return {
      success: true,
      moments,
      session: {
        id: session.id,
        title: session.title,
        description: session.description,
        recordingUrl: session.recording?.videoUrl,
        thumbnailUrl: session.recording?.thumbnailUrl,
        duration: session.recording?.duration || 0,
        host: session.host,
        community: session.community,
      },
    };
  } catch (error) {
    console.error("Error detecting moments:", error);
    return { success: false, error: "Failed to analyze session" };
  }
}

/**
 * Analyze engagement patterns to find "golden moments"
 */
function analyzeMoments(session: any) {
  const moments: {
    startTime: number;
    endTime: number;
    type: "engagement" | "question" | "insight" | "reaction";
    score: number;
    label: string;
    context: string;
  }[] = [];

  const recording = session.recording;
  if (!recording) return moments;

  const totalDuration = recording.duration || 3600; // default 1 hour

  // 1. Find high-engagement periods (many reactions in short time)
  const reactionEvents = session.events.filter(
    (e: any) => e.eventType === "REACTION"
  );

  if (reactionEvents.length > 0) {
    const engagementWindows = findDenseWindows(reactionEvents, totalDuration, 30);
    engagementWindows.forEach((window) => {
      moments.push({
        startTime: Math.max(0, window.start - 10),
        endTime: Math.min(totalDuration, window.end + 10),
        type: "engagement",
        score: window.density * 10,
        label: "🔥 Peak Engagement",
        context: `${window.count} reactions in ${Math.round(window.end - window.start)}s`,
      });
    });
  }

  // 2. Find key questions answered
  const questionEvents = session.events.filter(
    (e: any) => e.eventType === "QUESTION_ASKED"
  );

  questionEvents.forEach((q: any, index: number) => {
    // Look for note created shortly after (indicates answer)
    const questionTime = new Date(q.createdAt).getTime();
    const answerNote = session.notes.find((n: any) => {
      const noteTime = new Date(n.createdAt).getTime();
      return noteTime > questionTime && noteTime < questionTime + 120000; // within 2 min
    });

    if (answerNote) {
      const startSeconds = Math.floor((questionTime - new Date(session.startedAt!).getTime()) / 1000);
      moments.push({
        startTime: Math.max(0, startSeconds - 5),
        endTime: Math.min(totalDuration, startSeconds + 60),
        type: "question",
        score: 70 + index * 5,
        label: "❓ Key Question Answered",
        context: answerNote.content.substring(0, 100) + "...",
      });
    }
  });

  // 3. Find valuable insights (notes with high engagement)
  const highValueNotes = session.notes.filter((n: any) => {
    return n.content.length > 200 || n.isPinned;
  });

  highValueNotes.forEach((note: any, index: number) => {
    const noteTime = new Date(note.createdAt).getTime();
    const startSeconds = Math.floor((noteTime - new Date(session.startedAt!).getTime()) / 1000);
    
    moments.push({
      startTime: Math.max(0, startSeconds - 15),
      endTime: Math.min(totalDuration, startSeconds + 45),
      type: "insight",
      score: 60 + index * 3,
      label: "💡 Valuable Insight",
      context: note.content.substring(0, 150) + "...",
    });
  });

  // Sort by score descending
  moments.sort((a, b) => b.score - a.score);

  // Return top 5 moments, ensuring no overlaps
  return dedupeMoments(moments.slice(0, 5));
}

/**
 * Find windows with dense event clusters
 */
function findDenseWindows(
  events: any[],
  totalDuration: number,
  windowSizeSeconds: number
) {
  if (events.length === 0) return [];

  const windows: { start: number; end: number; count: number; density: number }[] = [];

  // Group events into time windows
  const eventTimes = events.map((e) =>
    Math.floor((new Date(e.createdAt).getTime() - new Date(events[0].createdAt).getTime()) / 1000)
  );

  for (let i = 0; i < eventTimes.length; i++) {
    const windowStart = eventTimes[i];
    const windowEnd = windowStart + windowSizeSeconds;
    
    const eventsInWindow = eventTimes.filter((t) => t >= windowStart && t <= windowEnd);
    
    if (eventsInWindow.length >= 3) {
      windows.push({
        start: windowStart,
        end: windowEnd,
        count: eventsInWindow.length,
        density: eventsInWindow.length / windowSizeSeconds,
      });
    }
  }

  // Return top 3 densest windows
  return windows.sort((a, b) => b.density - a.density).slice(0, 3);
}

/**
 * Remove overlapping moments, keeping highest scored
 */
function dedupeMoments(moments: any[]) {
  const result: typeof moments = [];

  for (const moment of moments) {
    const hasOverlap = result.some(
      (m) =>
        (moment.startTime >= m.startTime && moment.startTime <= m.endTime) ||
        (moment.endTime >= m.startTime && moment.endTime <= m.endTime) ||
        (moment.startTime <= m.startTime && moment.endTime >= m.endTime)
    );

    if (!hasOverlap) {
      result.push(moment);
    }
  }

  return result;
}

/**
 * Generate shareable clip metadata
 * (Actual video processing would happen via external service like Mux, Cloudinary, or AWS)
 */
export async function generateClipMetadata(
  sessionId: string,
  startTime: number,
  endTime: number
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    const session = await prisma.mentorSession.findUnique({
      where: { id: sessionId },
      include: {
        host: { select: { id: true, name: true, image: true } },
        community: { select: { id: true, name: true, slug: true } },
        recording: true,
      },
    });

    if (!session || session.hostId !== userId) {
      return { success: false, error: "Unauthorized" };
    }

    const clipDuration = endTime - startTime;
    const clipId = `clip_${sessionId}_${startTime}_${endTime}`;

    // Generate share URLs
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://unytea.com";
    const clipUrl = `${baseUrl}/clip/${clipId}`;
    const sessionUrl = `${baseUrl}/s/${session.community?.slug || "c"}/${session.slug}`;

    // Generate preview text
    const previewText = generateClipPreviewText(session, clipDuration);

    return {
      success: true,
      clip: {
        id: clipId,
        sessionId: session.id,
        sessionTitle: session.title,
        hostName: session.host?.name,
        communityName: session.community?.name,
        startTime,
        endTime,
        duration: clipDuration,
        clipUrl,
        sessionUrl,
        thumbnailUrl: session.recording?.thumbnailUrl,
        videoUrl: session.recording?.videoUrl,
        previewText,
        shareText: generateShareText(session, previewText, clipUrl),
      },
    };
  } catch (error) {
    console.error("Error generating clip:", error);
    return { success: false, error: "Failed to generate clip" };
  }
}

function generateClipPreviewText(session: any, duration: number) {
  const hooks = [
    `The #1 thing most people get wrong about ${session.title.toLowerCase()}...`,
    `This changed how I think about ${session.title.toLowerCase()}`,
    `The secret nobody tells you about ${session.title.toLowerCase()}`,
    `In just ${Math.round(duration / 60)} minutes, everything you need to know`,
    `This insight from ${session.host?.name} is 🔥`,
  ];

  return hooks[Math.floor(Math.random() * hooks.length)];
}

function generateShareText(session: any, previewText: string, clipUrl: string) {
  return `${previewText}

From: "${session.title}" with ${session.host?.name}

Watch the full session on Unytea 👇
${clipUrl}`;
}

/**
 * Track clip shares for analytics
 */
export async function trackClipShare(
  clipId: string,
  platform: "twitter" | "linkedin" | "tiktok" | "copy"
) {
  try {
    // In production, save to analytics database
    console.log(`Clip ${clipId} shared to ${platform}`);
    
    return { success: true };
  } catch (error) {
    console.error("Error tracking share:", error);
    return { success: false };
  }
}