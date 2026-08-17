import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

/**
 * Participant-hour metering — the counter, step A.
 *
 * Nothing user-facing reads any of this yet. The point of shipping it blind is
 * to watch a full billing cycle of real numbers before a cap can block anyone,
 * because the measurement depends on a LiveKit webhook that has never worked in
 * this codebase and therefore has never been observed working.
 *
 * Two figures are computed for every session and both are stored:
 *
 *   exact   Σ `durationSeconds` across the session's participations. Correct,
 *           but only as complete as `participant_left` delivery.
 *   approx  `attendeeCount` × real elapsed. Needs no webhook at all.
 *
 * The counter takes `max(exact, approx)`. Not because the approximation is
 * better — it over-counts anyone who drops in for ninety seconds — but because
 * it can only ever err upward, and a cap that under-counts is indistinguishable
 * from an account that is simply quiet. Over-counting is visible; silence is
 * not. `estimated` retires once the two have tracked each other for a cycle.
 *
 * The host counts as a participant: they occupy a connection with real cost.
 *
 * Everything is seconds. Hours would round on every accrual and the drift would
 * compound across a cycle.
 */

/** Elapsed is measured from the real clock, never the scheduled `duration`. */
export interface SessionUsageFigures {
  exactSeconds: number;
  approxSeconds: number;
  appliedSeconds: number;
  basis: "exact" | "approx";
  attendeeCount: number;
  elapsedSeconds: number;
}

/**
 * A session whose exact figure lands below half its approximation is the signal
 * that the webhook is not delivering. Anything above that is normal — people
 * genuinely do arrive late and leave early.
 */
const DIVERGENCE_FLOOR = 0.5;

/**
 * Compute both figures for one session. Pure read; accrues nothing.
 *
 * Returns null when the session never actually ran — no `startedAt`, no
 * `endedAt`, or an end before its start. There is no usage to count and
 * inventing zero would create an accrual row that blocks a later, real one.
 */
export async function computeSessionUsage(sessionId: string): Promise<SessionUsageFigures | null> {
  const session = await prisma.mentorSession.findUnique({
    where: { id: sessionId },
    select: {
      startedAt: true,
      endedAt: true,
      attendeeCount: true,
      participations: { select: { durationSeconds: true } },
    },
  });

  if (!session?.startedAt || !session.endedAt) return null;

  const elapsedSeconds = Math.floor(
    (session.endedAt.getTime() - session.startedAt.getTime()) / 1000
  );
  if (elapsedSeconds <= 0) return null;

  const exactSeconds = session.participations.reduce(
    (total, p) => total + (p.durationSeconds ?? 0),
    0
  );

  // `attendeeCount` is distinct joiners, which is what this wants: everyone who
  // occupied a connection at any point, host included.
  const approxSeconds = session.attendeeCount * elapsedSeconds;

  const appliedSeconds = Math.max(exactSeconds, approxSeconds);

  if (approxSeconds > 0 && exactSeconds < approxSeconds * DIVERGENCE_FLOOR) {
    // The monitor. A dead webhook and a quiet community produce the same
    // counter, so the gap between the two figures is the only evidence either
    // way. Structured so it can be grepped or alerted on.
    console.warn("[video-usage] divergence", {
      sessionId,
      exactSeconds,
      approxSeconds,
      elapsedSeconds,
      attendeeCount: session.attendeeCount,
      ratio: Number((exactSeconds / approxSeconds).toFixed(3)),
    });
  }

  return {
    exactSeconds,
    approxSeconds,
    appliedSeconds,
    basis: exactSeconds >= approxSeconds ? "exact" : "approx",
    attendeeCount: session.attendeeCount,
    elapsedSeconds,
  };
}

/**
 * Nothing that ended before this instant is ever counted.
 *
 * The decision was that the counter starts at zero — no history is swept in.
 * Without a fixed floor that decision would hold only by accident: the backstop
 * sweep below looks for completed sessions that carry no accrual row, and every
 * session this platform has ever run matches that description. The epoch is the
 * migration's own timestamp, so "not counted" and "ended before the counter
 * existed" are the same statement.
 *
 * It is a constant rather than a config value on purpose. A movable floor is a
 * movable bill.
 */
export const METERING_EPOCH = new Date("2026-08-17T20:00:00.000Z");

/**
 * Close every participation still open for a session, accumulating the elapsed
 * stretch into `durationSeconds`.
 *
 * A participant whose `participant_left` never arrived — a browser killed, a
 * webhook dropped — otherwise leaves `durationSeconds` at whatever the last
 * completed stretch was, which is usually zero. The exact figure would then read
 * as "nobody attended" for a session that was full.
 *
 * Runs before every accrual, on both the webhook and the in-app end paths, so
 * the exact figure is measured against a settled table rather than a live one.
 * `leftAt: null` in the filter is what makes it safe to call repeatedly: a
 * stretch already closed is not in the result set, so it cannot be added twice.
 */
export async function closeOpenParticipations(sessionId: string, at: Date = new Date()) {
  const open = await prisma.sessionParticipation.findMany({
    where: { sessionId, leftAt: null },
    select: { id: true, joinedAt: true, durationSeconds: true },
  });

  for (const participation of open) {
    const stretch = Math.max(
      0,
      Math.floor((at.getTime() - participation.joinedAt.getTime()) / 1000)
    );
    await prisma.sessionParticipation.update({
      where: { id: participation.id },
      data: {
        leftAt: at,
        durationSeconds: (participation.durationSeconds || 0) + stretch,
      },
    });
  }

  return open.length;
}

export interface BillingPeriod {
  periodStart: Date;
  periodEnd: Date;
}

