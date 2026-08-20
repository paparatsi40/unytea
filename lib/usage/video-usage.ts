import { prisma } from "@/lib/prisma";
import { Prisma, type PlatformPlan } from "@prisma/client";
import { getLimitsForPlan } from "@/lib/plans";
import { sendVideoUsageWarningEmail } from "@/lib/email";
import { SITE_URL } from "@/lib/site-url";

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

/**
 * Elapsed is measured from the participation rows, never from the scheduled
 * `duration` and — since the fix below — never from `session.startedAt`.
 *
 * It used to be `endedAt − startedAt`, and that is what kept
 * `session_usage_accruals` empty from the day it shipped. Nothing in this
 * product sets `startedAt`: a session goes SCHEDULED → COMPLETED, because the
 * two writers that would set it are a `startSession` action no surface calls
 * and a `room_started` webhook that does not arrive. So `computeSessionUsage`
 * returned null for every session that had ever ended, `accrueSessionUsage`
 * turned that into `skipped/not_measurable`, and nothing was logged, because
 * nothing threw. The empty table was the only symptom.
 *
 * `joinedAt` and `leftAt` are better ground truth anyway. They are written by
 * the code path that actually happened — somebody connected — rather than by a
 * lifecycle transition the product does not perform, and they describe
 * occupancy, which is what a participant-hour is.
 */
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
 * Returns null only when there is genuinely nothing to measure against: no
 * session, or a session that has not ended. A session that ended with nobody in
 * it returns zeros rather than null, and is accrued as zero — "counted, and it
 * came to nothing" is a fact worth writing down, and a `skipped` that says
 * nothing is precisely how this module hid its own failure for a week.
 *
 * `endedAt` is the only session column read. `startedAt` is deliberately not
 * consulted; see the note on `SessionUsageFigures`.
 */
