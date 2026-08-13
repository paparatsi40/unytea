import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Wrong-tenant / non-owner / non-partner regression tests.
 *
 * The H9 harness proves every gated action rejects an *anonymous* caller. It
 * cannot catch the class covered here: a caller who is authenticated, and often
 * a legitimate member of the community, but who is not entitled to the specific
 * row or operation. Each test below reproduces the concrete bypass found in the
 * verification pass.
 */

vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("@/lib/rate-limit", () => ({
  rateLimiters: new Proxy(
    {},
    { get: () => ({ check: async () => ({ success: true, remaining: 99, resetTime: 0 }) }) }
  ),
}));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
  unstable_cache: (fn: unknown) => fn,
}));
vi.mock("@/lib/cache-invalidation", () => ({
  revalidateLocalizedPath: vi.fn(),
}));
vi.mock("@/lib/jobs/autopilot", () => ({ startSessionAutopilot: vi.fn() }));
vi.mock("@/lib/jobs/session-schedule", () => ({ generateUpcomingSessions: vi.fn(() => []) }));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { makeMemberRow, makeCommunityRow } from "../helpers/authz";

import { createBuddyCheckIn } from "@/app/actions/buddy";
import { createSession, createSessionOrSeries } from "@/app/actions/sessions";
import { createCourseFromSession } from "@/app/actions/session-course";
import { reorderCommunitySections } from "@/app/actions/community-builder";

const CALLER = "user_caller";
const OTHER_A = "user_other_a";
const OTHER_B = "user_other_b";
const COMMUNITY = "community_1";

function signedInAs(userId: string) {
  vi.mocked(auth).mockResolvedValue({ user: { id: userId, role: "USER" } } as never);
}

/** Caller passes the seam's community gate at the given role. */
function memberOf(role: "MEMBER" | "MODERATOR" | "ADMIN" | "OWNER" = "MEMBER") {
  vi.mocked(prisma.member.findUnique).mockResolvedValue(
    makeMemberRow({ userId: CALLER, communityId: COMMUNITY, role })
  );
  vi.mocked(prisma.community.findUnique).mockResolvedValue(makeCommunityRow());
}

beforeEach(() => {
  vi.clearAllMocks();
  signedInAs(CALLER);
  memberOf("MEMBER");
});

