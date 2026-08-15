import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { ROOM_OPTIONS } from "@/lib/livekit/room-options";

/**
 * Both room components mounted `<LiveKitRoom>` with no `options` prop, so both
 * ran on livekit-client's `roomOptionDefaults`: `adaptiveStream: false` and
 * `dynacast: false`.
 *
 * That is the most expensive configuration the library will produce. With
 * adaptiveStream off, every subscriber pulls the publisher's top simulcast
 * layer (720p, ~1.7 Mbps) even for a thumbnail, and keeps pulling it while
 * scrolled out of view. With dynacast off, every publisher uploads all three
 * layers (~2.3 Mbps) for the whole session whether or not anyone consumes them.
 * Video is the product's largest variable cost, so this is a bill, not a
 * preference.
 *
 * These tests pin the options on, and — more importantly — fail if a third room
 * is ever added without them. A missing prop is invisible in review; it just
 * silently costs money.
 */

const REPO_ROOT = path.resolve(__dirname, "../..");

/** Every component that mounts a LiveKit room. */
const ROOM_COMPONENTS = [
  "components/sessions/VideoRoom.tsx",
  "components/video-call/EnhancedVideoCall.tsx",
];

function read(relativePath: string): string {
  return fs.readFileSync(path.join(REPO_ROOT, relativePath), "utf8");
}

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (![".next", "node_modules"].includes(entry.name)) walk(p, out);
    } else if (/\.tsx$/.test(entry.name)) out.push(p);
  }
  return out;
}

describe("the shared room options", () => {
  it("enables adaptiveStream", () => {
    // Subscribe at the size actually rendered instead of always pulling 720p.
    expect(ROOM_OPTIONS.adaptiveStream).toBe(true);
  });

  it("enables dynacast", () => {
    // Let the SFU stop layers nobody is consuming.
    expect(ROOM_OPTIONS.dynacast).toBe(true);
  });

  it("does not touch publish or capture defaults", () => {
    // The point of this change is bandwidth negotiation, not re-encoding.
    // `publishDefaults` is where the codec lives (VP8 by default), along with
    // simulcast and the encodings — all of which change what the publisher
    // sends, which is a product decision rather than a transport one.
    expect(ROOM_OPTIONS.publishDefaults).toBeUndefined();
    expect(ROOM_OPTIONS.videoCaptureDefaults).toBeUndefined();
  });

  it("changes only the two negotiation flags", () => {
    // Anything else appearing here should be a deliberate, argued addition.
    expect(Object.keys(ROOM_OPTIONS).sort()).toEqual(["adaptiveStream", "dynacast"]);
  });
});

describe("every room uses them", () => {
  it.each(ROOM_COMPONENTS)("%s passes options to LiveKitRoom", (file) => {
    const source = read(file);
    expect(source).toContain('from "@/lib/livekit/room-options"');
    expect(source).toContain("options={ROOM_OPTIONS}");
  });

  it.each(ROOM_COMPONENTS)("%s does not hand-roll its own options object", (file) => {
    // Two copies of the tuning is how one of them ends up stale.
    const source = read(file);
    expect(source).not.toMatch(/options=\{\{/);
    expect(source).not.toContain("adaptiveStream:");
    expect(source).not.toContain("dynacast:");
  });
});

/**
 * The guard that matters: a new room added without options costs money from the
 * day it ships and looks completely normal in a diff.
 */
describe("no LiveKitRoom may mount without options", () => {
  const componentsWithRoom = [
    ...walk(path.join(REPO_ROOT, "app")),
    ...walk(path.join(REPO_ROOT, "components")),
  ].filter((file) => /<LiveKitRoom[\s>]/.test(fs.readFileSync(file, "utf8")));

  it("finds the rooms it claims to check", () => {
    // Guards the assertion below against passing because the scan found none.
    expect(componentsWithRoom.length).toBe(ROOM_COMPONENTS.length);
  });

  it("knows about exactly the rooms this test enumerates", () => {
    // If a third room appears, this fails and forces it into ROOM_COMPONENTS
    // rather than letting it inherit the defaults unnoticed.
    const found = componentsWithRoom
      .map((f) => path.relative(REPO_ROOT, f).split(path.sep).join("/"))
      .sort();
    expect(found).toEqual([...ROOM_COMPONENTS].sort());
  });

  it("every mount carries an options prop", () => {
    const offenders: string[] = [];

    for (const file of componentsWithRoom) {
      const source = fs.readFileSync(file, "utf8");
      // Take each opening tag and check the props between `<LiveKitRoom` and
      // the closing `>` of that tag.
      for (const match of source.matchAll(/<LiveKitRoom\b([\s\S]*?)>/g)) {
        if (!/\boptions=/.test(match[1])) {
          offenders.push(path.relative(REPO_ROOT, file).split(path.sep).join("/"));
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});
