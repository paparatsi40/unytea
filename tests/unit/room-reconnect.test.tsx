// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import fs from "node:fs";
import path from "node:path";
import { render, act, cleanup, fireEvent, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";

/**
 * The live session room reconnected forever.
 *
 * The console cycled: `disconnected → connecting → connected`, `publishing
 * track`, `already connected to room session-…`, `disconnect from room`,
 * `unpublishing track` twice, `connected → disconnected`, and `track was
 * stopped during a restart, stopping restarted track` — then again, from the
 * top. On screen the video appeared for an instant and vanished.
 *
 * Two independent defects produced it, and these tests pin both.
 *
 * 1. `VideoRoom` fetched its token in an effect keyed on `[sessionId, t]`.
 *    `t` is next-intl's translator, memoised against the intl context value,
 *    which is rebuilt whenever the route's RSC payload is re-delivered with a
 *    freshly deserialised `messages` object. When `t` changed identity the
 *    effect re-ran, `setLoading(true)` replaced the tree with a spinner,
 *    `<LiveKitRoom>` unmounted, `@livekit/components-react` disconnected the
 *    room in its unmount cleanup, and a remount minted a new token and a new
 *    `Room`. The remount issues the same Server Action, so it sustains itself.
 *
 * 2. `VideoRoomUI` called `room.switchActiveDevice("videoinput", …)` on mount
 *    to guess a "preferred external camera", guarded by a ref that reset with
 *    every mount. So each reconnect restarted the published camera track, and a
 *    teardown landing mid-restart is exactly what livekit-client reports as
 *    `track was stopped during a restart`.
 *
 * Neither is a regression from the adaptiveStream/dynacast change: `ROOM_OPTIONS`
 * is a module constant, livekit-client shallow-copies it into the `Room`, and
 * `useLiveKitRoom` keys its `Room` construction on `JSON.stringify(options, …)`,
 * which never changes. The device code predates it by months.
 */

const REPO_ROOT = path.resolve(__dirname, "../..");
const MESSAGES = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, "locales/en.json"), "utf8"));

// ── instrumentation ────────────────────────────────────────────────────────
const joinSession = vi.fn();
const switchActiveDevice = vi.fn(async () => {});
const roomProps: Record<string, unknown>[] = [];
let roomMounts = 0;
let roomUnmounts = 0;

const CAMERAS = [
  { kind: "videoinput", deviceId: "cam-integrated", label: "Integrated Webcam", groupId: "g1" },
  { kind: "videoinput", deviceId: "cam-external", label: "Logitech BRIO", groupId: "g2" },
];

Object.defineProperty(globalThis.navigator, "mediaDevices", {
  configurable: true,
  value: {
    // The real API hands back a new array of new objects on every call.
    enumerateDevices: () => Promise.resolve(CAMERAS.map((c) => ({ ...c }) as MediaDeviceInfo)),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  },
});

const localParticipant = {
  identity: "u1",
  name: "Tester",
  setMicrophoneEnabled: vi.fn(async () => {}),
  setCameraEnabled: vi.fn(async () => {}),
  setScreenShareEnabled: vi.fn(async () => {}),
  publishData: vi.fn(async () => {}),
};

const room = { switchActiveDevice, localParticipant, on: vi.fn(), off: vi.fn() };

vi.mock("@/app/actions/livekit", () => ({ joinSession: (id: string) => joinSession(id) }));
vi.mock("@livekit/components-styles", () => ({}));

/**
 * Stands in for the real `<LiveKitRoom>`, recording the two things that decide
 * whether the room survives: whether it stayed mounted, and the identity of the
 * callbacks it was handed. `useLiveKitRoom` lists `onError` in the dependency
 * array of the effect that calls `room.connect()`, so an unstable one makes it
 * reconnect on every render.
 */
vi.mock("@livekit/components-react", () => ({
  LiveKitRoom: (props: { children: React.ReactNode }) => {
    roomProps.push(props);
    React.useEffect(() => {
      roomMounts++;
      return () => {
        roomUnmounts++;
      };
    }, []);
    return React.createElement("div", { "data-testid": "room" }, props.children);
  },
  RoomAudioRenderer: () => null,
  useParticipants: () => [],
  useRoomContext: () => room,
  useLocalParticipant: () => ({
    localParticipant,
    isCameraEnabled: true,
    isMicrophoneEnabled: true,
    isScreenShareEnabled: false,
  }),
}));

vi.mock("@/hooks/useSessionDataChannel", () => ({
  useSessionDataChannel: () => ({
    raisedHands: [],
    hasRaisedHand: false,
    toggleRaiseHand: vi.fn(),
    inviteSpeaker: vi.fn(),
    dismissHand: vi.fn(),
    activePolls: [],
    createPoll: vi.fn(),
    votePoll: vi.fn(),
    closePoll: vi.fn(),
    muteAll: vi.fn(),
    muteAllSignal: 0,
    invitedToSpeak: false,
    clearSpeakerInvite: vi.fn(),
  }),
}));

vi.mock("@/components/sessions/MainStage", () => ({ MainStage: () => null }));
vi.mock("@/components/sessions/SessionChat", () => ({ SessionChat: () => null }));
vi.mock("@/components/sessions/SessionNotesEditor", () => ({ SessionNotesEditor: () => null }));
vi.mock("@/components/sessions/ReactionsBar", () => ({ ReactionsBar: () => null }));
vi.mock("@/components/live-session/LivePoll", () => ({
  LivePoll: () => null,
  PollCreator: () => null,
}));