// ───────────────────────────────────────────────────────────────────────────
describe("M1 — createBuddyCheckIn requires partnership membership", () => {
  const PARTNERSHIP = "partnership_1";

  function partnershipBetween(a: string, b: string) {
    // communityOfPartnership resolves the tenant; assertBuddyPartner reads the pair.
    vi.mocked(prisma.buddyPartnership.findUnique).mockImplementation((async (args: {
      select?: Record<string, unknown>;
    }) => {
      if (args?.select && "communityId" in args.select) return { communityId: COMMUNITY };
      return { user1Id: a, user2Id: b };
    }) as never);
  }

  it("rejects a community member who is not a partner", async () => {
    partnershipBetween(OTHER_A, OTHER_B);

    const result = await createBuddyCheckIn(PARTNERSHIP, 4, "prying");

    expect(result).toMatchObject({ success: false, code: "FORBIDDEN" });
    expect(prisma.buddyCheckIn.create).not.toHaveBeenCalled();
  });

  it("admits the first partner", async () => {
    partnershipBetween(CALLER, OTHER_B);
    vi.mocked(prisma.buddyCheckIn.create).mockResolvedValue({ id: "ci_1" } as never);

    const result = await createBuddyCheckIn(PARTNERSHIP, 4, "mine");

    expect(result).toMatchObject({ success: true });
    expect(prisma.buddyCheckIn.create).toHaveBeenCalledTimes(1);
  });

  it("admits the second partner", async () => {
    partnershipBetween(OTHER_A, CALLER);
    vi.mocked(prisma.buddyCheckIn.create).mockResolvedValue({ id: "ci_1" } as never);

    await expect(createBuddyCheckIn(PARTNERSHIP, 4)).resolves.toMatchObject({ success: true });
  });

  it("attributes the check-in to the caller, not to a supplied id", async () => {
    partnershipBetween(CALLER, OTHER_B);
    vi.mocked(prisma.buddyCheckIn.create).mockResolvedValue({ id: "ci_1" } as never);

    await createBuddyCheckIn(PARTNERSHIP, 4);

    const arg = vi.mocked(prisma.buddyCheckIn.create).mock.calls[0][0] as {
      data: { userId: string };
    };
    expect(arg.data.userId).toBe(CALLER);
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe("M2/M3 — session creation is owner-only and tenant-scoped", () => {
  const baseSession = {
    title: "Injected session",
    description: "x",
    scheduledAt: new Date("2026-06-01T10:00:00Z"),
    duration: 60,
    communityId: COMMUNITY,
  };

  function notAMember() {
    vi.mocked(prisma.member.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.community.findUnique).mockResolvedValue(makeCommunityRow());
  }

  it("createSession rejects a non-member of the target community", async () => {
    notAMember();

    const result = await createSession(baseSession);

    expect(result).toMatchObject({ success: false, code: "FORBIDDEN" });
    expect(prisma.mentorSession.create).not.toHaveBeenCalled();
  });

  it("createSession rejects a caller whose membership is not ACTIVE", async () => {
    vi.mocked(prisma.member.findUnique).mockResolvedValue(
      makeMemberRow({ userId: CALLER, communityId: COMMUNITY, status: "PENDING" })
    );

    const result = await createSession(baseSession);

    expect(result).toMatchObject({ success: false, code: "FORBIDDEN" });
    expect(prisma.mentorSession.create).not.toHaveBeenCalled();
  });

  describe("interaction with the paywall gate", () => {
    it("refuses a non-owner before the paywall is even considered", async () => {
      memberOf("MEMBER");
      vi.mocked(prisma.community.findUnique).mockResolvedValue(
        makeCommunityRow({ paywallLocked: true, ownerId: OTHER_A })
      );

      const result = await createSession(baseSession);

      // The seam checks the role before the paywall, so a non-owner is refused
      // outright rather than being told the community is locked.
      expect(result).toMatchObject({ success: false, code: "FORBIDDEN" });
      expect(prisma.mentorSession.create).not.toHaveBeenCalled();
    });

    it("lets the community's actual owner through a paywall lock", async () => {
      memberOf("OWNER");
      // The seam exempts the owner from their own community's lock so they can
      // reach it and fix billing. With creation now owner-only, that exemption
      // is the only way this branch is reachable at all.
      vi.mocked(prisma.community.findUnique).mockResolvedValue(
        makeCommunityRow({ paywallLocked: true, ownerId: CALLER })
      );
      vi.mocked(prisma.mentorSession.create).mockResolvedValue({ id: "s_1" } as never);

      const result = await createSession(baseSession);

      expect(result).not.toMatchObject({ code: "FORBIDDEN" });
      expect(result).not.toMatchObject({ code: "PAYWALL_LOCKED" });
    });
  });

  it("createSessionOrSeries rejects a non-member of the target community", async () => {
    notAMember();

    const result = await createSessionOrSeries({
      ...baseSession,
      timezone: "UTC",
      repeat: "once",
    });

    expect(result).toMatchObject({ success: false, code: "FORBIDDEN" });
    expect(prisma.mentorSession.create).not.toHaveBeenCalled();
  });

  it("createSessionOrSeries rejects a non-member creating a recurring series", async () => {
    notAMember();

    const result = await createSessionOrSeries({
      ...baseSession,
      timezone: "UTC",
      repeat: "WEEKLY",
      generateCount: 8,
    });

    expect(result).toMatchObject({ success: false, code: "FORBIDDEN" });
    expect(prisma.sessionSeries.create).not.toHaveBeenCalled();
  });

  it("rejects a session with no community — the standalone path is closed", async () => {
    memberOf("MEMBER");
    vi.mocked(prisma.mentorSession.create).mockResolvedValue({ id: "s_1" } as never);

    // communityId was nullable, so a session with no community escaped the
    // tenant gate entirely. There is no standalone-session feature (it cannot be
    // converted to a course, gets no autopilot and no recap), so the id is now
    // required and Zod rejects its absence before the handler runs.
    const result = await (
      createSession as unknown as (d: Record<string, unknown>) => Promise<unknown>
    )({ ...baseSession, communityId: undefined });

    expect(result).toMatchObject({ success: false, code: "VALIDATION" });
    expect(prisma.mentorSession.create).not.toHaveBeenCalled();
  });

  it("rejects an empty-string communityId", async () => {
    memberOf("MEMBER");

    const result = await (
      createSession as unknown as (d: Record<string, unknown>) => Promise<unknown>
    )({ ...baseSession, communityId: "" });

    expect(result).toMatchObject({ success: false, code: "VALIDATION" });
    expect(prisma.mentorSession.create).not.toHaveBeenCalled();
  });

  /**
   * Owner-only, per Carlos's decision. This replaces the prompt-03 case that
   * asserted any ACTIVE member could host: the policy changed deliberately, so
   * the assertion changes with it rather than the rule loosening silently.
   * ADMIN is intentionally excluded — widening is a one-word `roles` edit.
   */
  describe("only the community OWNER may host", () => {
    it.each(["MEMBER", "MODERATOR", "ADMIN"] as const)(
      "refuses a %s who is not the owner",
      async (role) => {
        memberOf(role);

        const result = await createSession(baseSession);

        expect(result).toMatchObject({ success: false, code: "FORBIDDEN" });
        expect(prisma.mentorSession.create).not.toHaveBeenCalled();
      }
    );

    it.each(["MEMBER", "MODERATOR", "ADMIN"] as const)(
      "refuses a %s creating a series",
      async (role) => {
        memberOf(role);

        const result = await createSessionOrSeries({
          ...baseSession,
          timezone: "UTC",
          repeat: "WEEKLY",
          generateCount: 8,
        });

        expect(result).toMatchObject({ success: false, code: "FORBIDDEN" });
        expect(prisma.mentorSession.create).not.toHaveBeenCalled();
        expect(prisma.sessionSeries.create).not.toHaveBeenCalled();
      }
    );

    it("admits the OWNER creating a session", async () => {
      memberOf("OWNER");
      vi.mocked(prisma.mentorSession.create).mockResolvedValue({ id: "s_1" } as never);

      const result = await createSession(baseSession);

      expect(result).not.toMatchObject({ code: "FORBIDDEN" });
      expect(prisma.mentorSession.create).toHaveBeenCalled();
    });

    it("admits the OWNER creating a series", async () => {
      memberOf("OWNER");
      vi.mocked(prisma.mentorSession.create).mockResolvedValue({ id: "s_1" } as never);
      vi.mocked(prisma.sessionSeries.create).mockResolvedValue({ id: "series_1" } as never);

      const result = await createSessionOrSeries({
        ...baseSession,
        timezone: "UTC",
        repeat: "once",
      });

      expect(result).not.toMatchObject({ code: "FORBIDDEN" });
    });
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe("M4 — createCourseFromSession requires the authoring role", () => {
  const SESSION = "session_1";

  function sessionInCommunity() {
    vi.mocked(prisma.mentorSession.findUnique).mockResolvedValue({
      id: SESSION,
      communityId: COMMUNITY,
      mentorId: CALLER, // the caller IS the host — that used to be sufficient
      recordingUrl: "https://cdn/rec.mp4",
      recording: { url: "https://cdn/rec.mp4" },
      notes: null,
      community: { id: COMMUNITY, slug: "c" },
      title: "S",
      description: null,
    } as never);
  }

  it("rejects a plain member who merely hosts the session", async () => {
    sessionInCommunity();
    memberOf("MEMBER");

    const result = await createCourseFromSession(SESSION, "Course from my session");

    expect(result).toMatchObject({ success: false, code: "FORBIDDEN" });
    expect(prisma.course.create).not.toHaveBeenCalled();
  });

  it("rejects a MODERATOR, matching createCourse's OWNER/ADMIN rule", async () => {
    sessionInCommunity();
    memberOf("MODERATOR");

    await expect(createCourseFromSession(SESSION, "Course")).resolves.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("admits an ADMIN of the community", async () => {
    sessionInCommunity();
    memberOf("ADMIN");
    vi.mocked(prisma.course.create).mockResolvedValue({ id: "course_1", slug: "s" } as never);
    vi.mocked(prisma.module.create).mockResolvedValue({ id: "m_1" } as never);
    vi.mocked(prisma.lesson.create).mockResolvedValue({ id: "l_1" } as never);

    const result = await createCourseFromSession(SESSION, "Course");

    expect(result).not.toMatchObject({ code: "FORBIDDEN" });
  });

  it("admits an OWNER", async () => {
    sessionInCommunity();
    memberOf("OWNER");
    vi.mocked(prisma.course.create).mockResolvedValue({ id: "course_1", slug: "s" } as never);
    vi.mocked(prisma.module.create).mockResolvedValue({ id: "m_1" } as never);
    vi.mocked(prisma.lesson.create).mockResolvedValue({ id: "l_1" } as never);

    await expect(createCourseFromSession(SESSION, "Course")).resolves.not.toMatchObject({
      code: "FORBIDDEN",
    });
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe("M5 — reorderCommunitySections cannot reach another tenant's rows", () => {
  beforeEach(() => {
    memberOf("ADMIN");
    // The handler re-reads membership itself before the transaction.
    vi.mocked(prisma.member.findUnique).mockResolvedValue(
      makeMemberRow({ userId: CALLER, communityId: COMMUNITY, role: "ADMIN" })
    );
  });

  it("scopes every write to the community that passed the gate", async () => {
    vi.mocked(prisma.communitySection.updateMany).mockResolvedValue({ count: 1 } as never);

    await reorderCommunitySections(COMMUNITY, ["sec_a", "sec_b"]);

    const calls = vi.mocked(prisma.communitySection.updateMany).mock.calls;
    expect(calls).toHaveLength(2);
    for (const [arg] of calls) {
      // Pre-fix the where was `{ id }` alone, so an admin of A could rewrite
      // B's ordering by passing B's section ids.
      expect((arg as { where: Record<string, unknown> }).where).toMatchObject({
        communityId: COMMUNITY,
      });
    }
  });

  it("reports failure rather than success when an id belongs to another community", async () => {
    // A foreign id matches no row once the write is tenant-scoped: count 0.
    vi.mocked(prisma.communitySection.updateMany)
      .mockResolvedValueOnce({ count: 1 } as never)
      .mockResolvedValueOnce({ count: 0 } as never);

    const result = await reorderCommunitySections(COMMUNITY, ["sec_mine", "sec_from_community_b"]);

    expect(result).toMatchObject({ success: false });
    expect((result as { error: string }).error).toMatch(/do not belong to this community/i);
  });

  it("succeeds when every id belongs to the caller's community", async () => {
    vi.mocked(prisma.communitySection.updateMany).mockResolvedValue({ count: 1 } as never);
    vi.mocked(prisma.community.findUnique).mockResolvedValue(makeCommunityRow());

    await expect(reorderCommunitySections(COMMUNITY, ["a", "b", "c"])).resolves.toMatchObject({
      success: true,
    });
  });
});
