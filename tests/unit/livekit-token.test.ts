import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Regression tests for C3 — LiveKit session access.
 *
 * Two independently broken token issuers used to exist. Either let a free
 * account join and broadcast in a paid private session:
 *   SEC-03  POST /api/livekit/token granted canPublish for any client-supplied
 *           roomName, with no membership check.
 *   SEC-04  generateLiveKitToken let the caller pass their own `role`, so a
 *           non-participant sending { role: "host" } kept it.
 *
 * These assert the surviving issuer derives room, role and publish permission
 * from persisted state only.
 */

process.env.LIVEKIT_API_KEY = "test-api-key";
process.env.LIVEKIT_API_SECRET = "test-api-secret-at-least-32-chars-long";
process.env.LIVEKIT_URL = "wss://test.livekit.cloud";

const mockRateLimitCheck = vi.fn();
vi.mock("@/lib/rate-limit", () => ({
  rateLimiters: new Proxy(
    {},
    { get: () => ({ check: (...a: unknown[]) => mockRateLimitCheck(...a) }) }
  ),
}));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { joinSession } from "@/app/actions/livekit";
import { makeMemberRow, makeCommunityRow } from "../helpers/authz";

/** Decode a JWT payload without verifying — enough to inspect the granted video permissions. */
function decodeGrants(jwt: string) {
  const payload = JSON.parse(Buffer.from(jwt.split(".")[1], "base64url").toString("utf8"));
  return payload.video as {
    room: string;
    roomJoin: boolean;
    canPublish?: boolean;
    canSubscribe?: boolean;
  };
}

const sessionRow = {
  id: "session_1",
  title: "Weekly office hours",
  mentorId: "host_user",
  status: "IN_PROGRESS",
  videoRoomName: "room-for-session-1",
  roomId: "session-abc",
};

beforeEach(() => {
  vi.clearAllMocks();
  mockRateLimitCheck.mockResolvedValue({ success: true, remaining: 10, resetTime: Date.now() });
  vi.mocked(auth).mockResolvedValue({ user: { id: "member_user", role: "USER" } } as never);
  vi.mocked(prisma.mentorSession.findUnique).mockResolvedValue({
    communityId: "community_1",
    ...sessionRow,
  } as never);
  vi.mocked(prisma.community.findUnique).mockResolvedValue(makeCommunityRow());
  vi.mocked(prisma.member.findUnique).mockResolvedValue(makeMemberRow({ userId: "member_user" }));
  vi.mocked(prisma.sessionParticipation.findUnique).mockResolvedValue(null);
  vi.mocked(prisma.sessionParticipation.count).mockResolvedValue(3);
});

describe("joinSession — membership gate (SEC-03)", () => {
  it("rejects an anonymous caller", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    await expect(joinSession("session_1")).resolves.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("rejects an authenticated non-member of the hosting community", async () => {
    vi.mocked(prisma.member.findUnique).mockResolvedValue(null);
    await expect(joinSession("session_1")).resolves.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects a member when the community is paywall-locked", async () => {
    vi.mocked(prisma.community.findUnique).mockResolvedValue(
      makeCommunityRow({ paywallLocked: true, ownerId: "someone_else" })
    );
    await expect(joinSession("session_1")).resolves.toMatchObject({ code: "PAYWALL_LOCKED" });
  });

  it("issues no token to a rejected caller", async () => {
    vi.mocked(prisma.member.findUnique).mockResolvedValue(null);
    const result = await joinSession("session_1");
    expect(JSON.stringify(result)).not.toContain("eyJ");
  });
});

describe("joinSession — room is resolved server-side (SEC-03)", () => {
  it("scopes the grant to the session's own room", async () => {
    const result = await joinSession("session_1");
    expect(result).toMatchObject({ success: true });
    const grants = decodeGrants((result as { access: { token: string } }).access.token);
    expect(grants.room).toBe("room-for-session-1");
  });

  it("accepts no second argument, so a room name cannot be supplied", async () => {
    const attack = joinSession as unknown as (...a: unknown[]) => Promise<unknown>;
    await expect(attack("session_1", "someone-elses-room")).resolves.toMatchObject({
      code: "VALIDATION",
    });
  });

  it("falls back to a derived room name when the session has none", async () => {
    vi.mocked(prisma.mentorSession.findUnique).mockResolvedValue({
      communityId: "community_1",
      ...sessionRow,
      videoRoomName: null,
    } as never);

    const result = await joinSession("session_1");
    const grants = decodeGrants((result as { access: { token: string } }).access.token);
    expect(grants.room).toBe("session-abc");
  });
});

describe("joinSession — role and publish rights come from state, not input (SEC-04)", () => {
  it("gives a plain member listener rights with no publish permission", async () => {
    const result = await joinSession("session_1");
    const grants = decodeGrants((result as { access: { token: string } }).access.token);

    expect(grants.canPublish).toBeFalsy();
    expect(grants.canSubscribe).toBe(true);
    expect((result as { access: { role: string } }).access.role).toBe("listener");
  });

  it("gives the session host publish rights", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "host_user", role: "USER" } } as never);
    vi.mocked(prisma.member.findUnique).mockResolvedValue(makeMemberRow({ userId: "host_user" }));

    const result = await joinSession("session_1");
    const grants = decodeGrants((result as { access: { token: string } }).access.token);

    expect(grants.canPublish).toBe(true);
    expect((result as { access: { role: string } }).access.role).toBe("host");
  });

  it("honours a persisted speaker role", async () => {
    vi.mocked(prisma.sessionParticipation.findUnique).mockResolvedValue({
      role: "speaker",
    } as never);

    const result = await joinSession("session_1");
    const grants = decodeGrants((result as { access: { token: string } }).access.token);

    expect(grants.canPublish).toBe(true);
  });

  it("cannot be escalated by passing a role, because there is no role parameter", async () => {
    const attack = joinSession as unknown as (...a: unknown[]) => Promise<unknown>;
    await expect(attack("session_1", { role: "host" })).resolves.toMatchObject({
      code: "VALIDATION",
    });
  });
});

describe("joinSession — attendance is idempotent (C3)", () => {
  it("sets attendeeCount from distinct participation rows rather than incrementing", async () => {
    await joinSession("session_1");

    const updates = vi.mocked(prisma.mentorSession.update).mock.calls.map((c) => c[0]);
    const attendeeUpdate = updates.find(
      (u) => (u as { data?: Record<string, unknown> }).data?.attendeeCount !== undefined
    ) as { data: { attendeeCount: unknown } };

    expect(attendeeUpdate.data.attendeeCount).toBe(3);
    expect(JSON.stringify(attendeeUpdate.data)).not.toContain("increment");
  });

  it("uses a stable identity per (session, user) so rejoining does not double-count", async () => {
    const first = await joinSession("session_1");
    const second = await joinSession("session_1");

    const identityOf = (r: unknown) => (r as { access: { identity: string } }).access.identity;
    expect(identityOf(first)).toBe(identityOf(second));
    expect(identityOf(first)).toBe("session_1:member_user");
  });
});

describe("joinSession — session lifecycle", () => {
  it.each(["COMPLETED", "CANCELLED"])("refuses to issue a token for a %s session", async (status) => {
    vi.mocked(prisma.mentorSession.findUnique).mockResolvedValue({
      communityId: "community_1",
      ...sessionRow,
      status,
    } as never);

    await expect(joinSession("session_1")).resolves.toMatchObject({ success: false });
  });
});
