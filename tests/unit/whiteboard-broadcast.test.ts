import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  applyDelta,
  chunkElements,
  diffElements,
  orderedElements,
  BROADCAST_INTERVAL_MS,
  DELTA_BUDGET_BYTES,
  type WhiteboardElement,
} from "@/lib/whiteboard/protocol";

/**
 * The whiteboard never left the host's browser.
 *
 * Unlike the screen share — a LiveKit track that was already arriving and was
 * simply not rendered — there was nothing on the wire at all: `SessionWhiteboard`
 * was a bare `<Excalidraw>` with component state, and `stageMode` was a
 * `useState` in the room that no one else could see. So both halves had to be
 * built: a way to move the scene, and a way to tell everyone the board is open.
 *
 * It is a broadcast, not a collaboration. One writer means no merge and no
 * CRDT — the only real questions are what to put on the wire and how often.
 */

const REPO_ROOT = path.resolve(__dirname, "../..");

function code(relativePath: string): string {
  return fs
    .readFileSync(path.join(REPO_ROOT, relativePath), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

function element(
  id: string,
  version: number,
  extra: Partial<WhiteboardElement> = {}
): WhiteboardElement {
  return { id, version, versionNonce: 1, index: "a1", isDeleted: false, ...extra };
}

// ───────────────────────────────────────────────────────────────────────────
describe("what goes on the wire", () => {
  it("sends only what changed", () => {
    // The point of the whole design: cost tracks what just happened, not how
    // much has been drawn. A full-scene send gets slower the longer the board
    // is used, which is backwards.
    const sent = new Map([
      ["a", 5],
      ["b", 2],
    ]);

    const { changed } = diffElements(sent, [element("a", 5), element("b", 3), element("c", 1)]);

    expect(changed.map((e) => e.id)).toEqual(["b", "c"]);
  });

  it("sends nothing at all when nothing moved", () => {
    const sent = new Map([["a", 5]]);
    expect(diffElements(sent, [element("a", 5)]).changed).toEqual([]);
  });

  it("reports the versions to record only after a send", () => {
    // Recorded by the caller once the publish resolves. Recording them up front
    // would make a failed send permanent: the element would look already-sent
    // and never be retried.
    const { versions } = diffElements(new Map(), [element("a", 7), element("b", 9)]);
    expect(versions.get("a")).toBe(7);
    expect(versions.get("b")).toBe(9);
  });

  it("treats a deletion as an ordinary change", () => {
    // Excalidraw keeps deleted elements in the scene with isDeleted, bumping
    // the version — so deletions need no separate message type.
    const sent = new Map([["a", 1]]);
    const { changed } = diffElements(sent, [element("a", 2, { isDeleted: true })]);

    expect(changed).toHaveLength(1);
    expect(changed[0].isDeleted).toBe(true);
  });
});

describe("staying inside the message limit", () => {
  it("splits a scene that will not fit into one packet", () => {
    // LiveKit reliable messages want to stay near 15 KiB. An element is a few
    // hundred bytes, so a real board passes that in dozens of shapes.
    const fat = Array.from({ length: 60 }, (_, i) =>
      element(`e${i}`, 1, { points: "x".repeat(500) })
    );

    const chunks = chunkElements(fat);

    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(new TextEncoder().encode(JSON.stringify(chunk)).length).toBeLessThanOrEqual(
        DELTA_BUDGET_BYTES
      );
    }
  });

  it("loses no element in the split", () => {
    const scene = Array.from({ length: 60 }, (_, i) =>
      element(`e${i}`, 1, { points: "x".repeat(500) })
    );

    const ids = chunkElements(scene)
      .flat()
      .map((e) => e.id);
    expect(ids).toEqual(scene.map((e) => e.id));
  });

  it("keeps a small change in a single packet", () => {
    expect(chunkElements([element("a", 1), element("b", 1)])).toHaveLength(1);
  });

  it("sends an oversized element alone rather than dropping it", () => {
    // A long freedraw stroke can exceed the budget by itself. Skipping it would
    // leave a permanent hole in the viewer's board.
    const huge = element("huge", 1, { points: "x".repeat(DELTA_BUDGET_BYTES * 2) });
    const chunks = chunkElements([element("a", 1), huge, element("b", 1)]);

    const alone = chunks.find((chunk) => chunk.some((e) => e.id === "huge"));
    expect(alone).toHaveLength(1);
    expect(chunks.flat().map((e) => e.id)).toEqual(["a", "huge", "b"]);
  });

  it("leaves headroom under LiveKit's ceiling for the envelope", () => {
    // The budget measures elements; the type tag and brackets ride on top.
    expect(DELTA_BUDGET_BYTES).toBeLessThan(15_000);
  });
});

describe("applying an update on the viewer", () => {
  it("adds what it has not seen", () => {
    const scene = applyDelta(new Map(), [element("a", 1)]);
    expect(scene.get("a")?.version).toBe(1);
  });

  it("replaces an element with a newer version of it", () => {
    const scene = new Map([["a", element("a", 1)]]);
    applyDelta(scene, [element("a", 2, { text: "newer" })]);
    expect(scene.get("a")?.text).toBe("newer");
  });

  it("ignores a message that arrived late", () => {
    // Out-of-order delivery would otherwise roll the viewer's board backwards.
    const scene = new Map([["a", element("a", 5, { text: "current" })]]);
    applyDelta(scene, [element("a", 2, { text: "stale" })]);
    expect(scene.get("a")?.text).toBe("current");
  });

  it("breaks a version tie the way Excalidraw does", () => {
    const scene = new Map([["a", element("a", 3, { versionNonce: 10, text: "held" })]]);

    applyDelta(scene, [element("a", 3, { versionNonce: 5, text: "lower nonce" })]);
    expect(scene.get("a")?.text).toBe("held");

    applyDelta(scene, [element("a", 3, { versionNonce: 20, text: "higher nonce" })]);
    expect(scene.get("a")?.text).toBe("higher nonce");
  });
});

describe("stacking order survives a partial update", () => {
  it("orders by fractional index, not arrival", () => {
    // This is what makes a delta possible at all. Order lives on the element,
    // so a viewer can place an update correctly without being sent the rest of
    // the scene — otherwise every message would have to carry every id.
    const scene = new Map([
      ["c", element("c", 1, { index: "a3" })],
      ["a", element("a", 1, { index: "a1" })],
      ["b", element("b", 1, { index: "a2" })],
    ]);

    expect(orderedElements(scene).map((e) => e.id)).toEqual(["a", "b", "c"]);
  });

  it("puts an element with no index yet at the end", () => {
    const scene = new Map([
      ["fresh", element("fresh", 1, { index: null })],
      ["placed", element("placed", 1, { index: "a1" })],
    ]);

    expect(orderedElements(scene).map((e) => e.id)).toEqual(["placed", "fresh"]);
  });

  it("is deterministic when two elements tie", () => {
    // Every viewer must agree, or two members see different stacking.
    const scene = new Map([
      ["z", element("z", 1, { index: "a1" })],
      ["a", element("a", 1, { index: "a1" })],
    ]);

    expect(orderedElements(scene).map((e) => e.id)).toEqual(["a", "z"]);
  });
});

describe("the broadcast cadence", () => {
  it("coalesces pointer moves instead of publishing each one", () => {
    // Excalidraw's onChange fires on every pointer move — tens per stroke.
    expect(BROADCAST_INTERVAL_MS).toBeGreaterThanOrEqual(150);
    expect(BROADCAST_INTERVAL_MS).toBeLessThanOrEqual(400);
  });

  it("sends on a trailing timer, not on every change", () => {
    const source = code("components/sessions/SessionWhiteboard.tsx");
    expect(source).toMatch(/pendingRef\.current = elements/);
    expect(source).toMatch(/setTimeout\(flush, BROADCAST_INTERVAL_MS\)/);
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe("only the host writes", () => {
  const board = code("components/sessions/SessionWhiteboard.tsx");
  const room = code("components/sessions/VideoRoomUI.tsx");
  const channel = code("hooks/useWhiteboardChannel.ts");

  it("a viewer's canvas is in view mode", () => {
    expect(board).toMatch(/viewModeEnabled=\{!isHost\}/);
  });

  it("a viewer has no change listener to broadcast from", () => {
    // Read-only enforced by not wiring the writer, not by asking politely.
    expect(board).toMatch(/onChange=\{isHost \? handleChange : undefined\}/);
    expect(board).toMatch(/if \(!isHost \|\| !onSceneChange\) return;/);
  });

  it("only the host sees the control that opens the board", () => {
    // It used to be `setStageMode(...)` on a button everyone had — which also
    // meant a member could put themselves on a whiteboard nobody was drawing.
    expect(room).toMatch(/\{isHost && \(\s*<button\s+onClick=\{toggleWhiteboard\}/);
  });

  it("a viewer ignores deltas that are not the host's to send", () => {
    expect(channel).toMatch(/if \(!isHostRef\.current\) ingest\(message\.elements\)/);
  });

  it("only the host answers a request for the board", () => {
    expect(channel).toMatch(/if \(!isHostRef\.current \|\| !participant\) return;/);
  });
});

describe("the stage follows the host, not the viewer", () => {
  const room = code("components/sessions/VideoRoomUI.tsx");
  const stage = code("components/sessions/MainStage.tsx");

  it("a member's board state comes from the channel", () => {
    expect(room).toMatch(/isHost \? stageMode === "whiteboard" : whiteboard\.isOpen/);
  });

  it("the host announces open and closed", () => {
    expect(room).toMatch(/whiteboard\.publishMode\(open\)/);
  });

  it("keeps the precedence the screen-share fix established", () => {
    // whiteboard > screen share > camera. A share arriving must not close a
    // board someone deliberately opened.
    const source = stage.slice(stage.indexOf("const effectiveMode"));
    const whiteboard = source.indexOf('return "whiteboard"');
    const screen = source.indexOf('return "screen"');
    expect(whiteboard).toBeGreaterThan(-1);
    expect(screen).toBeGreaterThan(whiteboard);
  });
});

describe("someone who joins late", () => {
  const channel = code("hooks/useWhiteboardChannel.ts");

  it("asks for the board rather than waiting to be told", () => {
    // The host cannot know when a new client's UI is ready, and without this a
    // late joiner sees a blank canvas until the next stroke.
    expect(channel).toMatch(/publish\(\{ kind: "whiteboard_request" \}\)/);
  });

  it("is answered with the mode and the whole scene", () => {
    const answer = channel.slice(channel.indexOf('case "whiteboard_request"'));
    expect(answer).toMatch(/kind: "whiteboard_mode", open: isOpenRef\.current/);
    expect(answer).toMatch(/hostSceneRef\.current/);
  });

  it("gets the snapshot over the chunking transport, addressed to them alone", () => {
    // A whole scene has no size ceiling, so it uses the API that splits and
    // reassembles rather than the packet API the deltas use.
    const answer = channel.slice(channel.indexOf('case "whiteboard_request"'));
    expect(answer).toMatch(/sendText\(/);
    expect(answer).toMatch(/destinationIdentities: \[participant\.identity\]/);
  });

  it("replaces the viewer's scene rather than merging into it", () => {
    // A snapshot is the host's whole board at a known moment; anything held
    // that is missing from it was deleted while this viewer was not listening.
    expect(channel).toMatch(/sceneRef\.current = new Map\(\);\s*ingest\(incoming\)/);
  });
});

describe("the copy matches what was built", () => {
  it("no longer calls the whiteboard collaborative", () => {
    // It is a presentation surface: the host draws, members watch. "Collaborative"
    // promised an editing seat nobody has.
    const surfaces = [
      "locales/en.json",
      "locales/es.json",
      "locales/fr.json",
      "app/[locale]/documentation/page.tsx",
      "app/[locale]/changelog/page.tsx",
      "app/[locale]/terms/page.tsx",
    ];

    for (const file of surfaces) {
      const source = fs.readFileSync(path.join(REPO_ROOT, file), "utf8");
      expect(source, `${file} still claims collaboration`).not.toMatch(
        /collaborative whiteboard|pizarra colaborativa|tableau blanc collaboratif/i
      );
    }
  });

  it("keeps the comparison row's verdicts, changing only the label", () => {
    const source = code("app/[locale]/page.tsx");
    const row = source.slice(source.indexOf("comparison.rows.whiteboard"));
    expect(row).toMatch(/skool="✗"/);
    expect(row).toMatch(/unytea="✓"/);
  });
});
