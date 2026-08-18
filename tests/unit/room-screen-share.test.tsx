// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import fs from "node:fs";
import path from "node:path";
import { render, screen, cleanup } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { Track } from "livekit-client";

/**
 * The host shared their screen and the guest kept staring at "waiting for
 * video".
 *
 * Not a subscription problem: `autoSubscribe` defaults to true, nothing sets it
 * otherwise, and `useTracks([Track.Source.ScreenShare])` returns remote
 * publications as readily as local ones. The guest had the track.
 *
 * The stage simply never asked for it. `VideoRoomUI` passed
 * `mode={isScreenShareEnabled ? "screen" : stageMode}`, and
 * `isScreenShareEnabled` comes from `useLocalParticipant()` — it is the local
 * participant's *publish* flag, true only for the person doing the sharing.
 * Every other participant fell through to the camera branch, which for someone
 * with no camera up is the placeholder. The screen was decoded and discarded
 * one line before it would have been drawn.
 *
 * These render the stage from a guest's point of view: a local participant who
 * publishes nothing, and a remote screen-share track in the room.
 */

const REPO_ROOT = path.resolve(__dirname, "../..");
const MESSAGES = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, "locales/en.json"), "utf8"));

// ── the room, as the guest sees it ─────────────────────────────────────────
const GUEST = { identity: "sess-1:guest", name: "Guest" };

interface FakeTrackRef {
  participant: { identity: string };
  publication: { trackSid: string };
  source: Track.Source;
}

/** Camera tracks currently in the room, from every participant. */
let cameraTracks: FakeTrackRef[] = [];
/** Screen-share tracks currently in the room, from every participant. */
let screenTracks: FakeTrackRef[] = [];
/** What the *local* participant is publishing. A guest publishes nothing. */
let localCameraEnabled = false;

function trackRef(identity: string, source: Track.Source): FakeTrackRef {
  return { participant: { identity }, publication: { trackSid: `${identity}-${source}` }, source };
}

vi.mock("@livekit/components-react", () => ({
  useTracks: (sources: Track.Source[]) =>
    sources.includes(Track.Source.ScreenShare) ? screenTracks : cameraTracks,
  useLocalParticipant: () => ({
    localParticipant: {
      identity: GUEST.identity,
      name: GUEST.name,
      isCameraEnabled: localCameraEnabled,
      isMicrophoneEnabled: false,
      // The publish flag that used to drive the stage. It is false for a guest
      // no matter who else is sharing, which is the whole bug.
      isScreenShareEnabled: false,
      getTrackPublication: () => (localCameraEnabled ? { track: { kind: "video" } } : undefined),
    },
  }),
  VideoTrack: ({ trackRef: ref }: { trackRef: FakeTrackRef }) =>
    React.createElement("div", {
      "data-testid": `video-${ref.source}`,
      "data-identity": ref.participant.identity,
    }),
  ParticipantTile: ({ trackRef: ref }: { trackRef: FakeTrackRef }) =>
    React.createElement("div", {
      "data-testid": "strip-tile",
      "data-identity": ref.participant.identity,
    }),
}));

// Excalidraw ships CSS and a dynamic import; neither survives a unit run, and
// neither is what these tests are about.
vi.mock("@/components/sessions/SessionWhiteboard", () => ({
  SessionWhiteboard: () => React.createElement("div", { "data-testid": "whiteboard" }),
}));
vi.mock("@/components/sessions/LocalVideo", () => ({
  LocalVideo: () => React.createElement("div", { "data-testid": "local-video" }),
}));

import { MainStage } from "@/components/sessions/MainStage";
import type { SessionMode } from "@/components/sessions/ModeSwitcher";

function renderStage(mode: SessionMode = "video", sessionMode: "video" | "audio" = "video") {
  return render(
    <NextIntlClientProvider locale="en" messages={MESSAGES}>
      <MainStage mode={mode} sessionMode={sessionMode} sessionId="sess-1" />
    </NextIntlClientProvider>
  );
}

const WAITING_PLACEHOLDER = MESSAGES.liveSession.mainStage.noCameraTitle;

beforeEach(() => {
  cameraTracks = [];
  screenTracks = [];
  localCameraEnabled = false;
});

afterEach(() => cleanup());

