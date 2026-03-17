"use server";

import { prisma } from "@/lib/prisma";
import { nanoid } from "nanoid";
import { revalidatePath } from "next/cache";
import { PostContentType } from "@prisma/client";
import { generateUpcomingSessions } from "../actions/sessions";
import { runAutopilotDueJobs } from "./autopilot";

/**
 * Session Jobs - Background tasks for recurring sessions
 * 
 * These functions should be called by a cron job or scheduler.
 * In Vercel, you can use Vercel Cron Jobs or a external scheduler like Upstash QStash.
 */

/**
 * Job: Auto-post next session to feed when it's ~24 hours away
 * Should run every hour
 */
export async function autoPostUpcomingSessions() {
  const results = {
    processed: 0,
    posted: 0,
    errors: [] as string[],
  };

  try {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setHours(tomorrow.getHours() + 24);

    // Find sessions happening in ~24 hours that haven't been posted yet
    const upcomingSessions = await prisma.mentorSession.findMany({
      where: {
        scheduledAt: {
          gte: now,
          lte: tomorrow,
        },
        status: "SCHEDULED",
        feedPostId: null, // Not yet posted
        communityId: { not: null }, // Must have a community
        seriesId: { not: null }, // Only recurring sessions (optional: remove for all)
      },
      include: {
        mentor: {
          select: { id: true, name: true, image: true, username: true },
        },
        series: true,
      },
    });

    results.processed = upcomingSessions.length;

    for (const session of upcomingSessions) {
      try {
        // Create feed post
        const post = await prisma.post.create({
          data: {
            title: `📅 Starting soon: ${session.title}`,
            content: `Join us for ${session.title} happening ${formatTimeUntil(
              session.scheduledAt
            )}!`,
            contentType: "SESSION_ANNOUNCEMENT",
            authorId: session.mentorId,
            communityId: session.communityId!,
            attachments: {
              sessionId: session.id,
              sessionTitle: session.title,
              sessionDescription: session.description,
              scheduledAt: session.scheduledAt.toISOString(),
              duration: session.duration,
              mentorId: session.mentorId,
              mentorName: session.mentor.name,
              mentorImage: session.mentor.image,
              isRecurring: true,
              isUpcoming: true,
              timeUntil: formatTimeUntil(session.scheduledAt),
            },
          },
        });

        // Update session with feedPostId
        await prisma.mentorSession.update({
          where: { id: session.id },
          data: { feedPostId: post.id },
        });

        // Revalidate community feed
        if (session.communityId) {
          revalidatePath(`/dashboard/communities/${session.communityId}/feed`);
        }

        results.posted++;
      } catch (error) {
        const errorMsg = `Failed to post session ${session.id}: ${error}`;
        console.error(errorMsg);
        results.errors.push(errorMsg);
      }
    }

    console.log(
      `[autoPostUpcomingSessions] Processed ${results.processed}, posted ${results.posted}`
    );

    return { success: true, ...results };
  } catch (error) {
    console.error("Error in autoPostUpcomingSessions:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * Job: Ensure future sessions exist for active series
 * Should run daily
 * 
 * For each active series, check if we have enough future sessions.
 * If not, generate more instances.
 */
export async function ensureFutureSessions() {
  const results = {
    seriesProcessed: 0,
    sessionsCreated: 0,
    errors: [] as string[],
  };

  try {
    const now = new Date();

    // Find active series with their latest session
    const activeSeries = await prisma.sessionSeries.findMany({
      where: {
        isActive: true,
        OR: [
          { endsAt: null },
          { endsAt: { gt: now } },
        ],
      },
      include: {
        instances: {
          where: {
            scheduledAt: { gt: now },
            status: "SCHEDULED",
          },
          orderBy: { scheduledAt: "desc" },
          take: 1,
        },
      },
    });

    for (const series of activeSeries) {
      try {
        results.seriesProcessed++;

        // Count future sessions
        const futureSessionsCount = await prisma.mentorSession.count({
          where: {
            seriesId: series.id,
            scheduledAt: { gt: now },
            status: "SCHEDULED",
          },
        });

        // Determine how many sessions to maintain
        const targetCount = series.frequency === "WEEKLY" ? 8 : 6;
        const sessionsToCreate = targetCount - futureSessionsCount;

        if (sessionsToCreate <= 0) {
          continue; // Enough sessions exist
        }

        // Get the latest session to start from
        let startFromDate: Date;
        if (series.instances.length > 0) {
          startFromDate = new Date(series.instances[0].scheduledAt);
        } else {
          startFromDate = new Date(series.startsAt);
        }

        // Generate new instances
        const newInstances = await generateUpcomingSessions(
          {
            frequency: series.frequency,
            interval: series.interval,
            dayOfWeek: series.dayOfWeek,
            dayOfMonth: series.dayOfMonth,
            startTime: series.startTime,
            durationMinutes: series.durationMinutes,
            timezone: series.timezone,
            startsAt: startFromDate,
          },
          sessionsToCreate
        );

        // Create the sessions in DB
        for (const instance of newInstances) {
          await prisma.mentorSession.create({
            data: {
              title: series.title,
              description: series.description,
              scheduledAt: instance.scheduledAt,
              duration: series.durationMinutes,
              timezone: series.timezone,
              roomId: `session-${nanoid(12)}`,
              status: "SCHEDULED",
              mentorId: series.hostId,
              menteeId: series.hostId,
              communityId: series.communityId,
              seriesId: series.id,
            },
          });
          results.sessionsCreated++;
        }

        console.log(
          `[ensureFutureSessions] Series ${series.id}: created ${sessionsToCreate} new sessions`
        );
      } catch (error) {
        const errorMsg = `Failed to process series ${series.id}: ${error}`;
        console.error(errorMsg);
        results.errors.push(errorMsg);
      }
    }

    console.log(
      `[ensureFutureSessions] Processed ${results.seriesProcessed} series, created ${results.sessionsCreated} sessions`
    );

    return { success: true, ...results };
  } catch (error) {
    console.error("Error in ensureFutureSessions:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * Job: Send session reminders
 * Should run every hour
 * 
 * Sends reminders at:
 * - 1 hour before
 * - 10 minutes before
 *
 * Uses an idempotency key (notificationKey) to avoid duplicates.
 */
export async function sendSessionReminders() {
  const results = {
    remindersSent: 0,
    errors: [] as string[],
  };

  try {
    const now = new Date();

    const windows = [
      { minutes: 24 * 60, title: "Session starts in 24 hours", key: "24h" },
      { minutes: 60, title: "Session starts in 1 hour", key: "1h" },
      { minutes: 10, title: "Session starts in 10 minutes", key: "10m" },
    ];

    for (const window of windows) {
      const target = new Date(now.getTime() + window.minutes * 60 * 1000);
      const windowStart = new Date(target.getTime() - 5 * 60 * 1000);
      const windowEnd = new Date(target.getTime() + 5 * 60 * 1000);

      const sessionsStartingSoon = await prisma.mentorSession.findMany({
        where: {
          scheduledAt: {
            gte: windowStart,
            lte: windowEnd,
          },
          status: "SCHEDULED",
        },
        include: {
          participations: {
            where: {
              OR: [
                { eventsData: { path: ["rsvpStatus"], equals: "attending" } },
                { eventsData: { path: ["rsvpStatus"], equals: "interested" } },
                { eventsData: { path: ["rsvp"], equals: true } },
              ],
            },
            include: {
              user: { select: { id: true, name: true } },
            },
          },
        },
      });

      for (const session of sessionsStartingSoon) {
        try {
          const participantIds = session.participations.map((p) => p.userId);
          participantIds.push(session.mentorId, session.menteeId);
          const uniqueParticipants = [...new Set(participantIds.filter(Boolean))];

          for (const userId of uniqueParticipants) {
            const reminderKey = `${window.key}:${session.id}:${userId}`;

            const alreadySent = await prisma.notification.findFirst({
              where: {
                userId,
                type: "SESSION_REMINDER",
                data: {
                  path: ["notificationKey"],
                  equals: reminderKey,
                },
              },
            });

            if (alreadySent) continue;

            const reminderLink =
              session.visibility === "public" && session.slug
                ? `/sessions/${session.slug}?ref=session_reminder&src=${window.key}`
                : `/dashboard/sessions/${session.id}`;

            await prisma.notification.create({
              data: {
                type: "SESSION_REMINDER",
                title: window.title,
                message: `${session.title} starts at ${session.scheduledAt.toLocaleTimeString()} · Join now so you don't miss it`,
                data: {
                  notificationKey: reminderKey,
                  sessionId: session.id,
                  title: session.title,
                  scheduledAt: session.scheduledAt.toISOString(),
                  reminderType: window.key,
                  link: reminderLink,
                  cta: "Join now",
                },
                userId,
              },
            });

            results.remindersSent += 1;
          }
        } catch (error) {
          const errorMsg = `Failed to send ${window.key} reminders for ${session.id}: ${error}`;
          console.error(errorMsg);
          results.errors.push(errorMsg);
        }
      }
    }

    console.log(`[sendSessionReminders] Sent ${results.remindersSent} reminders`);

    return { success: true, ...results };
  } catch (error) {
    console.error("Error in sendSessionReminders:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * Combined job runner - can be called by cron
 * Runs all session-related background tasks
 */
export async function runSessionJobs() {
  console.log("[runSessionJobs] Starting session job batch...");

  const autoPostResult = await autoPostUpcomingSessions();
  const ensureFutureResult = await ensureFutureSessions();
  const remindersResult = await sendSessionReminders();
  const autopilotResult = await runAutopilotDueJobs();

  console.log("[runSessionJobs] Batch complete");

  return {
    success: true,
    autoPost: autoPostResult,
    ensureFuture: ensureFutureResult,
    reminders: remindersResult,
    autopilot: autopilotResult,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Generate Session Recap - Auto-create feed post after session ends
 * This converts a live session into a permanent community asset
 * 
 * Features:
 * - Creates feed post with session recording
 * - Includes key takeaways from notes
 * - Links to full session recap page
 * - Engages community in follow-up discussion
 */
export async function generateSessionRecap(sessionId: string) {
  try {
    // Fetch complete session data
    const session = await prisma.mentorSession.findUnique({
      where: { id: sessionId },
      include: {
        mentor: {
          select: { id: true, name: true, image: true, username: true },
        },
        community: {
          select: { id: true, name: true, slug: true },
        },
        notes: true,
        series: true,
      },
    });

    if (!session) {
      return { success: false, error: "Session not found" };
    }

    if (!session.communityId) {
      return { success: false, error: "Session not linked to a community" };
    }

    // Check if recap already exists
    if (session.feedPostId) {
      return { success: false, error: "Recap already generated" };
    }

    // Build recap content
    const isAudioOnly = session.mode === "AUDIO";
    const sessionDate = session.scheduledAt.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });

    // Extract AI summary package (if available)
    const noteSummary = session.notes?.summary?.trim() || "";
    const parsedInsights = safeParseStringArray(session.notes?.keyInsights || null);
    const parsedChapters = safeParseChapters(session.notes?.resources || null);

    let keyTakeaways = "";
    if (parsedInsights.length > 0) {
      keyTakeaways = parsedInsights.slice(0, 5).map((item) => `• ${item}`).join("\n");
    } else if (session.notes?.content) {
      const lines = session.notes.content.split("\n").filter((l: string) => l.trim());
      keyTakeaways = lines.slice(0, 5).map((l: string) => `• ${l}`).join("\n");
    }

    const chaptersBlock = parsedChapters.length
      ? `**Chapters:**\n${parsedChapters
          .slice(0, 5)
          .map((c) => `• ${c.timestamp ? `${c.timestamp} — ` : ""}${c.title}`)
          .join("\n")}\n\n`
      : "";

    // Build rich content for the recap post
    const recapContent = `🎥 **Session Recap**

${session.title}
${isAudioOnly ? "🎙️ Audio session" : "🎬 Video session"} • ${session.duration} min • ${sessionDate}

${session.description ? `*${session.description}*\n\n` : ""}${noteSummary ? `**Summary:**\n${noteSummary}\n\n` : ""}${keyTakeaways ? `**Key Takeaways:**\n${keyTakeaways}\n\n` : ""}${chaptersBlock}💬 **What was your biggest takeaway?**
Share your thoughts below or ask follow-up questions.

[Watch Recording →](/dashboard/sessions/${session.id}?src=recap_post)
[Reuse in Course/Library →](/dashboard/sessions/${session.id}?src=recap_reuse_cta)
`;

    // Create the feed post
    const post = await prisma.post.create({
      data: {
        id: nanoid(),
        content: recapContent,
        authorId: session.mentorId,
        communityId: session.communityId,
        contentType: PostContentType.SESSION_ANNOUNCEMENT,
        attachments: {
          sessionId: session.id,
          sessionTitle: session.title,
          recordingUrl: session.recordingUrl,
          isAudioOnly,
          duration: session.duration,
          attendeeCount: session.attendeeCount,
        },
      },
    });

    // Link post to session
    await prisma.mentorSession.update({
      where: { id: sessionId },
      data: { feedPostId: post.id },
    });

    // Revalidate feed
    revalidatePath(`/dashboard/communities/${session.community?.slug}/feed`);
    revalidatePath("/dashboard/feed");

    console.log(`[generateSessionRecap] Created recap post ${post.id} for session ${sessionId}`);

    return {
      success: true,
      postId: post.id,
      communityId: session.communityId,
    };
  } catch (error) {
    console.error("[generateSessionRecap] Error:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * End Session - Complete session lifecycle
 * 
 * 1. Mark session as completed
 * 2. Stop recording
 * 3. Generate session recap post
 * 4. Update analytics
 */
export async function endSession(sessionId: string) {
  try {
    // Mark session as completed
    const session = await prisma.mentorSession.update({
      where: { id: sessionId },
      data: {
        status: "COMPLETED",
        endedAt: new Date(),
      },
    });

    // Generate recap (async, don't wait)
    generateSessionRecap(sessionId).catch((err) => {
      console.error("[endSession] Failed to generate recap:", err);
    });

    // Revalidate paths
    revalidatePath("/dashboard/sessions");
    revalidatePath(`/dashboard/sessions/${sessionId}`);

    console.log(`[endSession] Session ${sessionId} ended successfully`);

    return {
      success: true,
      session,
      recapQueued: true,
    };
  } catch (error) {
    console.error("[endSession] Error:", error);
    return { success: false, error: String(error) };
  }
}

// Helper functions
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

function formatTimeUntil(date: Date): string {
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) {
    return `in ${hours} hour${hours > 1 ? "s" : ""}`;
  }
  return `in ${minutes} minute${minutes > 1 ? "s" : ""}`;
}

/**
 * Share session recap to community feed
 * Wrapper around generateSessionRecap for easy calling
 */
export async function shareSessionRecap(sessionId: string) {
  // generateSessionRecap already creates a feed post
  const result = await generateSessionRecap(sessionId);
  return result;
}
