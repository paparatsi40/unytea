// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { ConnectionState, RoomEvent, type Room } from "livekit-client";

import { canPublishTracks, AUDIENCE_PUBLISHES_DATA } from "@/lib/livekit/permissions";
import { isDataTransportReady, whenConnected } from "@/lib/livekit/data-transport";

/**
 * Two people, one live session, three errors in the member's console.
 *
 *   insufficient permissions to publish (PublishTrackError)      ×2
 *   [whiteboard] publish failed: UnexpectedConnectionState:
 *     PC manager is closed
 *
 * They read as one problem — "the member has no permissions" — and they are
 * three, with three different causes and only one of them about permissions at
 * all.
 *
 *   1. The room was mounted `<LiveKitRoom video audio>` for everybody. That is
 *      not a preference; `useLiveKitRoom` turns it into a camera and a
 *      microphone publish the instant the connection lands. The audience's
 *      token says `canPublish: false`, so the SFU refused both — before the
 *      member had touched anything, and with the camera light on for the
 *      trouble.
 *
 *   2. The control bar rendered a microphone, a camera and a screen-share
 *      button for the audience too, so pressing one produced the same refusal
 *      on demand. The host's "invite to speak" made this worse rather than
 *      better: it published a data-channel event and changed no permission
 *      anywhere, so the microphone it offered could never be turned on.
 *
 *   3. The whiteboard's late-join request is a data publish, and the member's
 *      token has always granted `canPublishData` — every member does, because
 *      chat, hands, poll votes and reactions all ride that channel. It failed
 *      because it fired from a mount effect, and `<LiveKitRoom>` renders its
 *      children before it finishes connecting. `publishData` rejects rather
 *      than queues into an engine with no peer connection, and that rejection
 *      is spelled `PC manager is closed`.
 *
 * So: the audience keeps publishing data and stops publishing tracks, the
 * whiteboard waits for the transport instead of racing it, and an invitation
 * to speak is a grant rather than a banner.
 */

const REPO_ROOT = path.resolve(__dirname, "../..");

/**
 * Source with comments removed. A comment naming the bug reads exactly like the
 * bug to a regex, and this file asserts on shapes that a comment could easily
 * quote.
 */
