// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { render, act, cleanup, fireEvent, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { RoomEvent } from "livekit-client";

/**
 * What the audience may do, told apart by which permission it needs.
 *
 * `fix/room-member-data` hid the microphone, the camera and the screen share
 * from the audience, because those publish a **track** and a member's token
 * says `canPublish: false`. That part is right and stays.
 *
 * The room's other controls are not tracks. A reaction, a raised hand, a chat
 * line and a poll vote are **data**, and every member's token has always
 * granted `canPublishData` — an audience that cannot publish data is an
 * audience that cannot speak at all. Nothing may put those behind
 * `canPublish`. The two names differ by four characters and gate opposite
 * halves of the product, which is the confusion this file exists to make
 * impossible to reintroduce quietly.
 *
 * What actually went wrong is one step further in. The same change replaced a
 * throwing publish with a silent one:
 *
 *     if (!isDataTransportReady(room)) return;
 *
 * Correct for the whiteboard's delta stream, which re-sends on the next tick.
 * Wrong for a button, which has no next tick — there is a person who pressed
 * it. And it is a member who lands on it: a host has been connected for
 * minutes before anyone arrives, while a member presses something seconds
 * after joining, in the window where the engine has no peer connection yet.
 * The reaction did nothing; the hand flipped to "Hand Raised" and reached
 * nobody. So the room now waits for the transport instead of dropping, and an
 * optimistic label is put back if the packet never left.
 *
 * The reactions had a second, older problem, in the other direction: nothing
 * had ever rendered one. The handler answered `case "reaction": break;` under
 * a comment claiming `ReactionsBar` dealt with it, and `ReactionsBar` only
 * sent. Every reaction ever pressed, by anyone, went onto the wire and was
 * displayed by nobody.
 */

const REPO_ROOT = path.resolve(__dirname, "../..");
const MESSAGES = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, "locales/en.json"), "utf8"));
const ROOM = MESSAGES.liveSession.room;
const REACTIONS = MESSAGES.liveSession.reactionsBar;

// ── the room stand-in ──────────────────────────────────────────────────────
/**
 * One fake `Room` per rendered tree. `useRoomContext` reads whichever is
 * current, so a test renders one tree at a time and carries a payload across by
 * hand — which is also the honest model of the wire: LiveKit does not echo a
 * packet back to its own publisher.
 */
function makeRoom(options: {
  identity: string;
  name: string;
  canPublish: boolean;
  canPublishData?: boolean;
  state?: string;
}) {
  const listeners = new Map<string, Set<(...args: unknown[]) => void>>();
  const publishData = vi.fn(async (_payload: Uint8Array, _options?: unknown) => {});

  return {
    state: options.state ?? "connected",
    localParticipant: {
      identity: options.identity,
      name: options.name,
      permissions: {
        canPublish: options.canPublish,
        canPublishData: options.canPublishData ?? true,
        canSubscribe: true,
      },
      publishData,
      setMicrophoneEnabled: vi.fn(async () => {}),
      setCameraEnabled: vi.fn(async () => {}),
      setScreenShareEnabled: vi.fn(async () => {}),
      sendText: vi.fn(async () => {}),
    },
    switchActiveDevice: vi.fn(async () => {}),
    registerTextStreamHandler: vi.fn(),
    unregisterTextStreamHandler: vi.fn(),
    on(event: string, fn: (...args: unknown[]) => void) {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event)!.add(fn);
      return this;
    },
    off(event: string, fn: (...args: unknown[]) => void) {
      listeners.get(event)?.delete(fn);
      return this;
    },
    emit(event: string, ...args: unknown[]) {
      for (const fn of [...(listeners.get(event) ?? [])]) fn(...args);
    },
    /** Deliver a packet as if it had arrived from someone else. */
    deliver(payload: Uint8Array, from: { identity: string; name: string }) {
      for (const fn of [...(listeners.get(RoomEvent.DataReceived) ?? [])]) fn(payload, from);
    },
  };
}

type FakeRoom = ReturnType<typeof makeRoom>;

const holder = vi.hoisted(() => ({ room: null as unknown }));

vi.mock("@livekit/components-react", () => ({
  useRoomContext: () => holder.room,
  useParticipants: () => [],
  useLocalParticipant: () => ({
    localParticipant: (holder.room as FakeRoom).localParticipant,
    isCameraEnabled: false,
    isMicrophoneEnabled: false,
    isScreenShareEnabled: false,
  }),
}));

// Mocked below: surfaces with their own tests, and nothing to do with which
// control the audience is offered. `ReactionsBar`, `ReactionOverlay` and
// `useSessionDataChannel` are deliberately real — they are the subject.
vi.mock("@/components/sessions/MainStage", () => ({ MainStage: () => null }));
vi.mock("@/components/sessions/SessionChat", () => ({ SessionChat: () => null }));
vi.mock("@/components/sessions/SessionNotesEditor", () => ({ SessionNotesEditor: () => null }));
vi.mock("@/components/live-session/LivePoll", () => ({
  LivePoll: () => null,
  PollCreator: () => null,
}));
vi.mock("@/hooks/useWhiteboardChannel", () => ({
  useWhiteboardChannel: () => ({
    isOpen: false,
    elements: [],
    revision: 0,
    publishMode: vi.fn(),
    publishElements: vi.fn(),
    resetSentVersions: vi.fn(),
  }),
}));
vi.mock("@/app/actions/livekit", () => ({
  inviteToSpeak: vi.fn(async () => ({ success: true })),
}));

