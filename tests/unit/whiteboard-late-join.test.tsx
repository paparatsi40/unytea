// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { render, act, cleanup } from "@testing-library/react";
import { RoomEvent } from "livekit-client";

/**
 * A guest walks into a room where the host has already drawn.
 *
 * Reported: the host adds images to the board **alone**, a guest joins, and the
 * board comes up blank — no pictures and no grey placeholders either, so it is
 * not the file transport. The elements themselves never arrive. Then the host
 * adds one more image and everything appears at once.
 *
 * These tests drive the real hook against a stand-in room, because the question
 * — what does the host actually put in the snapshot for a scene it drew with
 * nobody watching — is not answerable by reading the code. It was not:
 * `hostSceneRef` is written on every change and I could not talk myself into it
 * being empty. The harness answers it in one assertion.
 */

const REPO_ROOT = path.resolve(__dirname, "../..");

const holder = vi.hoisted(() => ({ room: null as unknown }));

vi.mock("@livekit/components-react", () => ({
  useRoomContext: () => holder.room,
}));

import { useWhiteboardChannel, type WhiteboardChannel } from "@/hooks/useWhiteboardChannel";
import type { WhiteboardElement } from "@/lib/whiteboard/protocol";

// ── the room stand-in ──────────────────────────────────────────────────────
function makeRoom(state = "connected") {
  const listeners = new Map<string, Set<(...args: unknown[]) => void>>();
  const textHandlers = new Map<string, (reader: unknown) => void>();

  return {
    state,
    localParticipant: {
      identity: "s1:host",
      permissions: { canPublish: true, canPublishData: true, canSubscribe: true },
      publishData: vi.fn(async (_data: Uint8Array, _options?: unknown) => {}),
      sendText: vi.fn(
        async (_text: string, _options?: { destinationIdentities?: string[] }) => ({})
      ),
      streamBytes: vi.fn(async () => ({
        write: vi.fn(async () => {}),
        close: vi.fn(async () => {}),
      })),
    },
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
    registerTextStreamHandler(topic: string, cb: (reader: unknown) => void) {
      textHandlers.set(topic, cb);
    },
    unregisterTextStreamHandler(topic: string) {
      textHandlers.delete(topic);
    },
    registerByteStreamHandler: vi.fn(),
    unregisterByteStreamHandler: vi.fn(),
    /** Deliver a data packet as if it came from somebody else. */
    deliver(message: unknown, from = { identity: "s1:guest" }) {
      this.emit(RoomEvent.DataReceived, new TextEncoder().encode(JSON.stringify(message)), from);
    },
    /** Hand a snapshot to whatever registered for that topic. */
    deliverText(topic: string, text: string) {
      textHandlers.get(topic)?.({ readAll: async () => text });
    },
    hasTextHandler(topic: string) {
      return textHandlers.has(topic);
    },
  };
}

type FakeRoom = ReturnType<typeof makeRoom>;

/** Mount the hook and expose its value to the test. */
function mountChannel(room: FakeRoom, isHost: boolean) {
  holder.room = room;
  const seen: { current: WhiteboardChannel | null } = { current: null };

  function Probe() {
    seen.current = useWhiteboardChannel(isHost);
    return null;
  }

  render(<Probe />);
  return seen;
}

function element(id: string, version = 1): WhiteboardElement {
  return { id, version, index: `a${id}`, type: "rectangle" };
}

