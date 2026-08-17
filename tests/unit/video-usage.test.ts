import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";

process.env.LIVEKIT_API_KEY = "test-api-key";
process.env.LIVEKIT_API_SECRET = "test-api-secret-at-least-32-chars-long";
process.env.LIVEKIT_URL = "wss://test.livekit.cloud";

// The webhook module verifies a signature before dispatching. These tests are
// about what the handlers do once an event is in hand, so the receiver hands
// back whatever the test queued.
const receivedEvent = { value: null as unknown };
vi.mock("livekit-server-sdk", async (importOriginal) => {
  const actual = await importOriginal<typeof import("livekit-server-sdk")>();
  return {
    ...actual,
    WebhookReceiver: class {
      async receive() {
        return receivedEvent.value;
      }
    },
  };
});

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { prisma } from "@/lib/prisma";
import {
  computeSessionUsage,
  accrueSessionUsage,
  closeOpenParticipations,
  meterCompletedSession,
  resolveBillingPeriod,
  calendarMonth,
  METERING_EPOCH,
} from "@/lib/usage/video-usage";
import { handleLiveKitWebhook } from "@/lib/jobs/livekit-webhook";
import { Prisma } from "@prisma/client";

/**
 * Step A of the video cap: the counter, and nothing else.
 *
 * There is no gate, no banner and no UI in this step, so nothing a user does
 * can reveal a bug here. These tests are the only place the metering is
 * observed at all, which is why they cover the arithmetic, the idempotency and
 * the identity lookup the exact figure depends on.
 */

const REPO_ROOT = path.resolve(__dirname, "../..");

