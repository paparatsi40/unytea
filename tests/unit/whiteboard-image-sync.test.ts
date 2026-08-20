import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

import {
  diffFiles,
  filesForScene,
  missingFileIds,
  pendingFileRequests,
  recordFileRequests,
  FILE_REQUEST_MAX_ATTEMPTS,
  FILE_REQUEST_RETRY_MS,
  type FileRequestAttempt,
  type WhiteboardElement,
  type WhiteboardFile,
} from "@/lib/whiteboard/protocol";

/**
 * An image on the whiteboard is two things, and only one of them was ever
 * broadcast.
 *
 * The element carries the geometry and a `fileId`. The bytes live in a separate
 * map Excalidraw calls `files`, keyed by that id, and handed over as the third
 * argument of `onChange` — an argument this codebase was not receiving, because
 * `handleChange`'s parameter list stopped at the first one. So a guest got a
 * reference to something it had never been sent, and Excalidraw's renderer took
 * the branch it takes for a file that is not in its cache: `drawImagePlaceholder`
 * fills the element's rectangle with #E7E7E7 and draws a grey picture glyph in
 * the middle. Not an error icon — `status` is the host's "saved", so it is the
 * *pending* placeholder. A picture that looks like it is still loading, for the
 * rest of the session.
 *
 * The bytes now travel on LiveKit byte streams, which chunk and reassemble the
 * way the late-join snapshot already relies on. This file covers the parts of
 * that with no LiveKit in them.
 */

const REPO_ROOT = path.resolve(__dirname, "../..");

