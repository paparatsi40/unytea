"use server";

import { getCurrentUserId } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";

/**
 * Analyze session for "golden moments" - high-value segments
 * Based on session structure, participation, and notes
 */
export async function detectSessionMoments(sessionId: string) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    // Fetch session with relevant data
    const session = await prisma.mentorSession.findUnique({
      where: { id: sessionId },
      include: {
        mentor: { select: { id: true, name: true, image: true } },
        community: { select: { id: true, name: true, slug: true } },
        participations: {
          include: {
            user: { select: { id: true, name: true } },
          },
        },
        notes: true,
        recording: true,
      },
    });

    if (!session) {
      return { success: false, error: "Session not found" };
    }

    if (session.mentorId !== userId) {
      return { success: false, error: "Only mentor can create clips" };
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
        recordingUrl: session.recording?.url,
        thumbnailUrl: null, // No thumbnail in Recording model
        duration: session.recording?.durationSeconds || 0,
        mentor: session.mentor,
        community: session.community,
      },
    };
  } catch (error) {
    console.error("Error detecting moments:", error);
    return { success: false, error: "Failed to analyze session" };
  }
}

/**
 * Analyze session structure for "golden moments"
 */
function analyzeMoments(session: any) {
  const moments: {
    startTime: number;
    endTime: number;
    type: "engagement" | "insight";
    score: number;
    label: string;
    context: string;
  }[] = [];

  const recording = session.recording;
  if (!recording) return moments;

  const totalDuration = recording.duration || 3600;
  const attendeeCount = session.participations?.length || 0;

  // 1. Opening Hook (first 2-3 minutes)
  moments.push({
    startTime: 0,
    endTime: Math.min(180, totalDuration),
    type: "engagement",
    score: 75,
    label: "🔥 Opening Hook",
    context: `Session starts - ${attendeeCount} people joined`,
  });

  // 2. Middle content (if session > 10 min)
  if (totalDuration > 600) {
    const midStart = Math.floor(totalDuration * 0.3);
    const midEnd = Math.floor(totalDuration * 0.7);
    
    moments.push({
      startTime: midStart,
      endTime: midEnd,
      type: "insight",
      score: 70,
      label: "💡 Core Content",
      context: `Main teaching (${Math.round((midEnd - midStart) / 60)} min)`,
    });
  }

  // 3. Closing segment (last 3-5 min)
  const closingStart = Math.max(0, totalDuration - 300);
  moments.push({
    startTime: closingStart,
    endTime: totalDuration,
    type: "engagement",
    score: 65,
    label: "🔚 Powerful Close",
    context: "Final takeaways",
  });

  // 4. Notes insight (if notes exist)
  const note = session.notes;
  if (note && note.content && note.content.length > 100) {
    const estimatedTime = Math.floor(totalDuration * 0.4);
    
    moments.push({
      startTime: Math.max(0, estimatedTime - 30),
      endTime: Math.min(totalDuration, estimatedTime + 60),
      type: "insight",
      score: 80,
      label: "💡 Key Insight",
      context: note.content.substring(0, 100) + "...",
    });
  }

  // 5. High participation bonus
  if (attendeeCount >= 10) {
    const bonusStart = Math.floor(totalDuration * 0.5);
    moments.push({
      startTime: bonusStart,
      endTime: Math.min(totalDuration, bonusStart + 120),
      type: "engagement",
      score: 85,
      label: "🔥 Peak Attendance",
      context: `${attendeeCount} people learning`,
    });
  }

  // Sort and dedupe
  moments.sort((a, b) => b.score - a.score);
  return dedupeMoments(moments.slice(0, 4));
}

/**
 * Remove overlapping moments
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
        mentor: { select: { id: true, name: true, image: true } },
        community: { select: { id: true, name: true, slug: true } },
        recording: true,
      },
    });

    if (!session || session.mentorId !== userId) {
      return { success: false, error: "Unauthorized" };
    }

    const clipDuration = endTime - startTime;
    const clipId = `clip_${sessionId}_${startTime}_${endTime}`;

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://unytea.com";
    const clipUrl = `${baseUrl}/clip/${clipId}`;
    const sessionUrl = `${baseUrl}/s/${session.community?.slug || "c"}/${session.slug}`;

    const previewText = generateClipPreviewText(session, clipDuration);

    return {
      success: true,
      clip: {
        id: clipId,
        sessionId: session.id,
        sessionTitle: session.title,
        hostName: session.mentor?.name,
        communityName: session.community?.name ?? null,
        startTime,
        endTime,
        duration: clipDuration,
        clipUrl,
        sessionUrl,
        thumbnailUrl: null, // No thumbnail in Recording model
        videoUrl: session.recording?.url ?? null,
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
    `In just ${Math.round(duration / 60)} minutes, everything you need`,
    `This insight from ${session.mentor?.name} is 🔥`,
  ];
  return hooks[Math.floor(Math.random() * hooks.length)];
}

function generateShareText(session: any, previewText: string, clipUrl: string) {
  return `${previewText}

From: "${session.title}" with ${session.mentor?.name}

Watch on Unytea 👇
${clipUrl}`;
}

/**
 * Track clip shares for analytics
 */
export async function trackClipShare(
  clipId: string,
  platform: "twitter" | "linkedin" | "copy"
) {
  try {
    console.log(`Clip ${clipId} shared to ${platform}`);
    return { success: true };
  } catch (error) {
    console.error("Error tracking share:", error);
    return { success: false };
  }
}