/** Every data packet the local participant published, decoded. */
function published(room: FakeRoom): Record<string, unknown>[] {
  const decoder = new TextDecoder();
  return room.localParticipant.publishData.mock.calls.map(
    (call) => JSON.parse(decoder.decode(call[0] as Uint8Array)) as Record<string, unknown>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

// ───────────────────────────────────────────────────────────────────────────
describe("the host answers a late joiner with what is on the board", () => {
  it("puts the scene in the snapshot, even though it was drawn with nobody watching", async () => {
    // The reported repro, exactly: the host draws alone, then a guest asks.
    const room = makeRoom();
    const channel = mountChannel(room, true);

    await act(async () => {
      channel.current!.publishElements([element("a"), element("b")]);
    });

    await act(async () => {
      room.deliver({ kind: "whiteboard_request" });
    });

    expect(room.localParticipant.sendText).toHaveBeenCalledTimes(1);
    const [snapshot] = room.localParticipant.sendText.mock.calls[0];
    const parsed = JSON.parse(snapshot) as { elements: WhiteboardElement[] };
    expect(parsed.elements.map((e) => e.id)).toEqual(["a", "b"]);
  });

  it("addresses the snapshot to the one who asked", async () => {
    const room = makeRoom();
    const channel = mountChannel(room, true);
    await act(async () => channel.current!.publishElements([element("a")]));

    await act(async () => {
      room.deliver({ kind: "whiteboard_request" }, { identity: "s1:guest-b" });
    });

    const [, options] = room.localParticipant.sendText.mock.calls[0];
    expect(options?.destinationIdentities).toEqual(["s1:guest-b"]);
  });

  it("says nothing to a request when it is not the host", async () => {
    const room = makeRoom();
    mountChannel(room, false);

    await act(async () => {
      room.deliver({ kind: "whiteboard_request" });
    });

    expect(room.localParticipant.sendText).not.toHaveBeenCalled();
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe("the guest asks, and listens before it asks", () => {
  it("registers the snapshot handler before sending the request", async () => {
    // Ordering matters: the host answers immediately, so a request sent before
    // the handler exists is a snapshot delivered to nobody.
    const room = makeRoom();
    let handlerAtRequestTime = false;
    room.localParticipant.publishData.mockImplementation(async () => {
      handlerAtRequestTime = room.hasTextHandler("unytea.whiteboard.snapshot");
    });

    mountChannel(room, false);
    await act(async () => {});

    expect(published(room).some((m) => m.kind === "whiteboard_request")).toBe(true);
    expect(handlerAtRequestTime).toBe(true);
  });

  it("asks once the transport is ready rather than dropping the request", async () => {
    // The class of bug that has hit this file before: a silent return when the
    // engine is not up yet, and nothing to send it again.
    const room = makeRoom("connecting");
    mountChannel(room, false);
    await act(async () => {});

    expect(published(room).some((m) => m.kind === "whiteboard_request")).toBe(false);

    room.state = "connected";
    await act(async () => {
      room.emit(RoomEvent.ConnectionStateChanged, "connected");
    });

    expect(published(room).some((m) => m.kind === "whiteboard_request")).toBe(true);
  });

  it("applies a snapshot it receives", async () => {
    const room = makeRoom();
    const channel = mountChannel(room, false);
    await act(async () => {});

    await act(async () => {
      room.deliverText(
        "unytea.whiteboard.snapshot",
        JSON.stringify({ elements: [element("a"), element("b")] })
      );
    });

    expect(channel.current!.elements.map((e: WhiteboardElement) => e.id)).toEqual(["a", "b"]);
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe("from the hook's state onto the canvas", () => {
  /** Source with comments stripped — a comment must not satisfy an assertion. */
  function board(): string {
    return fs
      .readFileSync(path.join(REPO_ROOT, "components/sessions/SessionWhiteboard.tsx"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
      .replace(/^\s*\/\/.*$/gm, "");
  }

  it("gives a viewer's canvas the scene it already has, at mount", () => {
    // The bug. `updateScene` is right for a scene that changes while the board
    // is open, and it was the *only* way in — so a scene already in hand when
    // the canvas is constructed depended on a push landing after Excalidraw had
    // finished initialising itself with an empty one. For a late joiner that is
    // every scene: the host answers the request with the mode and the snapshot
    // together, so the elements arrive in the same breath that opens the board.
    expect(board()).toMatch(/initialData=\{isHost \? undefined : initialSceneRef\.current\}/);
  });

  it("seeds it from the elements and the files both", () => {
    const seed = board().slice(board().indexOf("const initialSceneRef"));
    expect(seed).toMatch(/elements: \(remoteElements \? \[\.\.\.remoteElements\] : \[\]\)/);
    expect(seed).toMatch(/remoteFiles \?\? \[\]/);
  });

  it("does not seed the host, who owns the scene", () => {
    // The host's canvas is the source of truth; handing it a copy of what it
    // just sent would be a way to lose a stroke drawn in between.
    expect(board()).toMatch(/initialData=\{isHost \? undefined :/);
  });

  it("keeps pushing later changes, which is what updateScene is for", async () => {
    // The remaining suspect. The snapshot lands before `SessionWhiteboard` has
    // mounted — the board only opens because the same answer carried
    // `whiteboard_mode` — and Excalidraw is a dynamic import whose API arrives
    // some ticks after that. If the scene is only pushed on a *change*, the one
    // push that mattered happened while the API was null.
    const board = fs
      .readFileSync(path.join(REPO_ROOT, "components/sessions/SessionWhiteboard.tsx"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "");

    const effect = board.slice(board.indexOf("excalidrawAPI.updateScene"));
    expect(effect).toMatch(/\[isHost, excalidrawAPI, remoteElements, remoteRevision\]/);
  });
});
