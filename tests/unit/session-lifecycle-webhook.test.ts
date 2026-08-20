import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * One wrong line, three symptoms.
 *
 * Every LiveKit webhook handler derived the session from the room name with
 *
 *     const sessionId = roomName.replace("session-", "");
 *
 * and room names are not built that way. `joinSession` picks
 * `videoRoomName || roomId || "session-" + id`, so any session that already
 * carried a `roomId` got a room name with somebody else's string in it.
 * Production, 2026-08-20: room `session-avkC13q3ImvD` for session
 * `cmt1tdkyc0001ylf2i6n711mo`.
 *
 * The three failures that came out of that one line:
 *
 *   500s in a retry loop  `participant_joined` ran `mentorSession.update` on
 *                         the stripped value without checking. P2025, "Record
 *                         to update not found", HTTP 500, and LiveKit redelivering
 *                         the same event.
 *   startedAt NULL        `room_started` missed its `findUnique`, warned
 *                         "Ack & skip" and returned. No session this platform
 *                         has run was ever marked IN_PROGRESS — which is what
 *                         emptied the usage counter, pinned "sessions this
 *                         week" at zero and rendered every post-session
 *                         duration as 0 min.
 *   nothing metered       `room_finished` missed the same way, so the room's
 *                         own end neither completed nor counted the session.
 *
 * The name is now matched against the columns it is stored in, and the
 * participant handlers do not look at it at all — the participation row they
 * already load carries the session. Going live also stopped being the
 * webhook's job alone: `joinSession` marks it, because a lifecycle that needs a
 * third party to deliver an event is NULL whenever they do not.
 */

process.env.LIVEKIT_API_KEY = "test-api-key";
process.env.LIVEKIT_API_SECRET = "test-api-secret-at-least-32-chars-long";
process.env.LIVEKIT_URL = "wss://test.livekit.cloud";

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

