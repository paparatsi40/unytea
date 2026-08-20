import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * SEC-06 — Pusher cross-tenant channel authorization and event injection.
 *
 * The auth handler parsed the channel id out of `private-channel-{id}` and then
 * discarded it (`void _channelId`) under a comment claiming it had been
 * validated. Every authenticated user was therefore authorized for every
 * private channel: any account could subscribe to any community's chat, or to a
 * stranger's DM thread, by naming it.
 *
 * A companion `PUT` handler forwarded a client-chosen channel, event name and
 * payload straight to Pusher — fabricated `message` events into any tenant.
 */

const mockAuthorizeChannel = vi.fn(() => ({ auth: "signed" }));
vi.mock("@/lib/pusher-server", () => ({
  authorizePrivateChannel: (...args: unknown[]) => mockAuthorizeChannel(...(args as [])),
  emitRealtime: vi.fn(),
  realtimeChannelName: (id: string) => `private-channel-${id}`,
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as pusherRoute from "@/app/api/pusher/route";

const CALLER = "user_caller";
const OTHER = "user_other";
const COMMUNITY_A = "community_a";
const CHANNEL_IN_A = "channel_in_a";
const CONVERSATION = "conversation_1";

/** No channel and no conversation exists by default; each test opts in. */
function nothingResolves() {
  vi.mocked(prisma.channel.findUnique).mockResolvedValue(null);
  vi.mocked(prisma.conversation.findUnique).mockResolvedValue(null);
  vi.mocked(prisma.member.findUnique).mockResolvedValue(null);
}

function channelBelongsTo(communityId: string) {
  vi.mocked(prisma.channel.findUnique).mockResolvedValue({ communityId } as never);
}

function callerMembership(status: string | null) {
  vi.mocked(prisma.member.findUnique).mockResolvedValue(status ? ({ status } as never) : null);
}

function conversationBetween(a: string, b: string) {
  vi.mocked(prisma.conversation.findUnique).mockResolvedValue({
    participant1Id: a,
    participant2Id: b,
  } as never);
}

function authRequest(channelName: string) {
  const form = new FormData();
  form.set("socket_id", "123.456");
  form.set("channel_name", channelName);
  return new Request("http://localhost:3000/api/pusher", { method: "POST", body: form });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(auth).mockResolvedValue({ user: { id: CALLER, name: "Caller" } } as never);
  nothingResolves();
});

describe("canAccessRealtimeChannel — community channels", () => {
  it("refuses a caller who is not a member of the channel's community", async () => {
    channelBelongsTo(COMMUNITY_A);
    callerMembership(null);

    const access = await pusherRoute.canAccessRealtimeChannel(CHANNEL_IN_A, CALLER);

    expect(access.allowed).toBe(false);
  });

  it("refuses a caller whose membership is not ACTIVE", async () => {
    channelBelongsTo(COMMUNITY_A);
    callerMembership("PENDING");

    const access = await pusherRoute.canAccessRealtimeChannel(CHANNEL_IN_A, CALLER);

    expect(access.allowed).toBe(false);
  });

  it("admits an ACTIVE member", async () => {
    channelBelongsTo(COMMUNITY_A);
    callerMembership("ACTIVE");

    const access = await pusherRoute.canAccessRealtimeChannel(CHANNEL_IN_A, CALLER);

    expect(access.allowed).toBe(true);
  });

  it("scopes the membership lookup to the channel's own community", async () => {
    channelBelongsTo(COMMUNITY_A);
    callerMembership("ACTIVE");

    await pusherRoute.canAccessRealtimeChannel(CHANNEL_IN_A, CALLER);

    // A member of community B must not be admitted to A's channel, which only
    // holds if the lookup is keyed on the channel's community.
    expect(prisma.member.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId_communityId: { userId: CALLER, communityId: COMMUNITY_A } },
      })
    );
  });
});

