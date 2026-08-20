import { describe, it, expect, vi, beforeEach } from "vitest";

process.env.LIVEKIT_API_KEY = "test-api-key";
process.env.LIVEKIT_API_SECRET = "test-api-secret-at-least-32-chars-long";

// `vi.mock` is hoisted above the file's own consts, so the spy has to be
// created inside `vi.hoisted` for the factory to be able to close over it.
const { sendVideoUsageWarningEmail } = vi.hoisted(() => ({
  sendVideoUsageWarningEmail: vi.fn(async () => ({ success: true as const })),
}));
vi.mock("@/lib/email", () => ({ sendVideoUsageWarningEmail }));

import { prisma } from "@/lib/prisma";
import { PLAN_LIMITS } from "@/lib/plans";
import {
  readCommunityVideoUsage,
  notifyUsageThresholds,
  flooredHours,
  WARN_THRESHOLD_PERCENT,
  OVER_THRESHOLD_PERCENT,
} from "@/lib/usage/video-usage";

/**
 * Step B1 — the read side of the cap. Nothing here refuses anyone.
 *
 * Two things it has to get right, and both are about which number is shown.
 *
 * `community_video_usage.usedSeconds` accumulates `appliedSeconds`, which is
 * `max(exact, approx)`. Nobody can be connected for longer than the room was
 * open, so `exact <= approx` is arithmetic rather than a tendency — which makes
 * `applied` the approximation in every case except perfect full attendance, and
 * the approximation counts every participant for the whole session window
 * regardless of when they actually arrived. Erring upward was right while
 * nothing depended on the figure. It stops being right when the figure is put
 * in front of the person paying for it, so the display and the warnings derive
 * from `exactSeconds` and the ledger column is left alone.
 *
 * And a page view must not open a billing period. `resolveUsageRow` creates;
 * the read path may not touch it, or a row made by whoever happened to look
 * would carry their moment as its period anchor.
 */

const PERIOD_START = new Date("2026-08-01T00:00:00.000Z");
const PERIOD_END = new Date("2026-09-01T00:00:00.000Z");
const NOW = new Date("2026-08-20T12:00:00.000Z");

function community(plan = "CREATOR") {
  vi.mocked(prisma.community.findUnique).mockResolvedValue({
    // One stand-in serves both reads: `readCommunityVideoUsage` wants the
    // plan, the warning wants somewhere to send to.
    owner: { platformPlan: plan, email: "owner@example.com" },
    ownerId: "owner_1",
    name: "Calm Coaching",
    slug: "calm",
    language: "es",
  } as never);
}

/** No Stripe subscription — `resolveBillingPeriod` falls back to the calendar month. */
function calendarMonth() {
  vi.mocked(prisma.subscription.findFirst).mockResolvedValue(null as never);
}

function usageRow(overrides: Record<string, unknown> = {}) {
  vi.mocked(prisma.communityVideoUsage.findUnique).mockResolvedValue({
    id: "usage_1",
    warnedAt80: null,
    warnedAt100: null,
    ...overrides,
  } as never);
}

function accrued(exactSeconds: number | null) {
  vi.mocked(prisma.sessionUsageAccrual.aggregate).mockResolvedValue({
    _sum: { exactSeconds },
  } as never);
}

beforeEach(() => {
  vi.clearAllMocks();
  community();
  calendarMonth();
});

