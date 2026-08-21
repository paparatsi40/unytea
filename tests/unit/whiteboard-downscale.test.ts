import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

import {
  dataUrlByteLength,
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
describe("where it is wired in", () => {
  const board = code("components/sessions/SessionWhiteboard.tsx");

  it("shrinks each image once, not on every onChange", () => {
    // `onChange` fires many times per image — an insert is several renders and
    // every pointer move after it is another.
    expect(board).toMatch(/downscaledRef\.current\.has\(id\)/);
    expect(board).toMatch(/downscaledRef\.current\.add\(id\)/);
  });

  it("hands the map on before waiting for anything", () => {
    const shrink = board.slice(board.indexOf("const shrinkAndForward"));
    const forward = shrink.indexOf("onFilesChange(files)");
    const work = shrink.indexOf("downscaleDataUrl(");
    expect(forward).toBeGreaterThan(-1);
    expect(work).toBeGreaterThan(forward);
  });

  it("puts the smaller copy back under the same id", () => {
    // The id is the only thing anything downstream knows about. Keeping it is
    // what makes the delta path, the snapshot, the convergence pass and the
    // send dedup unable to tell this happened at all.
    const shrink = board.slice(board.indexOf("const shrinkAndForward"));
    expect(shrink).toMatch(/addFiles\(\[\s*\{ id, mimeType: outputMimeType\(mimeType\), dataURL/);
  });

  it("leaves the transport alone", () => {
    // The file transport, the snapshot and the disconnect handling are all
    // settled. This is hygiene in front of them, not a change to them.
    const channel = code("hooks/useWhiteboardChannel.ts");
    expect(channel).not.toMatch(/downscale/i);
  });
});
