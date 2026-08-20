/**
 * Internal session pipelines — deliberately NOT a "use server" module.
 *
 * Next.js turns every export of a "use server" file into a public POST
 * endpoint, so these were callable without the CRON_SECRET guarding the cron
 * routes that drive them (SEC-11). `sendSessionReminders` in particular meant
 * anyone could fire unbounded reminder email and push at a community.
 *
 * The cron routes import these directly, so the secret is the only way in.
 * Anything a browser must be able to call lives in app/actions/session-jobs.ts
 * behind defineAction.
 */
import { prisma } from "@/lib/prisma";
import { nanoid } from "nanoid";
import { revalidatePath } from "next/cache";
import { generateUpcomingSessions } from "@/lib/jobs/session-schedule";
import { runAutopilotDueJobs } from "./autopilot";
import { sendSessionReminderEmail } from "@/lib/email";
import { sendPushToUser, pushTemplates } from "@/lib/push";
import { SITE_URL } from "@/lib/site-url";
import {
  METERING_EPOCH,
  accrueSessionUsage,
  logAccrualOutcome,
  meterCompletedSession,
  notifyAccruedSession,
} from "@/lib/usage/video-usage";

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
        OR: [{ endsAt: null }, { endsAt: { gt: now } }],
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
          community: { select: { name: true } },
          participations: {
            where: {
              OR: [
                { eventsData: { path: ["rsvpStatus"], equals: "attending" } },
                { eventsData: { path: ["rsvpStatus"], equals: "interested" } },
                { eventsData: { path: ["rsvp"], equals: true } },
              ],
            },
            include: {
              user: { select: { id: true, name: true, email: true } },
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
                message: `${session.title} starts at ${session.scheduledAt.toLocaleTimeString()}.`,
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

            // Send push notification (non-blocking)
            sendPushToUser(
              userId,
              pushTemplates.sessionStarting(
                session.title,
                session.community?.name || "your community",
                session.id
              )
            ).catch((pushErr) =>
              console.warn(`[sendSessionReminders] Push failed for ${userId}:`, pushErr)
            );

            // Send email reminder (non-blocking)
            try {
              const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { email: true, name: true },
              });

              if (user?.email) {
                const appUrl = SITE_URL;
                await sendSessionReminderEmail(user.email, {
                  userName: user.name || "there",
                  sessionTitle: session.title,
                  sessionDate: session.scheduledAt.toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  }),
                  sessionTime: session.scheduledAt.toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                  }),
                  reminderType: window.key as "24h" | "1h" | "10m",
                  joinLink: `${appUrl}${reminderLink}`,
                  hostName: undefined, // Could fetch host name if needed
                });
              }
            } catch (emailError) {
              console.warn(`[sendSessionReminders] Email failed for ${userId}:`, emailError);
              // Don't fail the whole job if email fails
            }

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
/**
 * How long past its booked end a session may sit in IN_PROGRESS before the
 * sweep decides nothing is going to close it.
 *
 * The sweep runs hourly, so anything shorter than an hour would fight the
 * cadence; anything much longer leaves a session unmetered for a cycle.
 */
const ORPHAN_GRACE_MS = 60 * 60 * 1000;

/**
 * The backstop for the usage counter.
 *
 * Two failures are swept up here, and neither is exotic. A session can be left
 * IN_PROGRESS forever because the only things that end one are a host clicking
 * End Session and a LiveKit webhook — a host who closes the tab does neither.
 * And a session can be COMPLETED but unmetered because the accrual at end time
 * threw.
 *
 * Orphans are ended at their booked end, not at the moment the sweep noticed
 * them: the room was booked until then, and charging for the hours it took a
 * cron to run would be inventing usage. Capping at `now` covers the session
 * whose booked end has not arrived yet.
 *
 * The accrual itself is idempotent, so a session the sweep and a late webhook
 * both reach still produces one ledger row.
 */
