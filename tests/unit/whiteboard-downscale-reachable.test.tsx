// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, act, cleanup } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import fs from "node:fs";
import path from "node:path";

/**
 * Is the downscale reachable at all?
 *
 * Reported from production: `[whiteboard] downscaled image` never appears, for
 * large images or small, and on the last attempt the image came in through
 * Excalidraw's own upload button rather than a paste. The picture arrives on
 * the board, so the sync works — but if the shrink never runs, every image is
 * still going over the wire at full size and the feature is inert.
 *
 * Reading the wiring did not settle it: `onChange` is passed, `onFilesChange`
 * is passed, and Excalidraw does hand over its file map — `this.props.onChange?.
 * (elements, this.state, this.files)`. So this drives the component instead.
 */

const REPO_ROOT = path.resolve(__dirname, "../..");

const holder = vi.hoisted(() => ({
  onChange: null as null | ((elements: unknown[], appState: unknown, files: unknown) => void),
  addFiles: vi.fn(),
  // Typed against the real signature, so a per-test implementation can return
  // any reason without the first one narrowing the mock to itself.
  downscale: vi.fn<
    (
      dataURL: string,
      mimeType: string
    ) => Promise<{
      dataURL: string;
      mimeType: string;
      reason: string;
      bytesBefore: number;
      bytesAfter: number;
    }>
  >(),
}));

// The real Excalidraw needs a canvas; this stands in for it and hands back the
// props the component gave it, which is what the test is about.
vi.mock("next/dynamic", () => ({
  default: () => {
    const Stub = (props: Record<string, unknown>) => {
      holder.onChange = props.onChange as typeof holder.onChange;
      // Handed over once. Calling it on every render would set new state with a
      // new object every time, which is an infinite loop rather than a test.
      React.useEffect(() => {
        const api = props.excalidrawAPI as ((api: unknown) => void) | undefined;
        api?.({ addFiles: holder.addFiles, updateScene: () => {}, getFiles: () => ({}) });
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);
      return null;
    };
    return Stub;
  },
}));
vi.mock("@excalidraw/excalidraw/index.css", () => ({}));

vi.mock("@/lib/whiteboard/downscale", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/whiteboard/downscale")>();
  return { ...actual, downscaleDataUrl: holder.downscale };
});

import { SessionWhiteboard } from "@/components/sessions/SessionWhiteboard";
import { dataUrlByteLength } from "@/lib/whiteboard/downscale";

const MESSAGES = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, "locales/en.json"), "utf8"));

/** A file map shaped like the one Excalidraw hands over. */
function files(id: string, dataURL: string, mimeType = "image/png") {
  return { [id]: { id, mimeType, dataURL, created: 0 } };
}

const BIG = `data:image/png;base64,${"A".repeat(400_000)}`;
const SMALL = `data:image/png;base64,${"B".repeat(4_000)}`;

function mount(onFilesChange = vi.fn()) {
  render(
    <NextIntlClientProvider locale="en" messages={MESSAGES} timeZone="UTC">
      <SessionWhiteboard
        embedded
        sessionId="s1"
        isHost
        onClose={vi.fn()}
        onSceneChange={vi.fn()}
        onFilesChange={onFilesChange}
      />
    </NextIntlClientProvider>
  );
  return onFilesChange;
}

beforeEach(() => {
  vi.clearAllMocks();
  holder.onChange = null;
  holder.downscale.mockImplementation(async (dataURL: string, mimeType: string) => ({
    dataURL,
    mimeType,
    reason: "already_small" as const,
    bytesBefore: 10,
    bytesAfter: 10,
  }));
});

afterEach(() => cleanup());

