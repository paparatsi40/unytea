// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { render, act, cleanup, fireEvent, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { Track } from "livekit-client";

/**
 * The stage, on the whole display.
 *
 * A shared screen is letterboxed to its own aspect ratio inside a box that the
 * notes and chat panels have already narrowed, so it arrives small however
 * large the monitor is. No layout change fixes that — the panels are there
 * because people use them — so the viewer gets the element on its own for as
 * long as they want it.
 *
 * Two things this has to get right, and both are about not offering something
 * that will not work:
 *
 *   - iOS Safari cannot put an arbitrary element fullscreen at all; only a
 *     `<video>` can. `document.fullscreenEnabled` is false there, and a button
 *     that does nothing every time for a whole platform is worse than no
 *     button.
 *   - An empty stage is not worth enlarging. Filling a display with "waiting
 *     for video" is not a feature.
 *
 * It publishes nothing and asks nobody: host and audience both get it, because
 * it changes what one person is looking at and that is all.
 */

const REPO_ROOT = path.resolve(__dirname, "../..");
const MESSAGES = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, "locales/en.json"), "utf8"));
const STAGE = MESSAGES.liveSession.mainStage;

// ── LiveKit stand-ins ──────────────────────────────────────────────────────
const holder = vi.hoisted(() => ({
  camera: [] as unknown[],
  screen: [] as unknown[],
  isCameraEnabled: false,
}));

vi.mock("@livekit/components-react", () => ({
  ParticipantTile: () => null,
  VideoTrack: () => null,
  useLocalParticipant: () => ({
    localParticipant: {
      identity: "s1:me",
      isCameraEnabled: holder.isCameraEnabled,
      isMicrophoneEnabled: false,
      getTrackPublication: () => undefined,
    },
  }),
  useTracks: (sources: unknown[]) =>
    sources[0] === Track.Source.ScreenShare ? holder.screen : holder.camera,
}));

vi.mock("@/components/sessions/SessionWhiteboard", () => ({ SessionWhiteboard: () => null }));
vi.mock("@/components/sessions/LocalVideo", () => ({ LocalVideo: () => null }));

import { MainStage } from "@/components/sessions/MainStage";

// ── the browser's half ─────────────────────────────────────────────────────
const requestFullscreen = vi.fn(async () => {});
const exitFullscreen = vi.fn(async () => {});

function setFullscreenSupport(enabled: boolean) {
  Object.defineProperty(document, "fullscreenEnabled", {
    configurable: true,
    value: enabled,
  });
}

/** Pretend the browser put `element` on the display, and tell the page. */
async function enterFullscreen(element: Element | null) {
  Object.defineProperty(document, "fullscreenElement", { configurable: true, value: element });
  await act(async () => {
    document.dispatchEvent(new Event("fullscreenchange"));
  });
}

function track(identity: string) {
  return { participant: { identity }, publication: { trackSid: `${identity}-sid` } };
}

function renderStage(props: { mode?: "video" | "screen" | "whiteboard"; isHost?: boolean } = {}) {
  return render(
    <NextIntlClientProvider locale="en" messages={MESSAGES} timeZone="UTC">
      <MainStage
        mode={props.mode ?? "video"}
        sessionMode="video"
        sessionId="s1"
        isHost={props.isHost ?? false}
      />
    </NextIntlClientProvider>
  );
}

const expandButton = () => screen.queryByRole("button", { name: STAGE.enterFullscreen });