export async function sweepSessionUsage() {
  const now = new Date();
  let orphansClosed = 0;
  let accrued = 0;

  const orphans = await prisma.mentorSession.findMany({
    where: {
      status: "IN_PROGRESS",
      endedAt: null,
      startedAt: { not: null, gte: METERING_EPOCH },
    },
    select: { id: true, startedAt: true, duration: true },
  });

  for (const orphan of orphans) {
    if (!orphan.startedAt) continue;
    const bookedEnd = new Date(orphan.startedAt.getTime() + orphan.duration * 60 * 1000);
    if (now.getTime() - bookedEnd.getTime() < ORPHAN_GRACE_MS) continue;

    const endedAt = bookedEnd > now ? now : bookedEnd;
    await prisma.mentorSession.update({
      where: { id: orphan.id },
      data: { status: "COMPLETED", endedAt },
    });
    await meterCompletedSession(orphan.id, endedAt);
    orphansClosed += 1;
  }

  // Anything completed and unmetered. `usageAccrual: null` is the whole
  // condition — the ledger is the record of what has been counted, so a missing
  // row is exactly the definition of "not counted yet". METERING_EPOCH is what
  // keeps this from reaching back over the platform's entire history.
  const unmetered = await prisma.mentorSession.findMany({
    where: {
      endedAt: { not: null, gte: METERING_EPOCH },
      communityId: { not: null },
      usageAccrual: null,
    },
    select: { id: true },
    take: 200,
  });

  for (const session of unmetered) {
    try {
      const outcome = await accrueSessionUsage(session.id);
      // The sweep is the backstop, so a session it also declines to count is
      // the last word on that session. It used to be the quietest place in the
      // system: the outcome was read for the counter and discarded otherwise.
      logAccrualOutcome(session.id, outcome);
      if (outcome.status === "accrued") {
        accrued += 1;
        // The sweep moves the counter too, so it owes the same warning. It does
        // not go through `meterCompletedSession`, so the call is explicit here.
        await notifyAccruedSession(session.id);
      }
    } catch (error) {
      console.error("[sweepSessionUsage] accrual threw", {
        sessionId: session.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return { success: true as const, orphansClosed, accrued, scanned: unmetered.length };
}

export async function runSessionJobs() {
  console.log("[runSessionJobs] Starting session job batch...");

  const autoPostResult = await autoPostUpcomingSessions();
  const ensureFutureResult = await ensureFutureSessions();
  const remindersResult = await sendSessionReminders();
  const autopilotResult = await runAutopilotDueJobs();
  const usageResult = await sweepSessionUsage();

  console.log("[runSessionJobs] Batch complete");

  return {
    success: true,
    autoPost: autoPostResult,
    ensureFuture: ensureFutureResult,
    reminders: remindersResult,
    autopilot: autopilotResult,
    usage: usageResult,
    timestamp: new Date().toISOString(),
  };
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
 * Session end lifecycle: mark the session completed. Nothing is published.
 *
 * This used to fire `generateSessionRecap` here, which wrote a recap straight
 * to the community feed before the host had read a word of it. Ending a session
 * is not consent to publish, so the call is gone rather than deferred: the
 * recap is drafted on demand by `lib/jobs/session-recap.ts` and reaches the
 * feed only through the host's explicit share.
 *
 * Was one of three `endSession` implementations (session-jobs, session-core,
 * sessions) with differing auth postures — the classic "hardened one copy"
 * hazard. It is now the only one; app/actions/session-jobs.ts exposes it to the
 * browser behind a host-or-admin check.
 */
export async function endSessionJob(sessionId: string) {
  try {
    const endedAt = new Date();
    const session = await prisma.mentorSession.update({
      where: { id: sessionId },
      data: { status: "COMPLETED", endedAt },
    });

    // The same metering the room_finished webhook does, because either can be
    // the one that actually ends a session: a host who clicks End Session
    // closes the room from the app, and LiveKit may or may not deliver its own
    // event afterwards. Both paths meter; the ledger's unique sessionId is what
    // makes the second one a no-op rather than a double charge.
    await meterCompletedSession(sessionId, endedAt);

    revalidatePath("/dashboard/sessions");
    revalidatePath(`/dashboard/sessions/${sessionId}`);

    return { success: true as const, session };
  } catch (error) {
    console.error("[endSessionJob] Error:", error);
    return { success: false as const, error: String(error) };
  }
}