/** Comments are prose about intent; structural assertions must not read them. */
function code(relativePath: string) {
  return fs
    .readFileSync(path.join(REPO_ROOT, relativePath), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

const AFTER_EPOCH = new Date(METERING_EPOCH.getTime() + 24 * 60 * 60 * 1000);

/** An hour-long session, ended, after the epoch. */
function sessionRow(overrides: Record<string, unknown> = {}) {
  return {
    startedAt: AFTER_EPOCH,
    endedAt: new Date(AFTER_EPOCH.getTime() + 60 * 60 * 1000),
    attendeeCount: 3,
    communityId: "comm-1",
    participations: [],
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe("computeSessionUsage", () => {
  it("sums the exact seconds across every participation", async () => {
    vi.mocked(prisma.mentorSession.findUnique).mockResolvedValue(
      sessionRow({
        attendeeCount: 3,
        participations: [
          { durationSeconds: 3600 }, // host, present the whole hour
          { durationSeconds: 3600 },
          { durationSeconds: 3000 },
        ],
      }) as never
    );

    const figures = await computeSessionUsage("s1");

    // 3600 + 3600 + 3000. The host's hour is in there: nothing filters by role,
    // which is the decision that the host occupies a connection like anyone.
    expect(figures?.exactSeconds).toBe(10200);
    expect(figures?.elapsedSeconds).toBe(3600);
  });

  it("applies the exact figure when it is the larger of the two", async () => {
    vi.mocked(prisma.mentorSession.findUnique).mockResolvedValue(
      sessionRow({
        attendeeCount: 2, // approx = 2 × 3600 = 7200
        participations: [
          { durationSeconds: 3600 },
          { durationSeconds: 3600 },
          { durationSeconds: 1800 },
        ],
      }) as never
    );

    const figures = await computeSessionUsage("s1");

    expect(figures?.exactSeconds).toBe(9000);
    expect(figures?.approxSeconds).toBe(7200);
    expect(figures?.appliedSeconds).toBe(9000);
    expect(figures?.basis).toBe("exact");
  });

  it("applies the approximation when the exact figure is short", async () => {
    // The shape of a partly-delivered webhook: three people joined, one
    // `participant_left` arrived.
    vi.mocked(prisma.mentorSession.findUnique).mockResolvedValue(
      sessionRow({ attendeeCount: 3, participations: [{ durationSeconds: 3600 }] }) as never
    );

    const figures = await computeSessionUsage("s1");

    expect(figures?.exactSeconds).toBe(3600);
    expect(figures?.approxSeconds).toBe(10800);
    expect(figures?.appliedSeconds).toBe(10800);
    expect(figures?.basis).toBe("approx");
  });

  it("treats a missing durationSeconds as zero rather than NaN", async () => {
    vi.mocked(prisma.mentorSession.findUnique).mockResolvedValue(
      sessionRow({ participations: [{ durationSeconds: null }, { durationSeconds: 600 }] }) as never
    );

    expect((await computeSessionUsage("s1"))?.exactSeconds).toBe(600);
  });

  it("measures elapsed from the real clock, not the booked duration", async () => {
    // Booked for an hour, actually ran twenty minutes.
    vi.mocked(prisma.mentorSession.findUnique).mockResolvedValue(
      sessionRow({
        endedAt: new Date(AFTER_EPOCH.getTime() + 20 * 60 * 1000),
        attendeeCount: 2,
        participations: [],
      }) as never
    );

    const figures = await computeSessionUsage("s1");
    expect(figures?.elapsedSeconds).toBe(1200);
    expect(figures?.approxSeconds).toBe(2400);
  });

  it("returns null for a session that never ran", async () => {
    vi.mocked(prisma.mentorSession.findUnique).mockResolvedValue(
      sessionRow({ startedAt: null }) as never
    );
    expect(await computeSessionUsage("s1")).toBeNull();

    vi.mocked(prisma.mentorSession.findUnique).mockResolvedValue(
      sessionRow({ endedAt: null }) as never
    );
    expect(await computeSessionUsage("s1")).toBeNull();
  });

  it("returns null when the end is not after the start", async () => {
    vi.mocked(prisma.mentorSession.findUnique).mockResolvedValue(
      sessionRow({ endedAt: AFTER_EPOCH }) as never
    );
    expect(await computeSessionUsage("s1")).toBeNull();
  });
});

describe("the divergence monitor", () => {
  /**
   * A dead webhook and a genuinely quiet community produce the same counter, so
   * the gap between exact and approx is the only evidence either way. Nothing
   * reads this yet but a human tailing logs — which is the point of the step.
   */
  it("warns when the exact figure lands under half the approximation", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.mocked(prisma.mentorSession.findUnique).mockResolvedValue(
      sessionRow({ attendeeCount: 4, participations: [{ durationSeconds: 3600 }] }) as never
    );

    await computeSessionUsage("s1");

    expect(warn).toHaveBeenCalledWith(
      "[video-usage] divergence",
      expect.objectContaining({ sessionId: "s1", exactSeconds: 3600, approxSeconds: 14400 })
    );
  });

  it("stays quiet when people simply arrived late and left early", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.mocked(prisma.mentorSession.findUnique).mockResolvedValue(
      sessionRow({
        attendeeCount: 3,
        participations: [
          { durationSeconds: 3600 },
          { durationSeconds: 3000 },
          { durationSeconds: 2400 },
        ],
      }) as never
    );

    await computeSessionUsage("s1");

    expect(warn).not.toHaveBeenCalled();
  });
});

describe("accrueSessionUsage", () => {
  function mockSession(overrides: Record<string, unknown> = {}) {
    vi.mocked(prisma.mentorSession.findUnique).mockResolvedValue(
      sessionRow({
        attendeeCount: 2,
        participations: [{ durationSeconds: 3600 }],
        ...overrides,
      }) as never
    );
    vi.mocked(prisma.community.findUnique).mockResolvedValue({ ownerId: "owner-1" } as never);
    vi.mocked(prisma.subscription.findFirst).mockResolvedValue(null as never);
  }

  it("writes one ledger row and increments the counter by the applied seconds", async () => {
    mockSession();
    vi.mocked(prisma.communityVideoUsage.findUnique).mockResolvedValue({ id: "usage-1" } as never);
    vi.mocked(prisma.sessionUsageAccrual.create).mockResolvedValue({} as never);
    vi.mocked(prisma.communityVideoUsage.update).mockResolvedValue({ usedSeconds: 7200 } as never);

    const outcome = await accrueSessionUsage("s1");

    expect(outcome).toMatchObject({ status: "accrued", appliedSeconds: 7200, usedSeconds: 7200 });
    expect(prisma.communityVideoUsage.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { usedSeconds: { increment: 7200 } } })
    );
  });

  it("records both figures and the basis, not only the one applied", async () => {
    // The whole reason to ship the counter blind is to compare them over a
    // cycle. Storing only the winner would throw away the comparison.
    mockSession();
    vi.mocked(prisma.communityVideoUsage.findUnique).mockResolvedValue({ id: "usage-1" } as never);
    vi.mocked(prisma.sessionUsageAccrual.create).mockResolvedValue({} as never);
    vi.mocked(prisma.communityVideoUsage.update).mockResolvedValue({ usedSeconds: 7200 } as never);

    await accrueSessionUsage("s1");

    expect(prisma.sessionUsageAccrual.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          sessionId: "s1",
          exactSeconds: 3600,
          approxSeconds: 7200,
          appliedSeconds: 7200,
          basis: "approx",
          attendeeCount: 2,
          elapsedSeconds: 3600,
        }),
      })
    );
  });

  /**
   * Three triggers reach this — the end-session job, the room_finished webhook
   * and the hourly sweep — and they can arrive in any order or all at once. The
   * unique index on `sessionId` is the mechanism; the second writer is refused
   * by the database rather than by a check someone has to remember to write.
   */
  it("counts a session once even when every trigger fires", async () => {
    mockSession();
    vi.mocked(prisma.communityVideoUsage.findUnique).mockResolvedValue({ id: "usage-1" } as never);
    vi.mocked(prisma.communityVideoUsage.update).mockResolvedValue({ usedSeconds: 7200 } as never);

    // The database refuses the second and third inserts on the unique sessionId.
    vi.mocked(prisma.sessionUsageAccrual.create)
      .mockResolvedValueOnce({} as never)
      .mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
          code: "P2002",
          clientVersion: "5.22.0",
        })
      );

    const outcomes = [
      await accrueSessionUsage("s1"),
      await accrueSessionUsage("s1"),
      await accrueSessionUsage("s1"),
    ];

    expect(outcomes.map((o) => o.status)).toEqual([
      "accrued",
      "already_accrued",
      "already_accrued",
    ]);
    expect(prisma.sessionUsageAccrual.create).toHaveBeenCalledTimes(3);
    // One insert, one increment. The counter cannot drift from the ledger
    // because both happen in the same transaction.
    expect(prisma.communityVideoUsage.update).toHaveBeenCalledTimes(1);
  });

  it("skips a session that ended before the counter existed", async () => {
    // No backfill: the counter starts at zero and history is not swept in.
    mockSession({
      startedAt: new Date(METERING_EPOCH.getTime() - 3 * 60 * 60 * 1000),
      endedAt: new Date(METERING_EPOCH.getTime() - 2 * 60 * 60 * 1000),
    });

    expect(await accrueSessionUsage("s1")).toEqual({
      status: "skipped",
      reason: "before_epoch",
    });
    expect(prisma.sessionUsageAccrual.create).not.toHaveBeenCalled();
  });

  it("skips a session with no community, since there is no counter to belong to", async () => {
    mockSession({ communityId: null });

    expect(await accrueSessionUsage("s1")).toEqual({ status: "skipped", reason: "no_community" });
    expect(prisma.sessionUsageAccrual.create).not.toHaveBeenCalled();
  });

  it("skips an unmeasurable session instead of accruing a zero", async () => {
    // A zero row would claim the unique sessionId and block the real accrual
    // that a later, successful end would produce.
    mockSession({ startedAt: null });

    expect(await accrueSessionUsage("s1")).toEqual({
      status: "skipped",
      reason: "not_measurable",
    });
    expect(prisma.sessionUsageAccrual.create).not.toHaveBeenCalled();
  });
});

