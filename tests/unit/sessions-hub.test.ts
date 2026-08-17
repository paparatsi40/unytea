import { describe, it, expect, vi, beforeEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
// getUserSessions runs through defineAction, which resolves identity, reads
// request headers and rate-limits before the handler ever runs.
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/rate-limit", () => ({
  rateLimiters: new Proxy(
    {},
    { get: () => ({ check: async () => ({ success: true, remaining: 10, resetTime: 0 }) }) }
  ),
}));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getUserSessions as rawGetUserSessions } from "@/app/actions/sessions";
import { isActionFailure } from "@/lib/actions/errors";

/** Unwraps the seam's failure shape so the assertions stay about ordering. */
async function getUserSessions() {
  const result = await rawGetUserSessions();
  if (isActionFailure(result) || !result.sessions) {
    throw new Error("unexpected action failure");
  }
  return result.sessions;
}

/**
 * The sessions hub showed the wrong end of history.
 *
 * `getUserSessions` fetched everything with a single `orderBy: { scheduledAt:
 * "asc" }` and split the result into two buckets. Ascending is right for
 * `upcoming` — soonest first — and exactly wrong for `past`, which came back
 * oldest-first. The hub renders `past.slice(0, 6)`, so the six oldest sessions
 * filled the card and nothing from this week ever appeared.
 *
 * One `orderBy` cannot express two directions, so each bucket is sorted after
 * the split, on rows already in hand.
 */

const REPO_ROOT = path.resolve(__dirname, "../..");

const HOUR = 60 * 60 * 1000;
const now = Date.now();

function session(id: string, offsetMs: number) {
  return {
    id,
    title: id,
    description: null,
    scheduledAt: new Date(now + offsetMs),
    duration: 60,
    status: offsetMs < 0 ? "COMPLETED" : "SCHEDULED",
    recordingUrl: null,
    mentorId: "u1",
    menteeId: "u1",
    mentor: { id: "u1", name: "Ada", image: null, username: null },
    mentee: { id: "u1", name: "Ada", image: null, username: null },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(auth).mockResolvedValue({ user: { id: "u1" } } as never);
  vi.mocked(prisma.member.findMany).mockResolvedValue([] as never);
});

describe("getUserSessions ordering", () => {
  it("returns past sessions newest first", async () => {
    // Deliberately handed back ascending, the way the query returns them.
    vi.mocked(prisma.mentorSession.findMany).mockResolvedValue([
      session("five-months-ago", -150 * 24 * HOUR),
      session("four-months-ago", -120 * 24 * HOUR),
      session("this-week", -2 * 24 * HOUR),
    ] as never);

    const { past } = await getUserSessions();

    expect(past.map((s) => s.id)).toEqual(["this-week", "four-months-ago", "five-months-ago"]);
  });

  it("puts a session that ended this week above months-old ones", async () => {
    // The exact shape of the bug: the hub only renders the first six, so a
    // recent session has to survive the slice.
    const older = Array.from({ length: 6 }, (_, i) => session(`old-${i}`, -(100 + i) * 24 * HOUR));
    vi.mocked(prisma.mentorSession.findMany).mockResolvedValue([
      ...older,
      session("this-week", -3 * 24 * HOUR),
    ] as never);

    const { past } = await getUserSessions();

    expect(past[0].id).toBe("this-week");
    expect(past.slice(0, 6).map((s) => s.id)).toContain("this-week");
  });

  it("still returns upcoming sessions soonest first", async () => {
    vi.mocked(prisma.mentorSession.findMany).mockResolvedValue([
      session("next-month", 30 * 24 * HOUR),
      session("tomorrow", 24 * HOUR),
      session("in-an-hour", HOUR),
    ] as never);

    const { upcoming } = await getUserSessions();

    expect(upcoming.map((s) => s.id)).toEqual(["in-an-hour", "tomorrow", "next-month"]);
  });

  it("splits on the current time, not on status", async () => {
    vi.mocked(prisma.mentorSession.findMany).mockResolvedValue([
      session("past", -HOUR),
      session("future", HOUR),
    ] as never);

    const { past, upcoming } = await getUserSessions();

    expect(past.map((s) => s.id)).toEqual(["past"]);
    expect(upcoming.map((s) => s.id)).toEqual(["future"]);
  });
});

describe("the hub's past-session card", () => {
  const source = fs
    .readFileSync(
      path.join(REPO_ROOT, "app/(dashboard)/dashboard/sessions/SessionsPageClient.tsx"),
      "utf8"
    )
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

  it("shows the recording badge only when there is a recording", () => {
    // It used to key off `status === "COMPLETED"`, so every past session
    // claimed a recording while the Watch button — which does check the URL —
    // appeared on none of them. Nothing writes recordingUrl but the
    // egress-finished webhook, and egress is still a TODO.
    expect(source).toContain("{s.recordingUrl && (");
    expect(source).not.toContain('{s.status === "COMPLETED" && (');
  });

  it("the view-all control actually does something", () => {
    // It was a bare <Button>: no href, no onClick, nothing to click through to.
    expect(source).toMatch(/onClick=\{\(\) => setShowAllPast/);
  });
});