// ───────────────────────────────────────────────────────────────────────────
describe("a guest while the host shares their screen", () => {
  it("renders the host's screen instead of the waiting placeholder", () => {
    // The guest's own mode is "video" — nothing local ever switches it.
    screenTracks = [trackRef("sess-1:host", Track.Source.ScreenShare)];

    renderStage("video");

    const shown = screen.getByTestId(`video-${Track.Source.ScreenShare}`);
    expect(shown.getAttribute("data-identity")).toBe("sess-1:host");
    expect(screen.queryByText(WAITING_PLACEHOLDER)).toBeNull();
  });

  it("still shows the host's screen when the guest has their own camera on", () => {
    // The camera branch used to win outright whenever a local camera existed.
    localCameraEnabled = true;
    cameraTracks = [trackRef(GUEST.identity, Track.Source.Camera)];
    screenTracks = [trackRef("sess-1:host", Track.Source.ScreenShare)];

    renderStage("video");

    expect(screen.queryByTestId(`video-${Track.Source.ScreenShare}`)).not.toBeNull();
    expect(screen.queryByTestId("local-video")).toBeNull();
  });

  it("keeps every camera in the strip while the screen holds the stage", () => {
    // No camera is on the main stage during a share, so none should be filtered
    // out of the strip — the old filter dropped one tile in exactly the moment
    // you most want to see who is talking.
    cameraTracks = [
      trackRef(GUEST.identity, Track.Source.Camera),
      trackRef("sess-1:host", Track.Source.Camera),
    ];
    screenTracks = [trackRef("sess-1:host", Track.Source.ScreenShare)];

    renderStage("video");

    const identities = screen
      .getAllByTestId("strip-tile")
      .map((tile) => tile.getAttribute("data-identity"));
    expect(identities).toEqual([GUEST.identity, "sess-1:host"]);
  });

  it("returns to camera by itself when the host stops sharing", () => {
    screenTracks = [trackRef("sess-1:host", Track.Source.ScreenShare)];
    const { rerender } = renderStage("video");
    expect(screen.queryByTestId(`video-${Track.Source.ScreenShare}`)).not.toBeNull();

    // The publication goes away; nothing else changes.
    screenTracks = [];
    cameraTracks = [trackRef("sess-1:host", Track.Source.Camera)];
    rerender(
      <NextIntlClientProvider locale="en" messages={MESSAGES}>
        <MainStage mode="video" sessionMode="video" sessionId="sess-1" />
      </NextIntlClientProvider>
    );

    expect(screen.queryByTestId(`video-${Track.Source.ScreenShare}`)).toBeNull();
    expect(screen.getByTestId(`video-${Track.Source.Camera}`).getAttribute("data-identity")).toBe(
      "sess-1:host"
    );
  });

  it("takes the stage in an audio-only session too", () => {
    // Screen share is the one visual an audio session can still carry.
    screenTracks = [trackRef("sess-1:host", Track.Source.ScreenShare)];

    renderStage("video", "audio");

    expect(screen.queryByTestId(`video-${Track.Source.ScreenShare}`)).not.toBeNull();
  });
});

describe("the host's own stage", () => {
  it("shows their screen without needing the local publish flag", () => {
    // `useTracks` reports local publications as well, so the same derivation
    // covers the sharer. `isScreenShareEnabled` is no longer consulted.
    screenTracks = [trackRef(GUEST.identity, Track.Source.ScreenShare)];

    renderStage("video");

    expect(
      screen.getByTestId(`video-${Track.Source.ScreenShare}`).getAttribute("data-identity")
    ).toBe(GUEST.identity);
  });

  it("prefers its own share when two people are sharing", () => {
    screenTracks = [
      trackRef("sess-1:host", Track.Source.ScreenShare),
      trackRef(GUEST.identity, Track.Source.ScreenShare),
    ];

    renderStage("video");

    expect(
      screen.getByTestId(`video-${Track.Source.ScreenShare}`).getAttribute("data-identity")
    ).toBe(GUEST.identity);
  });
});

describe("the whiteboard still outranks a screen share", () => {
  it("does not yank a participant out of the whiteboard when someone shares", () => {
    // Opening the whiteboard is a deliberate act; a share arriving must not
    // close it under them.
    screenTracks = [trackRef("sess-1:host", Track.Source.ScreenShare)];

    renderStage("whiteboard");

    expect(screen.queryByTestId("whiteboard")).not.toBeNull();
    expect(screen.queryByTestId(`video-${Track.Source.ScreenShare}`)).toBeNull();
  });
});

describe("with nothing published", () => {
  it("still shows the waiting placeholder", () => {
    // The fix must not turn the empty stage into a blank screen branch.
    renderStage("video");

    expect(screen.queryByText(WAITING_PLACEHOLDER)).not.toBeNull();
  });

  it("shows the no-screen empty state when a viewer explicitly picked screen", () => {
    renderStage("screen");

    expect(screen.queryByText(MESSAGES.liveSession.mainStage.noScreenTitle)).not.toBeNull();
  });
});
