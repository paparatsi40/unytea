import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Wrong-tenant / non-owner regression tests for the LOW-tier findings and the
 * deleteRecording policy alignment. Same rationale as action-policy.test.ts:
 * the callers here are authenticated and often legitimate members, so the
 * anonymous-only H9 harness passes them either way.
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

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { makeMemberRow, makeCommunityRow } from "../helpers/authz";

import { getCommunityChannels, provisionDefaultChannels } from "@/app/actions/channels";
import { getCommunityActivity, getRecentMembers } from "@/app/actions/dashboard";
import { getNextCommunitySession } from "@/app/actions/public-sessions";
import { deleteRecording } from "@/app/actions/recording";

const CALLER = "user_caller";
const HOST = "user_host";
const COMMUNITY = "community_1";

function signedInAs(userId: string) {
  vi.mocked(auth).mockResolvedValue({ user: { id: userId, role: "USER" } } as never);
}

function memberOf(role: "MEMBER" | "MODERATOR" | "ADMIN" | "OWNER", userId = CALLER) {
  vi.mocked(prisma.member.findUnique).mockResolvedValue(
    makeMemberRow({ userId, communityId: COMMUNITY, role })
  );
  vi.mocked(prisma.community.findUnique).mockResolvedValue(makeCommunityRow());
}

beforeEach(() => {
  vi.clearAllMocks();
  signedInAs(CALLER);
  memberOf("MEMBER");
});