import { VideoRoom } from "@/components/sessions/VideoRoom";

// ── helpers ────────────────────────────────────────────────────────────────
function tree(messages: typeof MESSAGES) {
  return (
    <NextIntlClientProvider locale="en" messages={messages} timeZone="UTC">
      <VideoRoom sessionId="s1" sessionMode="video" />
    </NextIntlClientProvider>
  );
}

/** Let every queued microtask and effect settle. */
async function settle() {
  for (let i = 0; i < 10; i++) {
    await act(async () => {
      await Promise.resolve();
    });
  }
}

beforeEach(() => {
  joinSession.mockReset();
  joinSession.mockResolvedValue({
    success: true,
    access: { token: "tok", wsUrl: "wss://example.livekit.cloud" },
  });
  switchActiveDevice.mockClear();
  roomProps.length = 0;
  roomMounts = 0;
  roomUnmounts = 0;
});

afterEach(cleanup);

describe("the room survives an RSC payload refresh", () => {
  it("connects once and stays connected when `messages` is re-delivered", async () => {
    let view!: ReturnType<typeof render>;
    await act(async () => {
      view = render(tree(structuredClone(MESSAGES)));
    });
    await settle();

    expect(joinSession).toHaveBeenCalledTimes(1);
    expect(roomMounts).toBe(1);

    // Same content, new object identity — what a re-delivered RSC payload
    // looks like to the client. Before the fix this unmounted the room and
    // minted a second token, and the remount triggered the next refresh.
    await act(async () => {
      view.rerender(tree(structuredClone(MESSAGES)));
    });
    await settle();

    expect(roomUnmounts).toBe(0);
    expect(roomMounts).toBe(1);
    expect(joinSession).toHaveBeenCalledTimes(1);
  });

  it("keeps the token effect off the translator entirely", () => {
    // A translated string anywhere in that effect drags `t` back into the
    // dependency array and the loop returns. Errors are kept as discriminants
    // and translated at render time instead.
    const source = fs.readFileSync(
      path.join(REPO_ROOT, "components/sessions/VideoRoom.tsx"),
      "utf8"
    );
    expect(code(source)).toMatch(/}, \[sessionId\]\);/);
    expect(code(source)).not.toMatch(/}, \[sessionId, t\]\);/);
  });

  it("hands LiveKitRoom the same callbacks on every render", async () => {
    let view!: ReturnType<typeof render>;
    await act(async () => {
      view = render(tree(MESSAGES));
    });
    await settle();

    // Re-render the parent — the room must be handed the identical callbacks.
    await act(async () => {
      view.rerender(tree(MESSAGES));
    });
    await settle();

    const withRoom = roomProps.filter((p) => "onError" in p);
    expect(withRoom.length).toBeGreaterThan(1);

    for (const key of ["onError", "onDisconnected", "onMediaDeviceFailure", "options"]) {
      const identities = new Set(withRoom.map((p) => p[key]));
      expect({ key, distinct: identities.size }).toEqual({ key, distinct: 1 });
    }
  });
});

describe("camera switching is a user action", () => {
  it("does not switch device on mount", async () => {
    await act(async () => {
      render(tree(MESSAGES));
    });
    await settle();

    // The old "preferred external camera" guess ran here, restarting the
    // published track on every mount — including every reconnect.
    expect(switchActiveDevice).not.toHaveBeenCalled();
  });

  it("switches when the user picks a camera from the toolbar", async () => {
    await act(async () => {
      render(tree(MESSAGES));
    });
    await settle();

    const select = screen.getByTitle(MESSAGES.liveSession.room.controls.selectCamera);
    await act(async () => {
      fireEvent.change(select, { target: { value: "cam-external" } });
    });
    await settle();

    expect(switchActiveDevice).toHaveBeenCalledTimes(1);
    expect(switchActiveDevice).toHaveBeenCalledWith("videoinput", "cam-external");
  });
});

/** Strip comments — the explanations below legitimately quote the banned call. */
function code(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

describe("no other caller may restart the camera track", () => {
  it("switchActiveDevice is called from exactly one place", () => {
    const walk = (dir: string, out: string[] = []): string[] => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (![".next", "node_modules"].includes(entry.name)) walk(p, out);
        } else if (/\.tsx?$/.test(entry.name)) out.push(p);
      }
      return out;
    };

    const callers = [
      ...walk(path.join(REPO_ROOT, "app")),
      ...walk(path.join(REPO_ROOT, "components")),
      ...walk(path.join(REPO_ROOT, "hooks")),
    ]
      .map((file) => ({
        file: path.relative(REPO_ROOT, file).split(path.sep).join("/"),
        hits: (code(fs.readFileSync(file, "utf8")).match(/switchActiveDevice\(/g) ?? []).length,
      }))
      .filter((entry) => entry.hits > 0);

    // Only the toolbar's onChange handler. An automatic caller is how a
    // remount turns into a dead camera.
    expect(callers).toEqual([{ file: "components/sessions/VideoRoomUI.tsx", hits: 1 }]);
  });
});