// ───────────────────────────────────────────────────────────────────────────
describe("a new image reaches the shrinker", () => {
  it("is handed to the downscaler when it first appears in the file map", async () => {
    const onFilesChange = mount();
    expect(holder.onChange).not.toBeNull();

    await act(async () => {
      holder.onChange!([], {}, files("f1", BIG));
    });

    expect(holder.downscale).toHaveBeenCalledWith(BIG, "image/png");
    expect(onFilesChange).toHaveBeenCalled();
  });

  it("forwards the shrunk copy, and only after the shrink", async () => {
    holder.downscale.mockImplementation(async () => ({
      dataURL: SMALL,
      mimeType: "image/png",
      reason: "shrunk" as const,
      bytesBefore: 300_000,
      bytesAfter: 3_000,
    }));
    const onFilesChange = mount();

    await act(async () => {
      holder.onChange!([], {}, files("f1", BIG));
    });

    // The original must never be what gets forwarded.
    const forwarded = onFilesChange.mock.calls.flatMap((call) =>
      Object.values(call[0] as Record<string, { dataURL?: string }>)
    );
    expect(forwarded.map((f) => f.dataURL)).toEqual([SMALL]);
  });

  it("says what it did, and measures what it sent", async () => {
    // The line the report says never appears. `bytesAfter` is deliberately a
    // lie here — `sent` has to come from the value actually handed to the
    // transport, not be copied from what the shrinker claimed, or it could
    // never catch a different copy reaching the wire.
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    holder.downscale.mockImplementation(async () => ({
      dataURL: SMALL,
      mimeType: "image/png",
      reason: "shrunk" as const,
      bytesBefore: 300_000,
      bytesAfter: 999,
    }));
    mount();

    await act(async () => {
      holder.onChange!([], {}, files("f1", BIG));
    });

    expect(info).toHaveBeenCalledWith(
      "[whiteboard] image",
      expect.objectContaining({
        id: "f1",
        reason: "shrunk",
        before: 300_000,
        after: 999,
        sent: dataUrlByteLength(SMALL),
      })
    );
  });

  it("says so when there was nothing to shrink, instead of saying nothing", async () => {
    // Silence used to be ambiguous: "left alone on purpose" and "the feature
    // never ran" printed the same thing, which is nothing, and telling them
    // apart took a test harness rather than a glance at the console.
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    holder.downscale.mockImplementation(async (dataURL: string, mimeType: string) => ({
      dataURL,
      mimeType,
      reason: "already_small" as const,
      bytesBefore: 10,
      bytesAfter: 10,
    }));
    mount();

    await act(async () => {
      holder.onChange!([], {}, files("f1", BIG));
    });

    expect(info).toHaveBeenCalledWith(
      "[whiteboard] image",
      expect.objectContaining({ id: "f1", reason: "already_small" })
    );
  });

  it("shrinks an image whichever way it arrived", async () => {
    // Paste, drop and the toolbar's upload button all end at the same place:
    // Excalidraw's own `insertImageElement`, which puts the file in the map and
    // triggers `onChange`. There is no third path to miss — but the upload
    // button is the one the report used, so it is worth a test that says so.
    holder.downscale.mockImplementation(async () => ({
      dataURL: SMALL,
      mimeType: "image/png",
      reason: "shrunk" as const,
      bytesBefore: 300_000,
      bytesAfter: 3_000,
    }));
    mount();

    for (const id of ["pasted", "dropped", "uploaded"]) {
      await act(async () => {
        holder.onChange!([], {}, files(id, BIG));
      });
    }

    expect(holder.downscale).toHaveBeenCalledTimes(3);
  });

  it("does not shrink the same image twice", async () => {
    holder.downscale.mockImplementation(async () => ({
      dataURL: SMALL,
      mimeType: "image/png",
      reason: "shrunk" as const,
      bytesBefore: 300_000,
      bytesAfter: 3_000,
    }));
    mount();

    for (let i = 0; i < 5; i++) {
      await act(async () => {
        holder.onChange!([], {}, files("f1", BIG));
      });
    }

    expect(holder.downscale).toHaveBeenCalledTimes(1);
  });
});
