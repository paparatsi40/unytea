"use server";

import { prisma } from "@/lib/prisma";
import { nanoid } from "nanoid";
import { revalidatePath } from "next/cache";
import { generateUpcomingSessions } from "../actions/sessions";

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
 * - 24 hours before
 * - 1 hour before
 */
export async function sendSessionReminders() {
  const results = {
    remindersSent: 0,
    errors: [] as string[],
  };

  try {
    const now = new Date();

    // Find sessions starting in ~1 hour (within 55-65 min window)
    const oneHourFromNow = new Date(now);
    oneHourFromNow.setHours(oneHourFromNow.getHours() + 1);
    const oneHourWindowStart = new Date(oneHourFromNow);
    oneHourWindowStart.setMinutes(oneHourWindowStart.getMinutes() - 5);
    const oneHourWindowEnd = new Date(oneHourFromNow);
    oneHourWindowEnd.setMinutes(oneHourWindowEnd.getMinutes() + 5);

    const sessionsStartingSoon = await prisma.mentorSession.findMany({
      where: {
        scheduledAt: {
          gte: oneHourWindowStart,
          lte: oneHourWindowEnd,
        },
        status: "SCHEDULED",
      },
      include: {
        mentor: { select: { id: true, name: true } },
        mentee: { select: { id: true, name: true } },
        participations: {
          include: {
            user: { select: { id: true, name: true } },
          },
        },
      },
    });

    for (const session of sessionsStartingSoon) {
      try {
        // Create notifications for participants
        const participantIds = session.participations.map((p) => p.userId);
        participantIds.push(session.mentorId, session.menteeId);
        const uniqueParticipants = [...new Set(participantIds)];

        for (const userId of uniqueParticipants) {
          await prisma.notification.create({
            data: {
              type: "SESSION_REMINDER",
              title: "Session starting in 1 hour",
              message: `${session.title} starts at ${session.scheduledAt.toLocaleTimeString()}`,
              data: {
                sessionId: session.id,
                title: session.title,
                scheduledAt: session.scheduledAt,
              },
              userId,
            },
          });
        }

        results.remindersSent += uniqueParticipants.length;
      } catch (error) {
        const errorMsg = `Failed to send reminders for ${session.id}: ${error}`;
        console.error(errorMsg);
        results.errors.push(errorMsg);
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

  console.log("[runSessionJobs] Batch complete");

  return {
    success: true,
    autoPost: autoPostResult,
    ensureFuture: ensureFutureResult,
    reminders: remindersResult,
    timestamp: new Date().toISOString(),
  };
}

// Helper functions
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