function code(relativePath: string): string {
  return fs
    .readFileSync(path.join(REPO_ROOT, relativePath), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

function image(id: string, fileId: string | null, extra: Partial<WhiteboardElement> = {}) {
  return { id, version: 1, type: "image", fileId, ...extra } as WhiteboardElement;
}

function stroke(id: string) {
  return { id, version: 1, type: "freedraw" } as WhiteboardElement;
}

function file(id: string): WhiteboardFile {
  return { id, mimeType: "image/png", dataURL: `data:image/png;base64,${id}` };
}

// ───────────────────────────────────────────────────────────────────────────
describe("which files the host still owes the room", () => {
  it("sends one it has never sent", () => {
    const fresh = diffFiles(new Set(), { f1: { mimeType: "image/png", dataURL: "data:x" } });
    expect(fresh).toEqual([{ id: "f1", mimeType: "image/png", dataURL: "data:x" }]);
  });

  it("does not send one it has already sent", () => {
    // Identity is the whole diff, unlike an element, which needs a version. An
    // Excalidraw file id is derived from the file's contents and the entry is
    // immutable, so a file sent once can never need sending again.
    const fresh = diffFiles(new Set(["f1"]), { f1: { mimeType: "image/png", dataURL: "data:x" } });
    expect(fresh).toEqual([]);
  });

  it("skips an entry with no bytes in it", () => {
    // Excalidraw keeps a placeholder in the map while an image is still being
    // read off the clipboard. Streaming that would deliver nothing.
    expect(diffFiles(new Set(), { f1: { mimeType: "image/png" } })).toEqual([]);
    expect(diffFiles(new Set(), { f1: undefined })).toEqual([]);
  });

  it("carries the mime type, and names one when the map has none", () => {
    // It travels as a stream attribute and comes back out in the viewer's
    // BinaryFileData, which requires it.
    expect(diffFiles(new Set(), { f1: { dataURL: "data:x" } })[0].mimeType).toBe(
      "application/octet-stream"
    );
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe("what the viewer is missing", () => {
  it("names a file the scene points at and the viewer does not hold", () => {
    const scene = [stroke("s1"), image("i1", "f1")];
    expect(missingFileIds(scene, new Set())).toEqual(["f1"]);
  });

  it("says nothing when the bytes are already held", () => {
    expect(missingFileIds([image("i1", "f1")], new Set(["f1"]))).toEqual([]);
  });

  it("ignores everything that is not an image", () => {
    expect(missingFileIds([stroke("s1"), stroke("s2")], new Set())).toEqual([]);
  });

  it("ignores an image that has been deleted", () => {
    // Excalidraw keeps deleted elements in the scene with `isDeleted`. Fetching
    // a megabyte to draw nothing is the definition of waste.
    expect(missingFileIds([image("i1", "f1", { isDeleted: true })], new Set())).toEqual([]);
  });

  it("ignores an image that has no file id yet", () => {
    // The moment between placing an element and the file being read.
    expect(missingFileIds([image("i1", null)], new Set())).toEqual([]);
    expect(missingFileIds([image("i2", "")], new Set())).toEqual([]);
  });

  it("asks once for a file two elements share", () => {
    const scene = [image("i1", "f1"), image("i2", "f1")];
    expect(missingFileIds(scene, new Set())).toEqual(["f1"]);
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe("not asking for the same file twice", () => {
  const NOW = 1_000_000;

  it("asks for something never asked for", () => {
    expect(pendingFileRequests(["f1"], new Map(), NOW)).toEqual(["f1"]);
  });

  it("does not ask again while the answer is still in flight", () => {
    // The whole point. A request sent 200 ms ago is still arriving, and asking
    // again has the host stream the same megabyte a second time.
    const ledger = new Map<string, FileRequestAttempt>([
      ["f1", { attempts: 1, lastAskedAt: NOW - 200 }],
    ]);
    expect(pendingFileRequests(["f1"], ledger, NOW)).toEqual([]);
  });

  it("asks again once the window has passed", () => {
    const ledger = new Map<string, FileRequestAttempt>([
      ["f1", { attempts: 1, lastAskedAt: NOW - FILE_REQUEST_RETRY_MS }],
    ]);
    expect(pendingFileRequests(["f1"], ledger, NOW)).toEqual(["f1"]);
  });

  it("gives up after a bounded number of attempts", () => {
    // The host may have closed the board or left the room. A viewer that asks
    // for ever is a viewer generating traffic nobody will answer.
    const ledger = new Map<string, FileRequestAttempt>([
      [
        "f1",
        { attempts: FILE_REQUEST_MAX_ATTEMPTS, lastAskedAt: NOW - 10 * FILE_REQUEST_RETRY_MS },
      ],
    ]);
    expect(pendingFileRequests(["f1"], ledger, NOW)).toEqual([]);
  });

  it("judges each file on its own record", () => {
    const ledger = new Map<string, FileRequestAttempt>([
      ["f1", { attempts: 1, lastAskedAt: NOW - 200 }],
    ]);
    expect(pendingFileRequests(["f1", "f2"], ledger, NOW)).toEqual(["f2"]);
  });

  it("counts an attempt only when one is recorded", () => {
    // Recorded by the caller after the request is actually on the wire, so a
    // publish that was refused is retried rather than burning an attempt.
    const ledger = new Map<string, FileRequestAttempt>();
    recordFileRequests(ledger, ["f1"], NOW);
    expect(ledger.get("f1")).toEqual({ attempts: 1, lastAskedAt: NOW });

    recordFileRequests(ledger, ["f1"], NOW + FILE_REQUEST_RETRY_MS);
    expect(ledger.get("f1")).toEqual({
      attempts: 2,
      lastAskedAt: NOW + FILE_REQUEST_RETRY_MS,
    });
  });

  it("converges: a file asked for and never answered stops being asked for", () => {
    const ledger = new Map<string, FileRequestAttempt>();
    let now = NOW;
    let asked = 0;

    for (let sweep = 0; sweep < 20; sweep++) {
      const ask = pendingFileRequests(["f1"], ledger, now);
      recordFileRequests(ledger, ask, now);
      asked += ask.length;
      now += FILE_REQUEST_RETRY_MS;
    }

    expect(asked).toBe(FILE_REQUEST_MAX_ATTEMPTS);
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe("answering a late joiner", () => {
  const held = new Map([
    ["f1", file("f1")],
    ["f2", file("f2")],
  ]);

  it("sends only what the current scene points at", () => {
    // The host holds every image it has ever pasted. A joiner needs the ones on
    // the board now.
    const scene = [image("i1", "f1"), stroke("s1")];
    expect(filesForScene(scene, held).map((f) => f.id)).toEqual(["f1"]);
  });

  it("sends a shared file once", () => {
    const scene = [image("i1", "f1"), image("i2", "f1")];
    expect(filesForScene(scene, held).map((f) => f.id)).toEqual(["f1"]);
  });

  it("skips a deleted image", () => {
    const scene = [image("i1", "f1", { isDeleted: true }), image("i2", "f2")];
    expect(filesForScene(scene, held).map((f) => f.id)).toEqual(["f2"]);
  });

  it("skips a reference the host cannot satisfy", () => {
    // Nothing to send, and the viewer's own convergence pass will keep asking
    // until it gives up — which is the honest outcome for bytes nobody has.
    expect(filesForScene([image("i1", "gone")], held)).toEqual([]);
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe("how the pieces are wired", () => {
  it("takes the third argument of onChange", () => {
    // The gap, in one line: the parameter list used to stop at `elements`.
    const board = code("components/sessions/SessionWhiteboard.tsx");
    expect(board).toMatch(/\(elements: readonly unknown\[\], _appState: unknown, files\?/);
    expect(board).toMatch(/if \(files && onFilesChange\) onFilesChange\(files\)/);
  });

  it("hands the bytes to Excalidraw's own file store", () => {
    // `addFiles` was not called anywhere in this codebase before now.
    const board = code("components/sessions/SessionWhiteboard.tsx");
    expect(board).toMatch(/excalidrawAPI\.addFiles\(/);
  });

  it("moves images on byte streams, not in the delta packets", () => {
    // A pasted screenshot as a base64 dataURL is twenty to ninety times a
    // reliable packet's budget, and the delta format has no sequence numbers.
    const channel = code("hooks/useWhiteboardChannel.ts");
    expect(channel).toMatch(/streamBytes\(\{/);
    expect(channel).toMatch(/registerByteStreamHandler\(FILE_TOPIC/);
  });

  it("keeps the files out of the snapshot payload", () => {
    // Folding them in would turn a snapshot of kilobytes into one of megabytes,
    // and the joiner would see nothing until all of it had arrived.
    const channel = code("hooks/useWhiteboardChannel.ts");
    expect(channel).toMatch(/JSON\.stringify\(\{ elements: hostSceneRef\.current \}\)/);
    expect(channel).not.toMatch(/JSON\.stringify\(\{ elements: [^}]*files/);
  });

  it("answers a late joiner and a file request to that identity alone", () => {
    const channel = code("hooks/useWhiteboardChannel.ts");
    const answer = channel.slice(channel.indexOf('case "whiteboard_request"'));
    expect(answer).toMatch(/filesForScene\(hostSceneRef\.current, hostFilesRef\.current\)/);
    expect(answer).toMatch(/sendFile\(file, \[participant\.identity\]\)/);

    const request = channel.slice(channel.indexOf('case "whiteboard_file_request"'));
    expect(request).toMatch(/if \(!isHostRef\.current \|\| !participant\) return;/);
    expect(request).toMatch(/sendFile\(file, \[participant\.identity\]\)/);
  });

  it("records a request only once it is on the wire", () => {
    const channel = code("hooks/useWhiteboardChannel.ts");
    expect(channel).toMatch(
      /if \(publish\(\{ kind: "whiteboard_file_request", fileIds: ask \}\)\) \{\s*recordFileRequests/
    );
  });
});