describe("canAccessRealtimeChannel — DM conversations", () => {
  it("refuses a caller who is not a participant", async () => {
    conversationBetween(OTHER, "someone_else");

    const access = await pusherRoute.canAccessRealtimeChannel(CONVERSATION, CALLER);

    expect(access.allowed).toBe(false);
  });

  it("admits participant 1", async () => {
    conversationBetween(CALLER, OTHER);
    await expect(pusherRoute.canAccessRealtimeChannel(CONVERSATION, CALLER)).resolves.toMatchObject(
      { allowed: true }
    );
  });

  it("admits participant 2", async () => {
    conversationBetween(OTHER, CALLER);
    await expect(pusherRoute.canAccessRealtimeChannel(CONVERSATION, CALLER)).resolves.toMatchObject(
      { allowed: true }
    );
  });

  it("does not fall back to community membership for a conversation", async () => {
    // A conversation id must never be satisfied by being a member of something.
    conversationBetween(OTHER, "someone_else");
    callerMembership("ACTIVE");

    await expect(pusherRoute.canAccessRealtimeChannel(CONVERSATION, CALLER)).resolves.toMatchObject(
      { allowed: false }
    );
  });
});

describe("canAccessRealtimeChannel — unknown ids", () => {
  it("refuses an id that is neither a channel nor a conversation", async () => {
    const access = await pusherRoute.canAccessRealtimeChannel("made_up", CALLER);
    expect(access.allowed).toBe(false);
  });
});

describe("POST /api/pusher — the HTTP shell", () => {
  it("rejects an anonymous caller with 401", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);

    const res = await pusherRoute.POST(authRequest(`private-channel-${CHANNEL_IN_A}`));

    expect(res.status).toBe(401);
    expect(mockAuthorizeChannel).not.toHaveBeenCalled();
  });

  it("returns 403 and never signs for a non-member", async () => {
    channelBelongsTo(COMMUNITY_A);
    callerMembership(null);

    const res = await pusherRoute.POST(authRequest(`private-channel-${CHANNEL_IN_A}`));

    expect(res.status).toBe(403);
    // The core of the bug: authorizeChannel used to be reached unconditionally.
    expect(mockAuthorizeChannel).not.toHaveBeenCalled();
  });

  it("returns 403 for a conversation the caller is not part of", async () => {
    conversationBetween(OTHER, "someone_else");

    const res = await pusherRoute.POST(authRequest(`private-channel-${CONVERSATION}`));

    expect(res.status).toBe(403);
    expect(mockAuthorizeChannel).not.toHaveBeenCalled();
  });

  it("signs only after access is proven", async () => {
    channelBelongsTo(COMMUNITY_A);
    callerMembership("ACTIVE");

    const res = await pusherRoute.POST(authRequest(`private-channel-${CHANNEL_IN_A}`));

    expect(res.status).toBe(200);
    expect(mockAuthorizeChannel).toHaveBeenCalledTimes(1);
  });

  it("rejects a malformed channel name", async () => {
    const res = await pusherRoute.POST(authRequest("public-channel-oops"));

    expect(res.status).toBe(400);
    expect(mockAuthorizeChannel).not.toHaveBeenCalled();
  });

  it("does not leak why access was refused", async () => {
    channelBelongsTo(COMMUNITY_A);
    callerMembership(null);

    const res = await pusherRoute.POST(authRequest(`private-channel-${CHANNEL_IN_A}`));
    const body = await res.json();

    expect(JSON.stringify(body)).not.toMatch(/member|community|conversation/i);
  });
});

describe("the free-form trigger endpoint is gone", () => {
  it("exports no PUT handler", () => {
    // Any authenticated user could previously PUT an arbitrary channel, event
    // name and payload — fabricated messages into any tenant.
    expect((pusherRoute as Record<string, unknown>).PUT).toBeUndefined();
  });

  it("exports only POST", () => {
    const verbs = ["GET", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"];
    for (const verb of verbs) {
      expect(
        (pusherRoute as Record<string, unknown>)[verb],
        `${verb} should not exist`
      ).toBeUndefined();
    }
    expect(typeof pusherRoute.POST).toBe("function");
  });
});
