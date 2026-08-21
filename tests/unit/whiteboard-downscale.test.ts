import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

import {
  dataUrlByteLength,
  partitionFilesForForward,
  outputMimeType,
  shouldDownscale,
  targetDimensions,
  JPEG_QUALITY,
  MAX_IMAGE_EDGE_PX,
  MIN_DOWNSCALE_BYTES,
} from "@/lib/whiteboard/downscale";

/**
 * A whiteboard is a screen, and a screen is not a photo lab.
 *
 * A 4000-pixel photo pasted onto a board is displayed at a few hundred pixels
 * and broadcast to everyone in the room at full resolution — as a base64
 * dataURL, which is a third larger again. Capping the long edge costs nothing
 * anyone can see and takes a 2 MB photo comfortably under a megabyte.
 *
 * The decision and the arithmetic are here. The re-encode itself is canvas, so
 * it is not: what a browser's JPEG encoder produces is not this module's
 * contract, and pinning it would be pinning the browser.
 */

const REPO_ROOT = path.resolve(__dirname, "../..");

function code(relativePath: string): string {
  return fs
    .readFileSync(path.join(REPO_ROOT, relativePath), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

const BIG = 2 * 1024 * 1024;

// ───────────────────────────────────────────────────────────────────────────
describe("what is worth shrinking", () => {
  it("shrinks a photo wider than the cap", () => {
    expect(shouldDownscale({ mimeType: "image/jpeg", width: 4000, height: 3000, bytes: BIG })).toBe(
      true
    );
  });

  it("shrinks one that is tall rather than wide", () => {
    // The long edge is the test, whichever edge that is.
    expect(shouldDownscale({ mimeType: "image/jpeg", width: 900, height: 4000, bytes: BIG })).toBe(
      true
    );
  });

  it("leaves an image that already fits alone", () => {
    // Re-encoding something already small can only lose detail.
    expect(
      shouldDownscale({ mimeType: "image/png", width: MAX_IMAGE_EDGE_PX, height: 900, bytes: BIG })
    ).toBe(false);
  });

  it("does not bother with a small file", () => {
    // Decoding and re-encoding an icon costs more than it saves, and the saving
    // would be invisible next to a session's video.
    expect(
      shouldDownscale({
        mimeType: "image/png",
        width: 4000,
        height: 4000,
        bytes: MIN_DOWNSCALE_BYTES - 1,
      })
    ).toBe(false);
  });

  it("never touches SVG", () => {
    // Vector. Rasterising it to fit a pixel cap makes it larger and worse at
    // the same time.
    expect(
      shouldDownscale({ mimeType: "image/svg+xml", width: 4000, height: 4000, bytes: BIG })
    ).toBe(false);
  });

  it("never touches GIF", () => {
    // May be animated, and a canvas re-encode keeps exactly one frame — a
    // silent way to break a picture.
    expect(shouldDownscale({ mimeType: "image/gif", width: 4000, height: 4000, bytes: BIG })).toBe(
      false
    );
  });

  it("handles png, jpeg and webp", () => {
    for (const mimeType of ["image/png", "image/jpeg", "image/webp"]) {
      expect(shouldDownscale({ mimeType, width: 4000, height: 100, bytes: BIG }), mimeType).toBe(
        true
      );
    }
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe("the size it is drawn at", () => {
  it("caps the long edge and keeps the shape", () => {
    const size = targetDimensions(4000, 3000);
    expect(size.width).toBe(MAX_IMAGE_EDGE_PX);
    expect(size.height).toBe(Math.round((3000 * MAX_IMAGE_EDGE_PX) / 4000));
    // The aspect ratio survives to within a rounded pixel.
    expect(size.width / size.height).toBeCloseTo(4000 / 3000, 2);
  });

  it("caps the height when that is the long edge", () => {
    const size = targetDimensions(1000, 5000);
    expect(size.height).toBe(MAX_IMAGE_EDGE_PX);
    expect(size.width).toBe(Math.round((1000 * MAX_IMAGE_EDGE_PX) / 5000));
  });

  it("returns something already small unchanged", () => {
    expect(targetDimensions(800, 600)).toEqual({ width: 800, height: 600 });
    expect(targetDimensions(MAX_IMAGE_EDGE_PX, 20)).toEqual({
      width: MAX_IMAGE_EDGE_PX,
      height: 20,
    });
  });

  it("never produces a zero edge", () => {
    // A 4000×1 hairline scaled by its long edge is 1600×0.4, which rounds to
    // zero — and a canvas of zero height throws. The first draft of this test
    // used 4000×3, which rounds to 1 on its own and passed with the guard
    // removed: it proved nothing.
    const size = targetDimensions(4000, 1);
    expect(size.width).toBe(MAX_IMAGE_EDGE_PX);
    expect(size.height).toBe(1);
  });

  it("takes the cap as an argument, so the constant is not the contract", () => {
    expect(targetDimensions(1000, 500, 100)).toEqual({ width: 100, height: 50 });
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe("what it comes out as", () => {
  it("keeps PNG as PNG", () => {
    // PNG is the format that carries transparency. A screenshot with a
    // transparent corner becomes a black corner the moment it is a JPEG.
    expect(outputMimeType("image/png")).toBe("image/png");
  });

  it("turns everything else into JPEG", () => {
    expect(outputMimeType("image/jpeg")).toBe("image/jpeg");
    expect(outputMimeType("image/webp")).toBe("image/jpeg");
  });

  it("uses a quality that is not lossless and not visible", () => {
    expect(JPEG_QUALITY).toBeGreaterThan(0.7);
    expect(JPEG_QUALITY).toBeLessThan(1);
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe("measuring a data URL", () => {
  it("counts the bytes, not the characters", () => {
    // base64 is four characters for every three bytes; measuring the string
    // would over-count by a third and skew every threshold in this module.
    const payload = "A".repeat(4000);
    expect(dataUrlByteLength(`data:image/png;base64,${payload}`)).toBe(3000);
  });

  it("discounts the padding", () => {
    expect(dataUrlByteLength("data:image/png;base64,QQ==")).toBe(1);
    expect(dataUrlByteLength("data:image/png;base64,QUE=")).toBe(2);
    expect(dataUrlByteLength("data:image/png;base64,QUJD")).toBe(3);
  });

  it("does not fall over on something that is not a data URL", () => {
    expect(dataUrlByteLength("nonsense")).toBe("nonsense".length);
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe("only the smaller copy reaches the wire", () => {
  /**
   * The bug this replaced, and it made the whole feature inert.
   *
   * `shrinkAndForward` used to forward the file map on its first line and
   * shrink afterwards. `onChange` arrives with the original; the forward
   * reached `publishFiles`; and the transport claims a file the instant it
   * starts streaming it. By the time the smaller copy existed the id was
   * already spent, so the send dedup filtered it out — the reduction reached
   * the host's own canvas and nowhere else, and every guest got the full-size
   * image, as did the snapshot and the convergence pass afterwards.
   *
   * There was never a double send: the claim from the send-storm fix saw to
   * that. It is the same mechanism that made the reduction unreachable.
   */
  const png = { mimeType: "image/png", dataURL: "data:image/png;base64,QUJD" };

  it("holds a new image back until it has been shrunk", () => {
    const { ready, toShrink } = partitionFilesForForward({ f1: png }, new Set(), new Set());

    expect(ready).toEqual({});
    expect(toShrink).toEqual([{ id: "f1", mimeType: png.mimeType, dataURL: png.dataURL }]);
  });

  it("does not start the same shrink twice", () => {
    // `onChange` fires many times per image; each one used to be another full
    // decode of the same picture.
    const { ready, toShrink } = partitionFilesForForward({ f1: png }, new Set(), new Set(["f1"]));

    expect(ready).toEqual({});
    expect(toShrink).toEqual([]);
  });

  it("passes a settled image through again, so a refused send can retry", () => {
    const { ready, toShrink } = partitionFilesForForward({ f1: png }, new Set(["f1"]), new Set());

    expect(ready).toEqual({ f1: png });
    expect(toShrink).toEqual([]);
  });

  it("judges each image on its own", () => {
    const { ready, toShrink } = partitionFilesForForward(
      { done: png, working: png, fresh: png },
      new Set(["done"]),
      new Set(["working"])
    );

    expect(Object.keys(ready)).toEqual(["done"]);
    expect(toShrink.map((f) => f.id)).toEqual(["fresh"]);
  });

  it("skips an entry with no bytes in it yet", () => {
    // Excalidraw keeps a placeholder in the map while it reads the file.
    const { ready, toShrink } = partitionFilesForForward(
      { f1: { mimeType: "image/png" }, f2: { dataURL: "data:x" }, f3: undefined },
      new Set(),
      new Set()
    );

    expect(ready).toEqual({});
    expect(toShrink).toEqual([]);
  });
});

describe("the order in the component", () => {
  const board = code("components/sessions/SessionWhiteboard.tsx");

  it("forwards nothing before the partition has decided", () => {
    // The line that caused it: `onFilesChange(files)` as the first statement,
    // with the original map.
    const shrink = board.slice(board.indexOf("const shrinkAndForward"));
    expect(shrink).not.toMatch(/onFilesChange\(files\)/);
    const partition = shrink.indexOf("partitionFilesForForward(");
    const forward = shrink.indexOf("onFilesChange(ready)");
    expect(partition).toBeGreaterThan(-1);
    expect(forward).toBeGreaterThan(partition);
  });

  it("forwards the shrunk version once the work is done", () => {
    const shrink = board.slice(board.indexOf("const shrinkAndForward"));
    expect(shrink).toMatch(/onFilesChange\(\{ \[id\]: \{ mimeType: outcome\.mimeType/);
  });

  it("says what it did, in bytes, whichever way it went", () => {
    // The byte-streams are invisible in the network tab, so a console line is
    // the only way anyone can check this from a browser — and it is printed
    // unconditionally, because logging only the shrink made silence ambiguous
    // between "left alone on purpose" and "the feature never ran".
    const shrink = board.slice(board.indexOf("const shrinkAndForward"));
    expect(shrink).toMatch(/console\.info\("\[whiteboard\] image"/);
    expect(shrink).toMatch(/reason: outcome\.reason/);
    // `sent` is measured, never copied from what the shrinker claimed.
    expect(shrink).toMatch(/const sent = dataUrlByteLength\(outcome\.dataURL\)/);
    expect(shrink).not.toMatch(/sent: outcome\.bytesAfter/);
  });

  it("never lets a failed shrink strand the image", () => {
    // The forward waits on the shrink now, so a rejection that got past the
    // module's own catch would withhold the picture for the whole session.
    const shrink = board.slice(board.indexOf("const shrinkAndForward"));
    const rescue = shrink.slice(shrink.indexOf(".catch("));
    expect(rescue).toMatch(/onFilesChange\(\{ \[id\]: \{ mimeType, dataURL: source \} \}\)/);
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe("where it is wired in", () => {
  const board = code("components/sessions/SessionWhiteboard.tsx");

  it("shrinks each image once, not on every onChange", () => {
    // `onChange` fires many times per image — an insert is several renders and
    // every pointer move after it is another.
    expect(board).toMatch(/shrinkingFilesRef\.current\.add\(id\)/);
    expect(board).toMatch(/settledFilesRef\.current\.add\(id\)/);
  });

  /**
   * This test used to assert the opposite, and it was wrong.
   *
   * It pinned `onFilesChange(files)` running *before* `downscaleDataUrl` —
   * "hands the map on before waiting for anything" — which reads like
   * responsiveness and was in fact the bug: the map handed on was the original,
   * the transport claimed the id immediately, and the smaller copy could never
   * be sent afterwards. A green test locking in the defect it was written to
   * prevent.
   */
  it("does not hand an image on before it has been shrunk", () => {
    const shrink = board.slice(board.indexOf("const shrinkAndForward"));
    expect(shrink).not.toMatch(/onFilesChange\(files\)/);
  });

  it("puts the smaller copy back under the same id", () => {
    // The id is the only thing anything downstream knows about. Keeping it is
    // what makes the delta path, the snapshot, the convergence pass and the
    // send dedup unable to tell this happened at all.
    const shrink = board.slice(board.indexOf("const shrinkAndForward"));
    expect(shrink).toMatch(
      /addFiles\(\[\s*\{ id, mimeType: outcome\.mimeType, dataURL: outcome\.dataURL/
    );
  });

  it("leaves the transport alone", () => {
    // The file transport, the snapshot and the disconnect handling are all
    // settled. This is hygiene in front of them, not a change to them.
    const channel = code("hooks/useWhiteboardChannel.ts");
    expect(channel).not.toMatch(/downscale/i);
  });
});