describe("the billing period a community is counted against", () => {
  it("anchors to the owner's Stripe cycle when they have one", async () => {
    // Otherwise the allowance resets on a different day than the invoice, and
    // there is a month where they pay twice for one allowance.
    const periodStart = new Date("2026-08-09T00:00:00.000Z");
    const periodEnd = new Date("2026-09-09T00:00:00.000Z");
    vi.mocked(prisma.community.findUnique).mockResolvedValue({ ownerId: "owner-1" } as never);
    vi.mocked(prisma.subscription.findFirst).mockResolvedValue({
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
    } as never);

    expect(await resolveBillingPeriod("comm-1", new Date("2026-08-17T12:00:00.000Z"))).toEqual({
      periodStart,
      periodEnd,
    });
  });

  it("falls back to the calendar month when there is no subscription", async () => {
    // START has no Stripe period to read.
    vi.mocked(prisma.community.findUnique).mockResolvedValue({ ownerId: "owner-1" } as never);
    vi.mocked(prisma.subscription.findFirst).mockResolvedValue(null as never);

    expect(await resolveBillingPeriod("comm-1", new Date("2026-08-17T12:00:00.000Z"))).toEqual({
      periodStart: new Date("2026-08-01T00:00:00.000Z"),
      periodEnd: new Date("2026-09-01T00:00:00.000Z"),
    });
  });

  it("rolls the calendar month across a year boundary", () => {
    expect(calendarMonth(new Date("2026-12-20T23:00:00.000Z"))).toEqual({
      periodStart: new Date("2026-12-01T00:00:00.000Z"),
      periodEnd: new Date("2027-01-01T00:00:00.000Z"),
    });
  });
});

