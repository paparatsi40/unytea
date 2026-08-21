// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";

import { DECODE_TIMEOUT_MS, downscaleDataUrl } from "@/lib/whiteboard/downscale";

/**
 * The shrinker's own behaviour, unmocked.
 *
 * Kept apart from the reachability harness, which replaces `downscaleDataUrl`
 * with a stub in order to ask a different question — whether the component ever
 * calls it at all.
 */

const BIG = `data:image/png;base64,${"A".repeat(400_000)}`;
const SMALL = `data:image/png;base64,${"B".repeat(4_000)}`;

// ───────────────────────────────────────────────────────────────────────────
describe("the shrink cannot lose a picture", () => {
  /** An `Image` whose handlers are never called, which is a real failure mode. */
  class SilentImage {
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    width = 4000;
    height = 3000;
    set src(_value: string) {
      // Nothing. Neither handler ever fires.
    }
  }

  it("gives up on a decode that never answers, and sends the original", async () => {
    // Before the forward was made to wait on the shrink, a hung decode was
    // survivable — the file had already gone. Now it would withhold the image
    // from the room for the rest of the session, so the wait is bounded.
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const original = globalThis.Image;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    globalThis.Image = SilentImage as any;
    vi.useFakeTimers();

    try {
      const pending = downscaleDataUrl(BIG, "image/png");
      await vi.advanceTimersByTimeAsync(DECODE_TIMEOUT_MS + 100);
      const outcome = await pending;

      expect(outcome.reason).toBe("failed");
      expect(outcome.dataURL).toBe(BIG);
      expect(warn).toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
      globalThis.Image = original;
    }
  });

  it("tells the skips apart instead of calling them all failures", async () => {
    // The reason is the whole point of the log: "left alone on purpose" and
    // "something went wrong" are different answers to the same silence.
    expect((await downscaleDataUrl(BIG, "image/gif")).reason).toBe("unsupported_type");
    expect((await downscaleDataUrl(SMALL, "image/png")).reason).toBe("below_floor");
  });
});