// ───────────────────────────────────────────────────────────────────────────
describe("L1 — channel provisioning is an admin operation", () => {
  beforeEach(() => {
    vi.mocked(prisma.channel.findMany).mockResolvedValue([]);
  });

  it("an ordinary member reading channels never triggers a write", async () => {
    memberOf("MEMBER");

    const result = await getCommunityChannels(COMMUNITY);

    expect(result).toMatchObject({ success: true });
    // Pre-fix, this same read created four rows when the list came back empty.
    expect(prisma.channel.createMany).not.toHaveBeenCalled();
  });

  it("tells an ordinary member they may not provision", async () => {
    memberOf("MEMBER");

    const result = (await getCommunityChannels(COMMUNITY)) as { canProvision: boolean };

    expect(result.canProvision).toBe(false);
  });

  it("rejects an ordinary member calling provision directly", async () => {
    memberOf("MEMBER");

    const result = await provisionDefaultChannels(COMMUNITY);

    expect(result).toMatchObject({ success: false, code: "FORBIDDEN" });
    expect(prisma.channel.createMany).not.toHaveBeenCalled();
  });

  it("rejects a non-member outright", async () => {
    vi.mocked(prisma.member.findUnique).mockResolvedValue(null);

    await expect(provisionDefaultChannels(COMMUNITY)).resolves.toMatchObject({
      code: "FORBIDDEN",
    });
    expect(prisma.channel.createMany).not.toHaveBeenCalled();
  });

  it.each(["MODERATOR", "ADMIN", "OWNER"] as const)("admits a %s", async (role) => {
    memberOf(role);
    vi.mocked(prisma.channel.findMany).mockResolvedValueOnce([]).mockResolvedValueOnce([
      { id: "ch_1", name: "General" },
    ] as never);

    const result = await provisionDefaultChannels(COMMUNITY);

    expect(result).toMatchObject({ success: true });
    expect(prisma.channel.createMany).toHaveBeenCalledTimes(1);
  });

  it("is idempotent — does not re-create when channels already exist", async () => {
    memberOf("ADMIN");
    vi.mocked(prisma.channel.findMany).mockResolvedValue([{ id: "ch_1" }] as never);

    const result = await provisionDefaultChannels(COMMUNITY);

    expect(result).toMatchObject({ success: true, created: false });
    expect(prisma.channel.createMany).not.toHaveBeenCalled();
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe("L2 — dashboard reads require ACTIVE membership", () => {
  beforeEach(() => {
    vi.mocked(prisma.member.findMany).mockResolvedValue([]);
    vi.mocked(prisma.post.findMany).mockResolvedValue([]);
    vi.mocked(prisma.mentorSession.findMany).mockResolvedValue([]);
  });

  it("getCommunityActivity scopes the community lookup to ACTIVE rows", async () => {
    await getCommunityActivity(6);

    const where = vi.mocked(prisma.member.findMany).mock.calls[0][0]?.where;
    // Pre-fix this was `{ userId }` alone, so a PENDING / REMOVED / BANNED row
    // still admitted the caller to that community's activity.
    expect(where).toMatchObject({ userId: CALLER, status: "ACTIVE" });
  });

  it("getRecentMembers scopes the community lookup to ACTIVE rows", async () => {
    await getRecentMembers(4);

    const where = vi.mocked(prisma.member.findMany).mock.calls[0][0]?.where;
    expect(where).toMatchObject({ userId: CALLER, status: "ACTIVE" });
  });

  it("a caller whose only membership is PENDING sees no communities", async () => {
    // With the ACTIVE predicate the lookup returns nothing, so the downstream
    // queries are scoped to an empty community list.
    vi.mocked(prisma.member.findMany).mockResolvedValue([]);

    await getCommunityActivity(6);

    const memberCalls = vi.mocked(prisma.member.findMany).mock.calls;
    const rosterCall = memberCalls[1]?.[0]?.where as { communityId?: { in: string[] } };
    if (rosterCall?.communityId) {
      expect(rosterCall.communityId.in).toEqual([]);
    }
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe("L3 — getNextCommunitySession does not expose private schedules", () => {
  it("filters to public communities", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    vi.mocked(prisma.mentorSession.findFirst).mockResolvedValue(null);

    await getNextCommunitySession(COMMUNITY);

    const where = vi.mocked(prisma.mentorSession.findFirst).mock.calls[0][0]?.where;
    // Pre-fix there was no community predicate at all, so an anonymous caller
    // could enumerate a private community's upcoming title and time by id.
    expect(where).toMatchObject({ community: { isPrivate: false } });
  });

  it("returns null for a private community", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    // The scoped query matches nothing for a private community.
    vi.mocked(prisma.mentorSession.findFirst).mockResolvedValue(null);

    const result = await getNextCommunitySession(COMMUNITY);

    expect(result).toMatchObject({ success: true, session: null });
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe("deleteRecording — host or community admin, as documented", () => {
  const RECORDING = "rec_1";
  const SESSION = "session_1";

  beforeEach(() => {
    // Satisfies both projections taken of this row: communityOfRecording
    // selects session.communityId, the handler selects sessionId.
    vi.mocked(prisma.recording.findUnique).mockResolvedValue({
      sessionId: SESSION,
      session: { communityId: COMMUNITY },
    } as never);
    vi.mocked(prisma.mentorSession.findUnique).mockResolvedValue({ mentorId: HOST } as never);
  });

  it("rejects a plain member who is neither host nor admin", async () => {
    memberOf("MEMBER");

    const result = await deleteRecording(RECORDING);

    expect(result).toMatchObject({ success: false, code: "FORBIDDEN" });
    expect(prisma.recording.delete).not.toHaveBeenCalled();
  });

  it("admits the session host", async () => {
    signedInAs(HOST);
    memberOf("MEMBER", HOST);
    vi.mocked(prisma.recording.delete).mockResolvedValue({} as never);

    await expect(deleteRecording(RECORDING)).resolves.toMatchObject({ success: true });
  });

  it("admits a community ADMIN who is not the host, matching the documented policy", async () => {
    memberOf("ADMIN");
    vi.mocked(prisma.recording.delete).mockResolvedValue({} as never);

    // Pre-fix the code compared mentorId only, so this was refused despite the
    // comment promising "host or admin".
    await expect(deleteRecording(RECORDING)).resolves.toMatchObject({ success: true });
  });

  it("admits a community OWNER who is not the host", async () => {
    memberOf("OWNER");
    vi.mocked(prisma.recording.delete).mockResolvedValue({} as never);

    await expect(deleteRecording(RECORDING)).resolves.toMatchObject({ success: true });
  });
});