import { VideoRoomUI } from "@/components/sessions/VideoRoomUI";

// ── helpers ────────────────────────────────────────────────────────────────
function renderRoom(room: FakeRoom, props: { isHost?: boolean } = {}) {
  holder.room = room;
  return render(
    <NextIntlClientProvider locale="en" messages={MESSAGES} timeZone="UTC">
      <VideoRoomUI sessionId="s1" sessionMode="video" isHost={props.isHost ?? false} />
    </NextIntlClientProvider>
  );
}

function listener(overrides: Partial<Parameters<typeof makeRoom>[0]> = {}) {
  return makeRoom({ identity: "s1:member", name: "Member", canPublish: false, ...overrides });
}

/** Click, then let the publish promise and its state updates settle. */
async function click(element: Element) {
  await act(async () => {
    fireEvent.click(element);
  });
  await act(async () => {
    await Promise.resolve();
  });
}

/** Every payload handed to the data channel, decoded. */
function published(room: FakeRoom): Record<string, unknown>[] {
  const decoder = new TextDecoder();
  return room.localParticipant.publishData.mock.calls.map(
    (call) => JSON.parse(decoder.decode(call[0])) as Record<string, unknown>
  );
}

function firstPacket(room: FakeRoom): Uint8Array {
  const call = room.localParticipant.publishData.mock.calls[0];
  if (!call) throw new Error("nothing was published");
  return call[0];
}