const mockRateLimitCheck = vi.fn();
vi.mock("@/lib/rate-limit", () => ({
  rateLimiters: new Proxy(
    {},
    { get: () => ({ check: (...a: unknown[]) => mockRateLimitCheck(...a) }) }
  ),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { handleLiveKitWebhook } from "@/lib/jobs/livekit-webhook";
import { joinSession } from "@/app/actions/livekit";
import { endSessionJob } from "@/lib/jobs/session-jobs";
import { METERING_EPOCH } from "@/lib/usage/video-usage";
import { makeMemberRow, makeCommunityRow } from "../helpers/authz";

const HEADER = "Bearer test";

/**
 * The production shape: the room is named after a `roomId` that has nothing to
 * do with the session id.
 */
const SESSION_ID = "cmt1tdkyc0001ylf2i6n711mo";
const ROOM_NAME = "session-avkC13q3ImvD";
const IDENTITY = `${SESSION_ID}:cmp7dni930002vausewwlfbqz`;

function sessionRow(overrides: Record<string, unknown> = {}) {
  return {
    id: SESSION_ID,
    communityId: "community_1",
    status: "SCHEDULED",
    startedAt: null,
    endedAt: null,
    videoRoomName: ROOM_NAME,
    roomId: ROOM_NAME,
    title: "vamos",
    mentorId: "host_user",
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
  mockRateLimitCheck.mockResolvedValue({ success: true, remaining: 10, resetTime: Date.now() });
  receivedEvent.value = null;

  // Only the room-name arms can match; a lookup by the stripped id would find
  // nothing, which is exactly the production failure.
  vi.mocked(prisma.mentorSession.findFirst).mockImplementation((async (args: {
    where?: { OR?: { videoRoomName?: string; roomId?: string; id?: string }[] };
  }) => {
    const matches = (args?.where?.OR ?? []).some(
      (arm) => arm.videoRoomName === ROOM_NAME || arm.roomId === ROOM_NAME || arm.id === SESSION_ID
    );
    return matches ? sessionRow() : null;
  }) as never);

  vi.mocked(prisma.mentorSession.update).mockResolvedValue(sessionRow() as never);
  vi.mocked(prisma.mentorSession.findUnique).mockResolvedValue(sessionRow() as never);
  vi.mocked(prisma.sessionParticipation.count).mockResolvedValue(2 as never);
  vi.mocked(prisma.sessionParticipation.findMany).mockResolvedValue([] as never);
  vi.mocked(prisma.sessionEvent.create).mockResolvedValue({} as never);
});

// ───────────────────────────────────────────────────────────────────────────
describe("a participant joining does not take the webhook down", () => {
  function participantJoined() {
    receivedEvent.value = {
      event: "participant_joined",
      room: { name: ROOM_NAME },
      participant: { identity: IDENTITY },
    };
    vi.mocked(prisma.sessionParticipation.findUnique).mockResolvedValue({
      id: "p1",
      userId: "cmp7dni930002vausewwlfbqz",
      sessionId: SESSION_ID,
    } as never);
    vi.mocked(prisma.sessionParticipation.update).mockResolvedValue({} as never);
  }

  it("acknowledges instead of returning a 500 LiveKit will retry", async () => {
    // The reported log line, exactly: this event 500ed on every delivery.
    participantJoined();

    await expect(handleLiveKitWebhook("{}", HEADER)).resolves.toMatchObject({ success: true });
  });

  it("finds the session on the participation row, not on the room name", async () => {
    // The row carries `sessionId`, so the handler needs no opinion about how
    // rooms are named — and the room name is what it used to get wrong.
    participantJoined();

    await handleLiveKitWebhook("{}", HEADER);

    expect(prisma.mentorSession.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: SESSION_ID } })
    );
  });

  it("recounts the attendees rather than incrementing them", async () => {
    // `joinSession` maintains `attendeeCount` as `count(participations)`. An
    // increment here counted the same person again on every reconnect, and a
    // webhook that retries made it worse each time.
    participantJoined();

    await handleLiveKitWebhook("{}", HEADER);

    expect(prisma.mentorSession.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ attendeeCount: 2 }) })
    );
    const [call] = vi.mocked(prisma.mentorSession.update).mock.calls;
    expect(JSON.stringify(call)).not.toContain("increment");
  });

  it("still acks an identity that was never minted here", async () => {
    receivedEvent.value = {
      event: "participant_joined",
      room: { name: ROOM_NAME },
      participant: { identity: "not-one-of-ours" },
    };
    vi.mocked(prisma.sessionParticipation.findUnique).mockResolvedValue(null as never);
    vi.spyOn(console, "warn").mockImplementation(() => {});

    await expect(handleLiveKitWebhook("{}", HEADER)).resolves.toMatchObject({ success: true });
    expect(prisma.mentorSession.update).not.toHaveBeenCalled();
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe("the room's own lifecycle reaches the session", () => {
  it("marks the session live when the room starts", async () => {
    receivedEvent.value = { event: "room_started", room: { name: ROOM_NAME } };

    await handleLiveKitWebhook("{}", HEADER);

    expect(prisma.mentorSession.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: SESSION_ID },
        data: expect.objectContaining({ status: "IN_PROGRESS", startedAt: expect.any(Date) }),
      })
    );
  });

  it("does not move a start that has already been recorded", async () => {
    // A room can be restarted. Moving the start forward would shorten every
    // figure derived from it.
    const started = new Date("2026-08-20T10:00:00.000Z");
    vi.mocked(prisma.mentorSession.findFirst).mockResolvedValue(
      sessionRow({ status: "IN_PROGRESS", startedAt: started }) as never
    );
    receivedEvent.value = { event: "room_started", room: { name: ROOM_NAME } };

    await handleLiveKitWebhook("{}", HEADER);

    const [call] = vi.mocked(prisma.mentorSession.update).mock.calls;
    expect((call[0] as { data: Record<string, unknown> }).data).not.toHaveProperty("startedAt");
  });

  it("completes and meters the session when the room finishes", async () => {
    receivedEvent.value = { event: "room_finished", room: { name: ROOM_NAME } };
    vi.mocked(prisma.mentorSession.findUnique).mockResolvedValue(
      sessionRow({ endedAt: null }) as never
    );

    await handleLiveKitWebhook("{}", HEADER);

    expect(prisma.mentorSession.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: SESSION_ID },
        data: expect.objectContaining({ status: "COMPLETED", endedAt: expect.any(Date) }),
      })
    );
    // `closeOpenParticipations` is the first thing metering does, so its read is
    // the proof the session id that reached it was the real one.
    expect(prisma.sessionParticipation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { sessionId: SESSION_ID, leftAt: null } })
    );
  });

  it("acks a room that resolves to nothing rather than retrying for ever", async () => {
    vi.mocked(prisma.mentorSession.findFirst).mockResolvedValue(null as never);
    vi.spyOn(console, "warn").mockImplementation(() => {});
    receivedEvent.value = { event: "room_started", room: { name: "session-gone" } };

    await expect(handleLiveKitWebhook("{}", HEADER)).resolves.toMatchObject({ success: true });
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe("the session goes live when someone walks in", () => {
  beforeEach(() => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "member_user", role: "USER" } } as never);
    vi.mocked(prisma.community.findUnique).mockResolvedValue(makeCommunityRow());
    vi.mocked(prisma.member.findUnique).mockResolvedValue(makeMemberRow({ userId: "member_user" }));
    vi.mocked(prisma.sessionParticipation.findUnique).mockResolvedValue(null as never);
    vi.mocked(prisma.sessionParticipation.upsert).mockResolvedValue({} as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ name: "Member" } as never);
  });

  it("moves a scheduled session to IN_PROGRESS and stamps the start", async () => {
    // Without this the transition belongs entirely to a webhook, and the
    // webhook is a third party. `startedAt` was NULL on every session on the
    // platform for exactly that reason.
    await joinSession(SESSION_ID);

    expect(prisma.mentorSession.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "IN_PROGRESS", startedAt: expect.any(Date) }),
      })
    );
  });

  it("leaves the start alone for the second person through the door", async () => {
    const started = new Date("2026-08-20T10:00:00.000Z");
    vi.mocked(prisma.mentorSession.findUnique).mockResolvedValue(
      sessionRow({ status: "IN_PROGRESS", startedAt: started }) as never
    );

    await joinSession(SESSION_ID);

    const update = vi
      .mocked(prisma.mentorSession.update)
      .mock.calls.map((call) => call[0] as { data: Record<string, unknown> })
      .find((call) => "attendeeCount" in call.data);
    expect(update?.data).not.toHaveProperty("startedAt");
    expect(update?.data).not.toHaveProperty("status");
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe("ending the session from the app writes the ledger row", () => {
  it("accrues and says what it counted", async () => {
    // The host's End Session button reaches `endSessionJob`, which has always
    // called `meterCompletedSession`. Nothing appeared in the logs because
    // nothing threw: the accrual returned a `skipped` outcome that no caller
    // read. Both halves are covered here — the row, and the line about it.
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const endedAt = new Date(METERING_EPOCH.getTime() + 24 * 60 * 60 * 1000);
    const joinedAt = new Date(endedAt.getTime() - 678 * 1000);

    vi.mocked(prisma.mentorSession.update).mockResolvedValue(
      sessionRow({ status: "COMPLETED", endedAt }) as never
    );
    vi.mocked(prisma.mentorSession.findUnique).mockResolvedValue({
      communityId: "community_1",
      endedAt,
      attendeeCount: 2,
      participations: [
        { durationSeconds: 673, joinedAt, leftAt: endedAt },
        { durationSeconds: 678, joinedAt, leftAt: endedAt },
      ],
    } as never);
    vi.mocked(prisma.community.findUnique).mockResolvedValue({ ownerId: "owner_1" } as never);
    vi.mocked(prisma.subscription.findFirst).mockResolvedValue(null as never);
    vi.mocked(prisma.communityVideoUsage.findUnique).mockResolvedValue({ id: "usage_1" } as never);
    vi.mocked(prisma.sessionUsageAccrual.create).mockResolvedValue({} as never);
    vi.mocked(prisma.communityVideoUsage.update).mockResolvedValue({ usedSeconds: 1356 } as never);

    await endSessionJob(SESSION_ID);

    expect(prisma.sessionUsageAccrual.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          sessionId: SESSION_ID,
          exactSeconds: 1351,
          approxSeconds: 1356,
          elapsedSeconds: 678,
        }),
      })
    );
    expect(info).toHaveBeenCalledWith(
      "[video-usage] accrued",
      expect.objectContaining({ sessionId: SESSION_ID, appliedSeconds: 1356 })
    );
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe("no handler parses a room name any more", () => {
  it("resolves rooms through the shared lookup", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const source = fs
      .readFileSync(path.resolve(__dirname, "../../lib/jobs/livekit-webhook.ts"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "");

    // The line that caused all of it.
    expect(source).not.toMatch(/replace\("session-", ""\)/);
    expect(source).toMatch(/async function resolveSessionByRoom/);
  });
});