beforeEach(() => {
  holder.camera = [];
  holder.screen = [];
  holder.isCameraEnabled = false;
  setFullscreenSupport(true);
  Object.defineProperty(document, "fullscreenElement", { configurable: true, value: null });
  Object.defineProperty(document, "exitFullscreen", {
    configurable: true,
    value: exitFullscreen,
  });
  Object.defineProperty(Element.prototype, "requestFullscreen", {
    configurable: true,
    writable: true,
    value: requestFullscreen,
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// ───────────────────────────────────────────────────────────────────────────
describe("when the control is offered", () => {
  it("appears over a shared screen", async () => {
    holder.screen = [track("s1:host")];
    renderStage();
    await act(async () => {});

    expect(expandButton()).toBeTruthy();
  });

  it("appears over a camera too", async () => {
    holder.camera = [track("s1:host")];
    renderStage();
    await act(async () => {});

    expect(expandButton()).toBeTruthy();
  });

  it("is there for a member, not only the host", async () => {
    // Expanding changes what one person sees and publishes nothing, so there
    // is no permission to check — unlike every other control in this room.
    holder.screen = [track("s1:host")];
    renderStage({ isHost: false });
    await act(async () => {});

    expect(expandButton()).toBeTruthy();
  });

  it("stays away from an empty stage", async () => {
    // Filling a display with "waiting for video" is not a feature.
    renderStage();
    await act(async () => {});

    expect(expandButton()).toBeNull();
  });

  it("stays away from the whiteboard", async () => {
    // An interactive canvas with its own zoom, and a close control already in
    // the same corner.
    holder.screen = [track("s1:host")];
    renderStage({ mode: "whiteboard" });
    await act(async () => {});

    expect(expandButton()).toBeNull();
  });

  it("is not rendered at all where the browser cannot do it", async () => {
    // iOS Safari: only a `<video>` element can go fullscreen. A control that
    // silently fails every time for a whole platform is worse than none.
    setFullscreenSupport(false);
    holder.screen = [track("s1:host")];
    renderStage();
    await act(async () => {});

    expect(expandButton()).toBeNull();
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe("what the control does", () => {
  it("puts the stage container on the display, not the video element", async () => {
    // The container is what carries the whiteboard, the placeholder and the
    // speaker overlay. Requesting it on the `<video>` alone would drop
    // everything drawn over it.
    holder.screen = [track("s1:host")];
    const { container } = renderStage();
    await act(async () => {});

    const button = expandButton()!;
    await act(async () => {
      fireEvent.click(button);
    });

    expect(requestFullscreen).toHaveBeenCalledTimes(1);
    const stage = container.querySelector("[class*='rounded-2xl'][class*='relative']");
    expect(requestFullscreen.mock.instances[0]).toBe(stage);
  });

  it("turns into a way back out once it is fullscreen", async () => {
    holder.screen = [track("s1:host")];
    const { container } = renderStage();
    await act(async () => {});

    const stage = container.querySelector("[class*='rounded-2xl'][class*='relative']");
    await enterFullscreen(stage);

    expect(expandButton()).toBeNull();
    const collapse = screen.getByRole("button", { name: STAGE.exitFullscreen });

    await act(async () => {
      fireEvent.click(collapse);
    });
    expect(exitFullscreen).toHaveBeenCalledTimes(1);
  });

  it("follows the browser when the viewer presses Escape", async () => {
    // Escape and the browser's own chrome both leave without going through the
    // button, so the event is the source of truth rather than a boolean the
    // component flips optimistically.
    holder.screen = [track("s1:host")];
    const { container } = renderStage();
    await act(async () => {});

    const stage = container.querySelector("[class*='rounded-2xl'][class*='relative']");
    await enterFullscreen(stage);
    expect(screen.getByRole("button", { name: STAGE.exitFullscreen })).toBeTruthy();

    await enterFullscreen(null); // Escape
    expect(expandButton()).toBeTruthy();
  });

  it("ignores a fullscreen that belongs to some other element", async () => {
    // A different element being fullscreen is not this stage being fullscreen,
    // and the label must not claim otherwise.
    holder.screen = [track("s1:host")];
    renderStage();
    await act(async () => {});

    await enterFullscreen(document.createElement("div"));

    expect(expandButton()).toBeTruthy();
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe("the copy exists in every locale", () => {
  it("carries both keys in en, es and fr", () => {
    for (const locale of ["en", "es", "fr"]) {
      const messages = JSON.parse(
        fs.readFileSync(path.join(REPO_ROOT, `locales/${locale}.json`), "utf8")
      );
      const stage = messages.liveSession.mainStage;
      expect(stage.enterFullscreen, `${locale} enterFullscreen`).toBeTruthy();
      expect(stage.exitFullscreen, `${locale} exitFullscreen`).toBeTruthy();
    }
  });

  it("keeps the three locales on the same set of keys for this block", () => {
    const keys = ["en", "es", "fr"].map((locale) =>
      Object.keys(
        JSON.parse(fs.readFileSync(path.join(REPO_ROOT, `locales/${locale}.json`), "utf8"))
          .liveSession.mainStage
      ).sort()
    );
    expect(keys[1]).toEqual(keys[0]);
    expect(keys[2]).toEqual(keys[0]);
  });

  it("does not ship the English string as a translation", () => {
    const read = (locale: string) =>
      JSON.parse(fs.readFileSync(path.join(REPO_ROOT, `locales/${locale}.json`), "utf8"))
        .liveSession.mainStage;
    expect(read("es").enterFullscreen).not.toBe(read("en").enterFullscreen);
    expect(read("fr").enterFullscreen).not.toBe(read("en").enterFullscreen);
  });
});