async function react(room: FakeRoom, label: string) {
  await click(screen.getByTitle(ROOM.controls.reactions));
  await click(screen.getByTitle(REACTIONS[label]));
  return room;
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// ───────────────────────────────────────────────────────────────────────────
describe("what a listener is offered", () => {
  beforeEach(() => {
    renderRoom(listener());
  });

  it("keeps the raised hand", () => {
    // Asking for the floor is the audience's only way into the conversation.
    expect(screen.getByText(ROOM.raiseHand.raise)).toBeTruthy();
  });

  it("keeps the reactions", () => {
    expect(screen.getByTitle(ROOM.controls.reactions)).toBeTruthy();
  });

  it("is not offered a microphone", () => {
    expect(screen.queryByTitle(ROOM.controls.unmuteMic)).toBeNull();
    expect(screen.queryByTitle(ROOM.controls.muteMic)).toBeNull();
  });

  it("is not offered a camera", () => {
    expect(screen.queryByTitle(ROOM.controls.turnOnCamera)).toBeNull();
    expect(screen.queryByTitle(ROOM.controls.turnOffCamera)).toBeNull();
  });

  it("is not offered a screen share", () => {
    expect(screen.queryByTitle(ROOM.controls.shareScreen)).toBeNull();
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe("what a listener can actually send", () => {
  it("puts a raised hand on the data channel", async () => {
    const room = listener();
    renderRoom(room);

    await click(screen.getByText(ROOM.raiseHand.raise));

    expect(published(room)[0]).toMatchObject({
      type: "hand_raise",
      identity: "s1:member",
      raised: true,
    });
  });

  it("puts a reaction on the data channel", async () => {
    const room = listener();
    renderRoom(room);

    await react(room, "heart");

    expect(published(room)).toContainEqual(
      expect.objectContaining({ type: "reaction", emoji: "❤️", label: "heart" })
    );
  });

  it("sends both even though it may not publish a track", async () => {
    // The regression this file guards: gating data on `canPublish` silences an
    // audience the token deliberately let speak.
    const room = listener({ canPublish: false, canPublishData: true });
    renderRoom(room);

    await click(screen.getByText(ROOM.raiseHand.raise));
    await react(room, "fire");

    expect(published(room).map((p) => p.type)).toEqual(["hand_raise", "reaction"]);
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe("a click waits for the transport instead of being dropped", () => {
  it("holds a raised hand until the room finishes connecting, then sends it", async () => {
    // The member's first seconds. Dropping here is what made the hand do
    // nothing at all, silently.
    const room = listener({ state: "connecting" });
    renderRoom(room);

    await click(screen.getByText(ROOM.raiseHand.raise));
    expect(room.localParticipant.publishData).not.toHaveBeenCalled();

    room.state = "connected";
    await act(async () => {
      room.emit(RoomEvent.ConnectionStateChanged, "connected");
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(published(room)[0]).toMatchObject({ type: "hand_raise", raised: true });
  });

  it("holds a reaction the same way", async () => {
    const room = listener({ state: "connecting" });
    renderRoom(room);

    await react(room, "clap");
    expect(room.localParticipant.publishData).not.toHaveBeenCalled();

    room.state = "connected";
    await act(async () => {
      room.emit(RoomEvent.ConnectionStateChanged, "connected");
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(published(room)[0]).toMatchObject({ type: "reaction", label: "clap" });
  });

  it("gives up rather than waiting on a room that is gone", async () => {
    const room = listener({ state: "disconnected" });
    renderRoom(room);

    await click(screen.getByText(ROOM.raiseHand.raise));

    expect(room.localParticipant.publishData).not.toHaveBeenCalled();
  });

  it("gives up when the server has genuinely denied data", async () => {
    const room = listener({ canPublishData: false });
    renderRoom(room);

    await click(screen.getByText(ROOM.raiseHand.raise));

    expect(room.localParticipant.publishData).not.toHaveBeenCalled();
  });

  it("puts the hand back when the packet never left", async () => {
    // Showing "Hand Raised" over a queue the host never received is the worst
    // of both: the member waits and nobody is coming.
    const room = listener({ state: "disconnected" });
    renderRoom(room);

    await click(screen.getByText(ROOM.raiseHand.raise));

    expect(screen.getByText(ROOM.raiseHand.raise)).toBeTruthy();
    expect(screen.queryByText(ROOM.raiseHand.raised)).toBeNull();
  });

  it("leaves the hand raised when it did leave", async () => {
    const room = listener();
    renderRoom(room);

    await click(screen.getByText(ROOM.raiseHand.raise));

    expect(screen.getByText(ROOM.raiseHand.raised)).toBeTruthy();
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe("a reaction is something you can see", () => {
  it("shows the sender their own, which the wire will not echo back", async () => {
    const room = listener();
    renderRoom(room);

    expect(screen.queryByTestId("reaction-overlay")).toBeNull();
    await react(room, "heart");

    expect(screen.getByTestId("reaction-overlay").textContent).toContain("❤️");
  });

  it("shows nothing when the reaction never left", async () => {
    const room = listener({ state: "disconnected" });
    renderRoom(room);

    await react(room, "heart");

    expect(screen.queryByTestId("reaction-overlay")).toBeNull();
  });

  it("shows everyone else's", async () => {
    const member = listener();
    renderRoom(member);
    await react(member, "party");
    const packet = firstPacket(member);
    cleanup();

    const host = makeRoom({ identity: "s1:host", name: "Host", canPublish: true });
    renderRoom(host, { isHost: true });
    expect(screen.queryByTestId("reaction-overlay")).toBeNull();

    await act(async () => {
      host.deliver(packet, { identity: "s1:member", name: "Member" });
    });

    expect(screen.getByTestId("reaction-overlay").textContent).toContain("🎉");
  });

  it("names it for a screen reader", async () => {
    const room = listener();
    renderRoom(room);

    await react(room, "fire");

    expect(screen.getByTestId("reaction-overlay").textContent).toContain(REACTIONS.fire);
  });

  it("survives a label it does not know", async () => {
    // `label` comes from another participant, and `t()` on an unknown key is an
    // error rather than a blank.
    const host = makeRoom({ identity: "s1:host", name: "Host", canPublish: true });
    renderRoom(host, { isHost: true });

    const packet = new TextEncoder().encode(
      JSON.stringify({
        type: "reaction",
        emoji: "🦄",
        label: "not-a-known-label",
        from: "s1:member",
        timestamp: 1,
      })
    );

    await act(async () => {
      host.deliver(packet, { identity: "s1:member", name: "Member" });
    });

    expect(screen.getByTestId("reaction-overlay").textContent).toContain("🦄");
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe("the other end of the wire", () => {
  it("shows the member's hand in the host's queue", async () => {
    const member = listener();
    renderRoom(member);
    await click(screen.getByText(ROOM.raiseHand.raise));
    const packet = firstPacket(member);
    cleanup();

    const host = makeRoom({ identity: "s1:host", name: "Host", canPublish: true });
    renderRoom(host, { isHost: true });

    await act(async () => {
      host.deliver(packet, { identity: "s1:member", name: "Member" });
    });

    // The queue header counts what arrived, which is the only proof the packet
    // was understood rather than merely received.
    expect(screen.getByText(ROOM.participants.raisedHands.replace("{count}", "1"))).toBeTruthy();
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe("promotion still works", () => {
  it("gives a speaker the capture controls the listener did not have", () => {
    // The other half of `fix/room-member-data`: the grant moves live and the
    // controls follow it without a reconnect.
    const speaker = makeRoom({ identity: "s1:member", name: "Member", canPublish: true });
    renderRoom(speaker);

    expect(screen.getByTitle(ROOM.controls.unmuteMic)).toBeTruthy();
    expect(screen.getByTitle(ROOM.controls.turnOnCamera)).toBeTruthy();
    expect(screen.getByTitle(ROOM.controls.shareScreen)).toBeTruthy();
    // And keeps everything the audience had.
    expect(screen.getByText(ROOM.raiseHand.raise)).toBeTruthy();
    expect(screen.getByTitle(ROOM.controls.reactions)).toBeTruthy();
  });
});