/**
 * The cycle a community's usage is counted against.
 *
 * The owner's Stripe period when they have a subscription — the allowance
 * should reset when the thing they pay for renews, and any other anchor
 * produces a month where they paid twice for one allowance. Calendar month
 * otherwise, since START has no Stripe period to read.
 *
 * Resolved once, at row creation. `resolveUsageRow` stores both bounds so that
 * a later subscription change cannot silently re-anchor a period already in
 * progress.
 */
export async function resolveBillingPeriod(
  communityId: string,
  now: Date = new Date()
): Promise<BillingPeriod> {
  const community = await prisma.community.findUnique({
    where: { id: communityId },
    select: { ownerId: true },
  });

  if (community) {
    const subscription = await prisma.subscription.findFirst({
      where: {
        userId: community.ownerId,
        currentPeriodStart: { lte: now },
        currentPeriodEnd: { gt: now },
      },
      select: { currentPeriodStart: true, currentPeriodEnd: true },
      orderBy: { currentPeriodStart: "desc" },
    });

    if (subscription) {
      return {
        periodStart: subscription.currentPeriodStart,
        periodEnd: subscription.currentPeriodEnd,
      };
    }
  }

  return calendarMonth(now);
}

/** UTC calendar month, for communities with no active subscription. */
export function calendarMonth(now: Date): BillingPeriod {
  const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const periodEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { periodStart, periodEnd };
}

/**
 * The usage row for the period `now` falls in, created if this is the first
 * accrual of the cycle.
 *
 * The `(communityId, periodStart)` unique index makes the create idempotent
 * under concurrency: two sessions ending in the same second both resolve the
 * same anchor, both try to create, and the loser reads the winner's row.
 */
async function resolveUsageRow(
  tx: Prisma.TransactionClient,
  communityId: string,
  period: BillingPeriod
) {
  const existing = await tx.communityVideoUsage.findUnique({
    where: { communityId_periodStart: { communityId, periodStart: period.periodStart } },
  });
  if (existing) return existing;

  try {
    return await tx.communityVideoUsage.create({
      data: {
        communityId,
        periodStart: period.periodStart,
        periodEnd: period.periodEnd,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return await tx.communityVideoUsage.findUniqueOrThrow({
        where: { communityId_periodStart: { communityId, periodStart: period.periodStart } },
      });
    }
    throw error;
  }
}

export type AccrualOutcome =
  | { status: "accrued"; appliedSeconds: number; usedSeconds: number }
  | { status: "already_accrued" }
  | { status: "skipped"; reason: "no_community" | "not_measurable" | "before_epoch" };

/**
 * Add one session's usage to its community's counter, exactly once.
 *
 * Three callers reach this — `endSessionJob`, the `room_finished` webhook and
 * the hourly cron sweep — and they can arrive in any order, or all three. The
 * `sessionId` unique index on the ledger is what makes that safe: the second
 * and third writers are refused by the database, not by a check that someone
 * could forget to write. The counter is bumped inside the same transaction as
 * the ledger insert, so a row can never exist without its contribution having
 * landed, nor the reverse.
 */
export async function accrueSessionUsage(sessionId: string): Promise<AccrualOutcome> {
  const session = await prisma.mentorSession.findUnique({
    where: { id: sessionId },
    select: { communityId: true, endedAt: true },
  });

  // A session with no community has no counter to belong to.
  if (!session?.communityId) return { status: "skipped", reason: "no_community" };
  const communityId = session.communityId;

  if (!session.endedAt || session.endedAt < METERING_EPOCH) {
    return { status: "skipped", reason: "before_epoch" };
  }

  const figures = await computeSessionUsage(sessionId);
  if (!figures) return { status: "skipped", reason: "not_measurable" };

  const period = await resolveBillingPeriod(communityId);

  try {
    return await prisma.$transaction(async (tx) => {
      const usage = await resolveUsageRow(tx, communityId, period);

      await tx.sessionUsageAccrual.create({
        data: {
          sessionId,
          communityId,
          usageId: usage.id,
          exactSeconds: figures.exactSeconds,
          approxSeconds: figures.approxSeconds,
          appliedSeconds: figures.appliedSeconds,
          basis: figures.basis,
          attendeeCount: figures.attendeeCount,
          elapsedSeconds: figures.elapsedSeconds,
        },
      });

      const updated = await tx.communityVideoUsage.update({
        where: { id: usage.id },
        data: { usedSeconds: { increment: figures.appliedSeconds } },
      });

      return {
        status: "accrued" as const,
        appliedSeconds: figures.appliedSeconds,
        usedSeconds: updated.usedSeconds,
      };
    });
  } catch (error) {
    // P2002 on `sessionId`: another trigger got there first. That is the
    // mechanism working, not a failure.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { status: "already_accrued" };
    }
    throw error;
  }
}

/**
 * The single entry point for "this session is over — count it".
 *
 * Three callers reach it: the host clicking End Session, the room_finished
 * webhook, and the hourly sweep. All three do the same two things in the same
 * order, and the order is not cosmetic: the exact figure is a sum over
 * `durationSeconds`, so the participation table has to settle before it is
 * read. Duplicating that sequence at three call sites is how one of them ends
 * up reading a live table.
 *
 * It never throws. Metering is bookkeeping — it must not be the reason a room
 * fails to close out or a host's End Session button reports an error. Anything
 * that fails here is logged and picked up by the next sweep, because the
 * missing ledger row is itself the retry queue.
 */
export async function meterCompletedSession(sessionId: string, endedAt: Date = new Date()) {
  try {
    await closeOpenParticipations(sessionId, endedAt);
    return await accrueSessionUsage(sessionId);
  } catch (error) {
    console.error(`[video-usage] metering failed for session=${sessionId}`, error);
    return null;
  }
}
