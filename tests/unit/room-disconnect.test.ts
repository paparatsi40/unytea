import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { DisconnectReason } from "livekit-client";

import { disconnectReasonName, isTerminalDisconnect } from "@/lib/livekit/disconnect";

/**
 * A room that drops for two seconds is not a room that has ended.
 *
 * `onDisconnected` fires for both, and this room treated them the same: the
 * handler called `onLeave()`, which navigates to the session list. So a signal
 * socket closing briefly — something livekit-client recovers from on its own,
 * usually without the participant noticing — threw the user out of a live
 * workshop and left them looking at a list of sessions.
 *
 * The second half of this is the reason itself. `onDisconnected` receives a
 * `DisconnectReason` and the handler discarded it, which is why "why did the
 * room drop?" has not been answerable from production logs. It matters more
 * than most log lines: DUPLICATE_IDENTITY and a bad network produce the same
 * visible symptom — a reconnect cycle — and have opposite fixes.
 */

const REPO_ROOT = path.resolve(__dirname, "../..");

function code(relativePath: string): string {
  return fs
    .readFileSync(path.join(REPO_ROOT, relativePath), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

// ───────────────────────────────────────────────────────────────────────────
describe("which disconnects end the visit", () => {
  it("ends it when somebody else took this identity", () => {
    // Two tabs on the same session mint the same `${sessionId}:${userId}` and
    // evict each other. Staying would be a fight nobody wins.
    expect(isTerminalDisconnect(DisconnectReason.DUPLICATE_IDENTITY)).toBe(true);
  });

  it("ends it when the room or the participant is gone", () => {
    expect(isTerminalDisconnect(DisconnectReason.PARTICIPANT_REMOVED)).toBe(true);
    expect(isTerminalDisconnect(DisconnectReason.ROOM_DELETED)).toBe(true);
    expect(isTerminalDisconnect(DisconnectReason.ROOM_CLOSED)).toBe(true);
    expect(isTerminalDisconnect(DisconnectReason.SERVER_SHUTDOWN)).toBe(true);
  });

  it("stays put for a transport that dropped", () => {
    // The client is already reconnecting. The worst case of staying is a frozen
    // tile; the worst case of leaving is losing the session.
    expect(isTerminalDisconnect(DisconnectReason.SIGNAL_CLOSE)).toBe(false);
    expect(isTerminalDisconnect(DisconnectReason.CONNECTION_TIMEOUT)).toBe(false);
    expect(isTerminalDisconnect(DisconnectReason.MEDIA_FAILURE)).toBe(false);
    expect(isTerminalDisconnect(DisconnectReason.STATE_MISMATCH)).toBe(false);
  });

  it("stays put when no reason is given at all", () => {
    // The ordinary shape of a bad network: the transport goes without a
    // protocol-level explanation. Treating silence as terminal would make every
    // flaky connection an eviction.
    expect(isTerminalDisconnect(undefined)).toBe(false);
    expect(isTerminalDisconnect(DisconnectReason.UNKNOWN_REASON)).toBe(false);
  });

  it("stays put for a migration, which is the server being helpful", () => {
    expect(isTerminalDisconnect(DisconnectReason.MIGRATION)).toBe(false);
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe("naming the reason", () => {
  it("prints the name, not the integer", () => {
    // A production log that says `2` is a log nobody can act on.
    expect(disconnectReasonName(DisconnectReason.DUPLICATE_IDENTITY)).toBe("DUPLICATE_IDENTITY");
    expect(disconnectReasonName(DisconnectReason.SIGNAL_CLOSE)).toBe("SIGNAL_CLOSE");
  });

  it("says so when there was no reason", () => {
    expect(disconnectReasonName(undefined)).toBe("NONE");
  });

  it("does not throw on a value it has never seen", () => {
    // The enum is the server's, and it grows.
    expect(disconnectReasonName(999 as DisconnectReason)).toBe("UNKNOWN(999)");
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe("what the room does with it", () => {
  const room = code("components/sessions/VideoRoom.tsx");

  it("leaves only on a terminal disconnect", () => {
    const handler = room.slice(room.indexOf("const handleDisconnected"));
    expect(handler).toMatch(/const terminal = isTerminalDisconnect\(reason\)/);
    expect(handler).toMatch(/if \(terminal\) onLeave\?\.\(\)/);
  });

  it("logs the reason either way", () => {
    // The datum that has been missing. Without it, DUPLICATE_IDENTITY and a bad
    // network are the same line in the console.
    const handler = room.slice(room.indexOf("const handleDisconnected"));
    const log = handler.indexOf('console.warn("[LiveKit] disconnected"');
    const leave = handler.indexOf("if (terminal) onLeave");
    expect(log).toBeGreaterThan(-1);
    expect(leave).toBeGreaterThan(log);
  });

  it("logs every token it mints, so a remount is visible", () => {
    // A room that reconnects on its own reuses its token. A *new* token means
    // the component mounted again — a different fault with a different fix, and
    // the two are indistinguishable without this line.
    expect(room).toMatch(/console\.info\("\[LiveKit\] session token minted"/);
  });
});