export async function computeSessionUsage(sessionId: string): Promise<SessionUsageFigures | null> {
  const session = await prisma.mentorSession.findUnique({
    where: { id: sessionId },
    select: {
      endedAt: true,
      attendeeCount: true,
      participations: { select: { durationSeconds: true, joinedAt: true, leftAt: true } },
    },
  });

  if (!session) {
    console.error("[video-usage] not measurable", { sessionId, reason: "session_not_found" });
    return null;
  }
  if (!session.endedAt) {
    console.error("[video-usage] not measurable", { sessionId, reason: "no_ended_at" });
    return null;
  }

  const participations = session.participations;

  const exactSeconds = participations.reduce((total, p) => total + (p.durationSeconds ?? 0), 0);

  /**
   * The occupancy window: first arrival to last departure.
   *
   * A participation still open — `participant_left` never delivered, or the
   * accrual reached here before `closeOpenParticipations` did — is measured to
   * the session's end rather than dropped. Dropping it would shorten the window
   * for exactly the person whose data is missing, which is backwards.
   */
  const closedAt = session.endedAt;
  let elapsedSeconds = 0;
  if (participations.length > 0) {
    const firstJoin = Math.min(...participations.map((p) => p.joinedAt.getTime()));
    const lastLeave = Math.max(
      ...participations.map((p) => (p.leftAt ?? closedAt).getTime()),
      firstJoin
    );
    elapsedSeconds = Math.max(0, Math.floor((lastLeave - firstJoin) / 1000));
  }

  // Distinct joiners: everyone who occupied a connection at any point, host
  // included. `attendeeCount` is a denormalised count of these same rows, so
  // the larger of the two is taken — a stale cache may lag the table, never
  // lead it, and this module's standing rule is to err upward.
  const attendeeCount = Math.max(session.attendeeCount, participations.length);

  const approxSeconds = attendeeCount * elapsedSeconds;

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
      attendeeCount,
      ratio: Number((exactSeconds / approxSeconds).toFixed(3)),
    });
  }

  return {
    exactSeconds,
    approxSeconds,
    appliedSeconds,
    basis: exactSeconds >= approxSeconds ? "exact" : "approx",
    attendeeCount,
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
 * Say out loud what happened to one session's usage.
 *
 * The counter was empty for a week and nothing anywhere said why, because
 * nothing had gone wrong in the sense the code recognised: `computeSessionUsage`
 * returned null, `accrueSessionUsage` turned that into a `skipped` outcome, the
 * caller ignored the return value, and the `try/catch` built to keep metering
 * from breaking the room never fired — there was no exception. A silent skip is
 * a worse failure mode than a thrown one, because a thrown one is at least in a
 * log.
 *
 * Every caller routes its outcome through here. A session that ended and was
 * not counted is an error, whatever the reason: it is revenue-shaped data that
 * did not get recorded. The one exception is `before_epoch`, which is not a
 * failure but a decision — the counter starts at zero, and the sweep re-reads
 * every historical session on every run.
 */
export function logAccrualOutcome(sessionId: string, outcome: AccrualOutcome | null): void {
  if (outcome === null) return; // Already reported by `meterCompletedSession`.

  switch (outcome.status) {
    case "accrued":
      console.info("[video-usage] accrued", {
        sessionId,
        appliedSeconds: outcome.appliedSeconds,
        usedSeconds: outcome.usedSeconds,
      });
      return;
    case "already_accrued":
      return;
    case "skipped":
      if (outcome.reason === "before_epoch") return;
      console.error("[video-usage] session ended without being counted", {
        sessionId,
        reason: outcome.reason,
      });
  }
}

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

  // Told apart on purpose. "Ended before the counter existed" is a decision and
  // is silent; "has not ended" is a session that cannot be measured, and the
  // log has to be able to say which it saw. They shared a branch before, so
  // every unmeasurable session was reported as an intentional skip.
  if (!session.endedAt) return { status: "skipped", reason: "not_measurable" };
  if (session.endedAt < METERING_EPOCH) return { status: "skipped", reason: "before_epoch" };

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
    const outcome = await accrueSessionUsage(sessionId);
    logAccrualOutcome(sessionId, outcome);

    // After the accrual's transaction has committed, never inside it. Only when
    // this call is the one that moved the counter — an `already_accrued` means
    // another trigger got there first and has already had its chance to warn.
    if (outcome.status === "accrued") {
      await notifyAccruedSession(sessionId);
    }

    return outcome;
  } catch (error) {
    console.error("[video-usage] metering threw", {
      sessionId,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

// ───────────────────────────────────────────────────────────────────────────
// The read side (step B1). Nothing below writes, and nothing below refuses
// anyone — the gate is a separate piece of work behind its own flag.
// ───────────────────────────────────────────────────────────────────────────

/**
 * The figure a coach is shown, and the figure the warnings fire on.
 *
 * Derived from `exactSeconds`, not from `community_video_usage.usedSeconds`.
 * That column accumulates `appliedSeconds`, which is `max(exact, approx)` —
 * and since nobody can be connected for longer than the room was open,
 * `exact <= approx` is arithmetic rather than a tendency. So `applied` is the
 * approximation in every case except perfect full attendance, and the
 * approximation counts every participant for the whole session window
 * regardless of when they actually arrived.
 *
 * Over-counting was the right call while nothing depended on the number: it
 * errs upward and an upward error is visible. It stops being right the moment
 * the number is put in front of the person paying for it.
 *
 * `usedSeconds` is left exactly as it is, as the internal ledger of `applied`,
 * because the comparison between the two is the evidence that decides what the
 * gate will enforce on.
 */
export interface CommunityVideoUsageRead {
  plan: PlatformPlan;
  capHours: number;
  capSeconds: number;
  /** Sum of `exactSeconds` across this period's accruals. */
  usedSeconds: number;
  /** Floored to one decimal — never rounded up. See `flooredHours`. */
  usedHours: number;
  /** 0–n, floored. Can exceed 100; B1 does not clamp what it reports. */
  percent: number;
  periodStart: Date;
  periodEnd: Date;
  /** When the allowance resets — the period's end, named for what it means. */
  resetsAt: Date;
  state: UsageState;
}

export type UsageState = "normal" | "warn" | "over";

export const WARN_THRESHOLD_PERCENT = 80;
export const OVER_THRESHOLD_PERCENT = 100;

/**
 * Hours, floored to one decimal.
 *
 * Never `Math.round`. Rounding 149.97 up prints "150 of 150" while the
 * allowance still has minutes in it — a number that says stop while the door is
 * open is worse than no number at all.
 */
export function flooredHours(seconds: number): number {
  return Math.floor((seconds / 3600) * 10) / 10;
}

function stateFor(percent: number): UsageState {
  if (percent >= OVER_THRESHOLD_PERCENT) return "over";
  if (percent >= WARN_THRESHOLD_PERCENT) return "warn";
  return "normal";
}

/**
 * This community's video usage for the period it is currently in.
 *
 * Strictly read-only. It must not call `resolveUsageRow`, which creates: a
 * dashboard visit is not a reason to open a billing period, and a row created
 * by a page view would carry a period anchor decided by whoever happened to
 * look rather than by the first session that ran.
 *
 * A missing row therefore means zero used, not "start one".
 *
 * The period comes from `resolveBillingPeriod` — the same function the accrual
 * uses. If the two ever disagreed, a host would read one number on screen and
 * be measured against another.
 */
export async function readCommunityVideoUsage(
  communityId: string,
  now: Date = new Date()
): Promise<CommunityVideoUsageRead> {
  const community = await prisma.community.findUnique({
    where: { id: communityId },
    select: { owner: { select: { platformPlan: true } } },
  });

  const plan: PlatformPlan = community?.owner?.platformPlan ?? "START";
  const capHours = getLimitsForPlan(plan).videoParticipantHours;
  const capSeconds = capHours * 3600;

  const period = await resolveBillingPeriod(communityId, now);

  // findUnique, not resolveUsageRow. See the note above.
  const usage = await prisma.communityVideoUsage.findUnique({
    where: {
      communityId_periodStart: { communityId, periodStart: period.periodStart },
    },
    select: { id: true },
  });

  /**
   * The accruals of this period, found through the row they were filed under.
   *
   * `usageId` is the authoritative link and it is indexed. The alternative —
   * a date range over `accruedAt` — looks equivalent and is not: `accruedAt` is
   * when the row was written, and the hourly sweep can write a session's
   * accrual after the period it belongs to has already closed.
   */
  const totals = usage
    ? await prisma.sessionUsageAccrual.aggregate({
        where: { usageId: usage.id },
        _sum: { exactSeconds: true },
      })
    : null;

  const usedSeconds = totals?._sum.exactSeconds ?? 0;
  const percent = capSeconds > 0 ? Math.floor((usedSeconds / capSeconds) * 100) : 0;

  return {
    plan,
    capHours,
    capSeconds,
    usedSeconds,
    usedHours: flooredHours(usedSeconds),
    percent,
    periodStart: period.periodStart,
    periodEnd: period.periodEnd,
    resetsAt: period.periodEnd,
    state: stateFor(percent),
  };
}

/**
 * Resolve a session's community and hand it to the threshold check.
 *
 * `meterCompletedSession` holds a session id; the warning is about a community.
 * Split out so the entry point stays a sequence of named steps.
 */
export async function notifyAccruedSession(sessionId: string): Promise<void> {
  const session = await prisma.mentorSession.findUnique({
    where: { id: sessionId },
    select: { communityId: true },
  });
  if (session?.communityId) {
    await notifyUsageThresholds(session.communityId);
  }
}

/**
 * Send the 80 % and 100 % warnings, at most once each per billing period.
 *
 * Called from the accrual path — the only place `usedSeconds` moves — and never
 * from a render. A banner that appears because someone loaded a page is a
 * display; an email has to be triggered by the thing that actually happened.
 *
 * Two rules, and both are about not sending twice:
 *
 *  1. **Claim before sending.** Read-decide-send-write loses to concurrency:
 *     two accruals landing in the same second both read `null` and both send.
 *     The claim is a conditional write — `updateMany` with the mark still null —
 *     and the send happens only if the database reports it changed a row. The
 *     second writer is refused by the unique state of the row rather than by a
 *     check someone has to remember, which is the same doctrine the accrual's
 *     unique `sessionId` already follows.
 *
 *  2. **Send after the commit.** Never inside a transaction. An email is a slow
 *     network call, and one sent inside a transaction that then rolls back
 *     cannot be unsent.
 *
 * Crossing straight past 80 into 100 claims both marks and sends one email —
 * the 100 % one. Two emails arriving together would say the same thing twice.
 *
 * Never throws. This is a notification about bookkeeping; it must not be the
 * reason a room fails to close out.
 */
export async function notifyUsageThresholds(
  communityId: string,
  now: Date = new Date()
): Promise<void> {
  try {
    const period = await resolveBillingPeriod(communityId, now);

    const usage = await prisma.communityVideoUsage.findUnique({
      where: {
        communityId_periodStart: { communityId, periodStart: period.periodStart },
      },
      select: { id: true, warnedAt80: true, warnedAt100: true },
    });

    // No row means nothing has been accrued in this period, so there is nothing
    // to warn about. Note this reads rather than creates, like every other path
    // outside the accrual itself.
    if (!usage) return;
    if (usage.warnedAt80 && usage.warnedAt100) return;

    // The same function the dashboard renders from, so the number in the email
    // and the number on screen cannot disagree. It re-reads the row; that is a
    // query traded for the guarantee, on a path that runs once per session.
    const read = await readCommunityVideoUsage(communityId, now);

    const crossed100 = read.percent >= OVER_THRESHOLD_PERCENT;
    const crossed80 = read.percent >= WARN_THRESHOLD_PERCENT;
    if (!crossed80) return;

    const claim = async (field: "warnedAt80" | "warnedAt100"): Promise<boolean> => {
      const result = await prisma.communityVideoUsage.updateMany({
        where: { id: usage.id, [field]: null },
        data: { [field]: now },
      });
      return result.count === 1;
    };

    // Claimed in this order so that a jump past both marks takes 80 off the
    // table silently and reports only the 100 as newly claimed.
    const claimed80 = !usage.warnedAt80 && (await claim("warnedAt80"));
    const claimed100 = crossed100 && !usage.warnedAt100 && (await claim("warnedAt100"));

    const threshold: 80 | 100 | null = claimed100 ? 100 : claimed80 && !crossed100 ? 80 : null;
    if (threshold === null) return;

    const community = await prisma.community.findUnique({
      where: { id: communityId },
      select: {
        name: true,
        slug: true,
        language: true,
        owner: { select: { email: true } },
      },
    });
    if (!community?.owner?.email) return;

    await sendVideoUsageWarningEmail(community.owner.email, {
      communityName: community.name,
      threshold,
      usedHours: read.usedHours,
      capHours: read.capHours,
      resetsAt: read.resetsAt,
      // The community's own language. `User` carries no locale column, so this
      // is the nearest real signal: the language the community is run in is the
      // language its owner administers it in.
      locale: community.language ?? undefined,
      usageLink: `${SITE_URL}/dashboard/c/${community.slug}/settings/payments`,
    });
  } catch (error) {
    console.error("[video-usage] usage warning failed", {
      communityId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