function code(relativePath: string): string {
  return fs
    .readFileSync(path.join(REPO_ROOT, relativePath), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

// ───────────────────────────────────────────────────────────────────────────
describe("who may publish what", () => {
  it("lets the host and an invited speaker put a track on the wire", () => {
    expect(canPublishTracks("host")).toBe(true);
    expect(canPublishTracks("speaker")).toBe(true);
  });

  it("does not let a listener publish a track", () => {
    expect(canPublishTracks("listener")).toBe(false);
  });

  it("lets everyone publish data, audience included", () => {
    // Not a loosening: it is what the token has always granted, and what chat,
    // hand raise, poll votes and reactions have always needed.
    expect(AUDIENCE_PUBLISHES_DATA).toBe(true);
  });

  it("issues the token from that one rule rather than restating it", () => {
    const source = code("app/actions/livekit.ts");
    expect(source).toMatch(/const canPublish = canPublishTracks\(role\)/);
    expect(source).toMatch(/canPublishData: AUDIENCE_PUBLISHES_DATA/);
    // The inline copy is what let the browser and the token disagree.
    expect(source).not.toMatch(/role === ParticipationRole\.host \|\|/);
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe("the audience never asks to publish a track", () => {
  it("connects without a camera or a microphone unless the grant allows one", () => {
    const source = code("components/sessions/VideoRoom.tsx");
    expect(source).toMatch(/canPublishTracks\(role\)/);
    expect(source).toMatch(/video=\{mayPublishTracks && sessionMode === "video"\}/);
    expect(source).toMatch(/audio=\{mayPublishTracks\}/);
    // The literals that opened a capture device for every listener.
    expect(source).not.toMatch(/audio=\{true\}/);
  });

  it("decides that from the minted role, not from the isHost prop", () => {
    // A listener the host promoted to speaker joins with publish rights, and
    // `isHost` is false for them in every one of those cases.
    const source = code("components/sessions/VideoRoom.tsx");
    expect(source).toMatch(/setRole\(result\.access\.role\)/);
    expect(source).not.toMatch(/video=\{isHost/);
  });

  it("renders the capture controls only for someone who may use them", () => {
    const source = code("components/sessions/VideoRoomUI.tsx");
    expect(source).toMatch(
      /const canPublishMedia = localParticipant\.permissions\?\.canPublish \?\? false/
    );

    const gate = source.indexOf("{canPublishMedia && (");
    expect(gate).toBeGreaterThan(-1);

    // The three controls that publish a track live inside that gate, and the
    // whiteboard button — which publishes only data — lives outside it.
    const guarded = source.slice(gate, source.indexOf("{isHost && (", gate));
    expect(guarded).toMatch(/onClick=\{toggleMicrophone\}/);
    expect(guarded).toMatch(/onClick=\{toggleCamera\}/);
    expect(guarded).toMatch(/onClick=\{toggleScreenShare\}/);
  });

  it("reads the permission live rather than freezing it at join", () => {
    // `useLocalParticipant` observes ParticipantPermissionsChanged, so a member
    // given the floor gets the controls without reconnecting.
    const source = code("components/sessions/VideoRoomUI.tsx");
    expect(source).toMatch(/localParticipant\.permissions\?\.canPublish/);
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe("an invitation to speak is a grant", () => {
  const room = code("components/sessions/VideoRoomUI.tsx");
  const actions = code("app/actions/livekit.ts");

  it("grants first and announces second", () => {
    const handler = room.slice(room.indexOf("const handleInviteToSpeak"));
    const grant = handler.indexOf("await inviteToSpeak(sessionId, identity)");
    const announce = handler.indexOf("inviteSpeaker(identity)");
    expect(grant).toBeGreaterThan(-1);
    expect(announce).toBeGreaterThan(grant);
  });

  it("announces nothing when the grant fails", () => {
    const handler = room.slice(room.indexOf("const handleInviteToSpeak"));
    expect(handler).toMatch(/if \(!result\.success\) \{[\s\S]*?return;/);
  });

  it("is host-only on the server", () => {
    const action = actions.slice(actions.indexOf("export const inviteToSpeak"));
    expect(action).toMatch(/assertSessionHost\(ctx, sessionId\)/);
  });

  it("finds the participant by the identity column instead of parsing it", () => {
    // The identity is `${sessionId}:${userId}` and deliberately opaque. Code
    // that split it on "-" is what kept the usage webhook from ever recording
    // a second.
    const action = actions.slice(actions.indexOf("export const inviteToSpeak"));
    expect(action).toMatch(/livekitIdentity: identity/);
    expect(action).not.toMatch(/identity\.split\(/);
  });

  it("pushes the new grant to the connection that is already open", () => {
    // Without this the promotion is a database row: the browser keeps the
    // token it joined with, and the microphone stays refused.
    expect(actions).toMatch(/updateParticipant\(roomName, identity, \{/);
    expect(actions).toMatch(/canPublish: canPublishTracks\(role\)/);
    // Permissions replace rather than merge on LiveKit's side; omitting this
    // would mute a promoted member's chat, hand and votes.
    const sync = actions.slice(actions.indexOf("async function syncRoomPermissions"));
    expect(sync).toMatch(/canPublishData: AUDIENCE_PUBLISHES_DATA/);
  });

  it("demoting syncs the same way promoting does", () => {
    const action = actions.slice(actions.indexOf("export const updateParticipantRole"));
    expect(action).toMatch(
      /pushRoleToLiveRoom\(sessionId, participation\.livekitIdentity, newRole\)/
    );
  });

  it("does not offer the microphone before the grant has landed", () => {
    const banner = room.slice(room.indexOf("{invitedToSpeak && ("));
    expect(banner).toMatch(/disabled=\{!canPublishMedia\}/);
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe("the data transport gate", () => {
  function fakeRoom(state: ConnectionState, canPublishData: boolean | undefined = true) {
    const listeners = new Map<string, Set<(...args: unknown[]) => void>>();
    return {
      state,
      localParticipant: {
        permissions: canPublishData === undefined ? undefined : { canPublishData },
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
      listenerCount(event: string) {
        return listeners.get(event)?.size ?? 0;
      },
    };
  }

  it("refuses a publish while the room is still connecting", () => {
    // This is the whole of `PC manager is closed`: the engine has no peer
    // connection yet, and publishData rejects rather than queuing.
    const room = fakeRoom(ConnectionState.Connecting);
    expect(isDataTransportReady(room as unknown as Room)).toBe(false);
  });

  it("refuses a publish once the room has gone", () => {
    const room = fakeRoom(ConnectionState.Disconnected);
    expect(isDataTransportReady(room as unknown as Room)).toBe(false);
  });

  it("allows one when connected", () => {
    const room = fakeRoom(ConnectionState.Connected);
    expect(isDataTransportReady(room as unknown as Room)).toBe(true);
  });

  it("refuses one from a participant the server has denied data", () => {
    const room = fakeRoom(ConnectionState.Connected, false);
    expect(isDataTransportReady(room as unknown as Room)).toBe(false);
  });

  it("assumes permission while the participant info is still in flight", () => {
    // Treating the unknown as a denial would drop the first packet of every
    // session, which is exactly the one the late joiner needs.
    const room = fakeRoom(ConnectionState.Connected, undefined);
    expect(isDataTransportReady(room as unknown as Room)).toBe(true);
  });

  it("runs the waiting work immediately if the room is already connected", () => {
    const room = fakeRoom(ConnectionState.Connected);
    const fn = vi.fn();
    whenConnected(room as unknown as Room, fn);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("holds the work until the connection lands, then runs it once", () => {
    const room = fakeRoom(ConnectionState.Connecting);
    const fn = vi.fn();
    whenConnected(room as unknown as Room, fn);
    expect(fn).not.toHaveBeenCalled();

    room.emit(RoomEvent.ConnectionStateChanged, ConnectionState.Reconnecting);
    expect(fn).not.toHaveBeenCalled();

    room.emit(RoomEvent.ConnectionStateChanged, ConnectionState.Connected);
    expect(fn).toHaveBeenCalledTimes(1);

    // Unsubscribed on the way out, so a later transition is not a second run.
    room.emit(RoomEvent.ConnectionStateChanged, ConnectionState.Connected);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("drops the waiting work when the caller unsubscribes", () => {
    // A member who leaves during the handshake must not fire into a room on
    // its way out.
    const room = fakeRoom(ConnectionState.Connecting);
    const fn = vi.fn();
    const cancel = whenConnected(room as unknown as Room, fn);

    cancel();
    expect(room.listenerCount(RoomEvent.ConnectionStateChanged)).toBe(0);

    room.emit(RoomEvent.ConnectionStateChanged, ConnectionState.Connected);
    expect(fn).not.toHaveBeenCalled();
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe("the whiteboard asks when it can be heard", () => {
  const channel = code("hooks/useWhiteboardChannel.ts");

  it("waits for the connection instead of publishing from a mount effect", () => {
    const ask = channel.slice(channel.indexOf("const ask = () =>"));
    expect(ask).toMatch(/publish\(\{ kind: "whiteboard_request" \}\)/);
    expect(channel).toMatch(/whenConnected\(room, ask\)/);
  });

  it("asks again after a reconnect", () => {
    // A blip can span strokes this client never saw, and the accumulated scene
    // has no way to know it is stale.
    expect(channel).toMatch(/room\.on\(RoomEvent\.Reconnected, ask\)/);
    expect(channel).toMatch(/room\.off\(RoomEvent\.Reconnected, ask\)/);
  });

  it("stops before handing anything to a transport that is not ready", () => {
    expect(channel).toMatch(/if \(!isDataTransportReady\(room\)\) return false;/);
  });

  it("does not mark a refused delta as sent", () => {
    // Recording the version of a chunk that never left would make the element
    // look already-sent forever, and the stroke would be lost for the room.
    expect(channel).toMatch(/if \(allSent\) sentVersionsRef\.current = versions;/);
  });
});

describe("every data publish goes through the same gate", () => {
  it.each([
    ["hooks/useWhiteboardChannel.ts"],
    ["hooks/useSessionDataChannel.ts"],
    ["components/sessions/ReactionsBar.tsx"],
  ])("%s checks the transport before publishing", (file) => {
    const source = code(file);
    const gate = source.indexOf("isDataTransportReady(room)");
    const publish = source.indexOf("publishData(");
    expect(gate).toBeGreaterThan(-1);
    expect(publish).toBeGreaterThan(gate);
  });
});