describe("closeOpenParticipations", () => {
  it("accumulates the open stretch rather than replacing the total", async () => {
    // Someone who dropped and rejoined is one row, and both stretches count.
    vi.mocked(prisma.sessionParticipation.findMany).mockResolvedValue([
      { id: "p1", joinedAt: new Date("2026-08-18T10:00:00Z"), durationSeconds: 600 },
    ] as never);

    await closeOpenParticipations("s1", new Date("2026-08-18T10:30:00Z"));

    expect(prisma.sessionParticipation.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ durationSeconds: 2400 }) })
    );
  });

  it("only looks at stretches that are still open, so calling it twice is safe", async () => {
    vi.mocked(prisma.sessionParticipation.findMany).mockResolvedValue([] as never);

    await closeOpenParticipations("s1");

    expect(prisma.sessionParticipation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { sessionId: "s1", leftAt: null } })
    );
    expect(prisma.sessionParticipation.update).not.toHaveBeenCalled();
  });

  it("never writes a negative stretch when the clocks disagree", async () => {
    vi.mocked(prisma.sessionParticipation.findMany).mockResolvedValue([
      { id: "p1", joinedAt: new Date("2026-08-18T10:30:00Z"), durationSeconds: 100 },
    ] as never);

    await closeOpenParticipations("s1", new Date("2026-08-18T10:00:00Z"));

    expect(prisma.sessionParticipation.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ durationSeconds: 100 }) })
    );
  });
});

/**
 * The root cause the whole exact figure rests on.
 *
 * Both handlers used to derive a user id with `identity.split("-")[0]`, for a
 * `{userId}-{timestamp}` identity the token stopped minting. `joinSession`
 * issues `${sessionId}:${userId}` — no hyphen — so the split returned the whole
 * string, which then failed a foreign key to User.id. `participant_joined`
 * threw before it reached the attendee count, and `participant_left` found no
 * row and wrote no duration. `durationSeconds` had never been populated by a
 * webhook in this codebase.
 */