// ───────────────────────────────────────────────────────────────────────────
describe("the caps", () => {
  it("carries an allowance for every tier", () => {
    expect(PLAN_LIMITS.START.videoParticipantHours).toBe(15);
    expect(PLAN_LIMITS.CREATOR.videoParticipantHours).toBe(150);
    expect(PLAN_LIMITS.BUSINESS.videoParticipantHours).toBe(500);
    expect(PLAN_LIMITS.PRO.videoParticipantHours).toBe(2000);
  });

  it("never rounds hours up", () => {
    // 149.97 rounded up prints "150 of 150" while the allowance still has
    // minutes in it. A number that says stop while the door is open is worse
    // than no number.
    expect(flooredHours(149.97 * 3600)).toBe(149.9);
    expect(flooredHours(3599)).toBe(0.9);
    expect(flooredHours(0)).toBe(0);
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe("reading a community's usage", () => {
  it("sums exactSeconds, not the applied ledger", async () => {
    usageRow();
    accrued(54_000); // 15 h

    const usage = await readCommunityVideoUsage("c1", NOW);

    expect(prisma.sessionUsageAccrual.aggregate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { usageId: "usage_1" },
        _sum: { exactSeconds: true },
      })
    );
    expect(usage.usedSeconds).toBe(54_000);
    expect(usage.usedHours).toBe(15);
  });

  it("resolves the cap from the owner's plan", async () => {
    community("BUSINESS");
    usageRow();
    accrued(0);

    const usage = await readCommunityVideoUsage("c1", NOW);

    expect(usage.plan).toBe("BUSINESS");
    expect(usage.capHours).toBe(500);
    expect(usage.capSeconds).toBe(500 * 3600);
  });

  it("treats a community with no owner plan as Start", async () => {
    vi.mocked(prisma.community.findUnique).mockResolvedValue(null as never);
    usageRow();
    accrued(0);

    const usage = await readCommunityVideoUsage("c1", NOW);
    expect(usage.plan).toBe("START");
    expect(usage.capHours).toBe(15);
  });

  it("reports zero for a period nothing has been accrued in", async () => {
    vi.mocked(prisma.communityVideoUsage.findUnique).mockResolvedValue(null as never);

    const usage = await readCommunityVideoUsage("c1", NOW);

    expect(usage.usedSeconds).toBe(0);
    expect(usage.percent).toBe(0);
    expect(usage.state).toBe("normal");
    // And does not go looking for accruals it knows cannot exist.
    expect(prisma.sessionUsageAccrual.aggregate).not.toHaveBeenCalled();
  });

  it("does not create a usage row to answer a page", async () => {
    // The whole reason this is a separate function from `accrueSessionUsage`.
    vi.mocked(prisma.communityVideoUsage.findUnique).mockResolvedValue(null as never);

    await readCommunityVideoUsage("c1", NOW);

    expect(prisma.communityVideoUsage.create).not.toHaveBeenCalled();
    expect(prisma.communityVideoUsage.upsert).not.toHaveBeenCalled();
  });

  it("floors the percentage rather than rounding it", async () => {
    usageRow();
    accrued(Math.round(149.9 * 3600)); // 99.93 % of 150 h

    expect((await readCommunityVideoUsage("c1", NOW)).percent).toBe(99);
  });

  it("reports past the cap without clamping", async () => {
    usageRow();
    accrued(300 * 3600); // 200 % of Creator

    const usage = await readCommunityVideoUsage("c1", NOW);
    expect(usage.percent).toBe(200);
    expect(usage.state).toBe("over");
  });

  it("names the three states at their thresholds", async () => {
    usageRow();

    accrued(Math.round((WARN_THRESHOLD_PERCENT / 100) * 150 * 3600) - 3600);
    expect((await readCommunityVideoUsage("c1", NOW)).state).toBe("normal");

    accrued(Math.round((WARN_THRESHOLD_PERCENT / 100) * 150 * 3600));
    expect((await readCommunityVideoUsage("c1", NOW)).state).toBe("warn");

    accrued(Math.round((OVER_THRESHOLD_PERCENT / 100) * 150 * 3600));
    expect((await readCommunityVideoUsage("c1", NOW)).state).toBe("over");
  });

  it("reads the same period the accrual writes to", async () => {
    // If the two ever resolved different anchors, a host would read one number
    // on screen and be measured against another.
    usageRow();
    accrued(0);

    const usage = await readCommunityVideoUsage("c1", NOW);

    expect(prisma.communityVideoUsage.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { communityId_periodStart: { communityId: "c1", periodStart: PERIOD_START } },
      })
    );
    expect(usage.periodStart).toEqual(PERIOD_START);
    expect(usage.resetsAt).toEqual(PERIOD_END);
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe("the warning emails", () => {
  /** The conditional write reports how many rows it changed. */
  function claimSucceeds(count = 1) {
    vi.mocked(prisma.communityVideoUsage.updateMany).mockResolvedValue({ count } as never);
  }

  it("sends nothing below 80%", async () => {
    usageRow();
    accrued(100 * 3600); // 66 %
    claimSucceeds();

    await notifyUsageThresholds("c1", NOW);

    expect(prisma.communityVideoUsage.updateMany).not.toHaveBeenCalled();
    expect(sendVideoUsageWarningEmail).not.toHaveBeenCalled();
  });

  it("claims the mark before sending, never after", async () => {
    // Read-decide-send-write loses to concurrency: two accruals in the same
    // second both read null and both send.
    usageRow();
    accrued(120 * 3600); // 80 %
    claimSucceeds();

    await notifyUsageThresholds("c1", NOW);

    expect(prisma.communityVideoUsage.updateMany).toHaveBeenCalledWith({
      where: { id: "usage_1", warnedAt80: null },
      data: { warnedAt80: NOW },
    });
    expect(sendVideoUsageWarningEmail).toHaveBeenCalledTimes(1);
    expect(sendVideoUsageWarningEmail).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ threshold: 80, capHours: 150 })
    );
  });

  it("stays silent when another writer claimed the mark first", async () => {
    usageRow();
    accrued(120 * 3600);
    claimSucceeds(0); // the conditional write matched nothing

    await notifyUsageThresholds("c1", NOW);

    expect(sendVideoUsageWarningEmail).not.toHaveBeenCalled();
  });

  it("sends one email, not two, when a session crosses both marks at once", async () => {
    // A busy session can take a community from 70 % to 130 %. Two emails
    // arriving together would say the same thing twice.
    usageRow();
    accrued(200 * 3600); // 133 %
    claimSucceeds();

    await notifyUsageThresholds("c1", NOW);

    expect(sendVideoUsageWarningEmail).toHaveBeenCalledTimes(1);
    expect(sendVideoUsageWarningEmail).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ threshold: 100 })
    );
    // And the 80 mark is taken off the table so it cannot fire later.
    expect(prisma.communityVideoUsage.updateMany).toHaveBeenCalledWith({
      where: { id: "usage_1", warnedAt80: null },
      data: { warnedAt80: NOW },
    });
  });

  it("does not repeat a warning already sent this cycle", async () => {
    usageRow({ warnedAt80: new Date("2026-08-10T00:00:00.000Z") });
    accrued(120 * 3600);
    claimSucceeds();

    await notifyUsageThresholds("c1", NOW);

    expect(sendVideoUsageWarningEmail).not.toHaveBeenCalled();
  });

  it("stops early once both marks are spent", async () => {
    usageRow({
      warnedAt80: new Date("2026-08-10T00:00:00.000Z"),
      warnedAt100: new Date("2026-08-15T00:00:00.000Z"),
    });

    await notifyUsageThresholds("c1", NOW);

    expect(prisma.sessionUsageAccrual.aggregate).not.toHaveBeenCalled();
    expect(sendVideoUsageWarningEmail).not.toHaveBeenCalled();
  });

  it("says nothing for a period nothing has been accrued in", async () => {
    vi.mocked(prisma.communityVideoUsage.findUnique).mockResolvedValue(null as never);

    await notifyUsageThresholds("c1", NOW);

    expect(prisma.communityVideoUsage.updateMany).not.toHaveBeenCalled();
    expect(sendVideoUsageWarningEmail).not.toHaveBeenCalled();
  });

  it("writes to the owner in the community's language", async () => {
    // `User` carries no locale column, so the language the community is run in
    // is the nearest real signal for the person who runs it.
    usageRow();
    accrued(120 * 3600);
    claimSucceeds();

    await notifyUsageThresholds("c1", NOW);

    expect(sendVideoUsageWarningEmail).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ locale: "es", communityName: "Calm Coaching" })
    );
  });

  it("never throws — a warning must not fail the thing that ended the session", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(prisma.communityVideoUsage.findUnique).mockRejectedValue(new Error("db down"));

    await expect(notifyUsageThresholds("c1", NOW)).resolves.toBeUndefined();
    expect(error).toHaveBeenCalledWith(
      "[video-usage] usage warning failed",
      expect.objectContaining({ communityId: "c1" })
    );
  });
});