describe("the webhook identity lookup", () => {
  const HEADER = "Bearer test";

  afterEach(() => {
    receivedEvent.value = null;
  });

  it("finds the participation by the identity the token carries", async () => {
    receivedEvent.value = {
      event: "participant_left",
      room: { name: "session-abc" },
      participant: { identity: "abc:user-1" },
    };
    vi.mocked(prisma.sessionParticipation.findUnique).mockResolvedValue({
      id: "p1",
      userId: "user-1",
      leftAt: null,
      joinedAt: new Date(Date.now() - 60_000),
      durationSeconds: 0,
    } as never);

    await handleLiveKitWebhook("{}", HEADER);

    expect(prisma.sessionParticipation.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { livekitIdentity: "abc:user-1" } })
    );
    expect(prisma.sessionParticipation.update).toHaveBeenCalled();
  });

  it("writes a duration on leave, which is what makes the exact figure possible", async () => {
    receivedEvent.value = {
      event: "participant_left",
      room: { name: "session-abc" },
      participant: { identity: "abc:user-1" },
    };
    vi.mocked(prisma.sessionParticipation.findUnique).mockResolvedValue({
      id: "p1",
      userId: "user-1",
      leftAt: null,
      joinedAt: new Date("2026-08-18T10:00:00Z"),
      durationSeconds: 0,
    } as never);
    vi.setSystemTime(new Date("2026-08-18T10:45:00Z"));

    await handleLiveKitWebhook("{}", HEADER);
    vi.useRealTimers();

    expect(prisma.sessionParticipation.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ durationSeconds: 2700 }) })
    );
  });

  it("closes a stretch once, so a redelivered event cannot double the time", async () => {
    receivedEvent.value = {
      event: "participant_left",
      room: { name: "session-abc" },
      participant: { identity: "abc:user-1" },
    };
    vi.mocked(prisma.sessionParticipation.findUnique).mockResolvedValue({
      id: "p1",
      userId: "user-1",
      leftAt: new Date("2026-08-18T10:45:00Z"), // already closed
      joinedAt: new Date("2026-08-18T10:00:00Z"),
      durationSeconds: 2700,
    } as never);

    await handleLiveKitWebhook("{}", HEADER);

    expect(prisma.sessionParticipation.update).not.toHaveBeenCalled();
  });

  it("acknowledges an identity it has no row for instead of throwing", async () => {
    receivedEvent.value = {
      event: "participant_joined",
      room: { name: "session-abc" },
      participant: { identity: "who:is:this" },
    };
    vi.mocked(prisma.sessionParticipation.findUnique).mockResolvedValue(null as never);

    const result = await handleLiveKitWebhook("{}", HEADER);

    expect(result.success).toBe(true);
    expect(prisma.mentorSession.update).not.toHaveBeenCalled();
  });

  it("no longer parses anything out of the identity", () => {
    // The point is that the webhook never knows the identity's internal shape,
    // so a future change to the format cannot silently break attendance again.
    const source = code("lib/jobs/livekit-webhook.ts");
    expect(source).not.toMatch(/identity\.split\(/);
    expect(source).not.toMatch(/sessionId_userId/);
  });
});

describe("the accrual triggers are wired", () => {
  it("goes through the shared entry point on every end path", () => {
    // Three callers, one sequence. Each one open-coding "close, then accrue" is
    // how one of them ends up reading the participation table while rows are
    // still open, which silently turns the exact figure into a lower bound.
    for (const file of ["lib/jobs/livekit-webhook.ts", "lib/jobs/session-jobs.ts"]) {
      expect(code(file)).toMatch(/await meterCompletedSession\(/);
    }
  });

  it("closes participations before it reads them", () => {
    const source = code("lib/usage/video-usage.ts");
    const entry = source.indexOf("export async function meterCompletedSession");
    const close = source.indexOf("closeOpenParticipations(", entry);
    const accrue = source.indexOf("accrueSessionUsage(", entry);
    expect(close).toBeGreaterThan(entry);
    expect(accrue).toBeGreaterThan(close);
  });

  it("never lets metering fail the thing that ended the session", () => {
    // Ending a room is the user's action; counting it is bookkeeping. A failed
    // accrual that propagated would surface as "could not end session" — and
    // the sweep exists precisely so it does not have to propagate.
    vi.mocked(prisma.sessionParticipation.findMany).mockRejectedValue(new Error("db down"));

    return expect(meterCompletedSession("s1")).resolves.toBeNull();
  });

  it("runs the sweep as part of the hourly session batch", () => {
    const source = code("lib/jobs/session-jobs.ts");
    expect(source).toMatch(/await sweepSessionUsage\(\)/);
    expect(source).toMatch(/usage: usageResult/);
  });

  it("keeps the counter invisible: nothing under app/ or components/ reads it", () => {
    // Step A ships the measurement only. The gate, the banner and the usage
    // screen are step B, and shipping any of them here would mean enforcing a
    // number nobody has watched for a cycle yet.
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(path.join(REPO_ROOT, dir), { withFileTypes: true })) {
        if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
        const rel = `${dir}/${entry.name}`;
        if (entry.isDirectory()) {
          walk(rel);
        } else if (/\.tsx?$/.test(entry.name)) {
          const source = fs.readFileSync(path.join(REPO_ROOT, rel), "utf8");
          if (source.includes("lib/usage/video-usage")) offenders.push(rel);
        }
      }
    };
    walk("app");
    walk("components");

    expect(offenders).toEqual([]);
  });
});
