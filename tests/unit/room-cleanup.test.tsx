// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { render, cleanup, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";

import { resolveDisplayName } from "@/lib/user-display-name";
import { roleFromMetadata } from "@/lib/livekit/permissions";

/**
 * Three things found in the room, all of them display or permission.
 *
 *   the notes panel   `updateSessionNotes` authorises the session's mentor or
 *                     mentee and nobody else, and the panel rendered for
 *                     everyone — so a community member's autosave was refused
 *                     every few seconds and production filled with
 *                     `[action:updateSessionNotes] Unauthorized`. The panel was
 *                     offering an editor the server would never take a write
 *                     from.
 *
 *   the host, twice   SPEAKERS was `p.permissions.canPublish`, and the host has
 *                     it. Two people in a room drew three rows.
 *
 *   the host, blank   `hostName` and `hostAvatar` are props `VideoRoomUI` has
 *                     always declared and nothing has ever passed — the same
 *                     habit that produced "0 attending" — so both took their
 *                     defaults and the room said "Host:" with nothing after it.
 */

const REPO_ROOT = path.resolve(__dirname, "../..");
const MESSAGES = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, "locales/en.json"), "utf8"));
const ROOM = MESSAGES.liveSession.room;

// ── the room, mounted ──────────────────────────────────────────────────────
const holder = vi.hoisted(() => ({ room: null as unknown, participants: [] as unknown[] }));

vi.mock("@livekit/components-react", () => ({
  useRoomContext: () => holder.room,
  useParticipants: () => holder.participants,
  useLocalParticipant: () => ({
    localParticipant: (holder.room as { localParticipant: unknown }).localParticipant,
    isCameraEnabled: false,
    isMicrophoneEnabled: false,
    isScreenShareEnabled: false,
  }),
}));
vi.mock("@/components/sessions/MainStage", () => ({ MainStage: () => null }));
vi.mock("@/components/sessions/SessionChat", () => ({ SessionChat: () => null }));
vi.mock("@/components/sessions/SessionNotesEditor", () => ({
  SessionNotesEditor: () => <div data-testid="notes-editor" />,
}));
vi.mock("@/components/live-session/LivePoll", () => ({
  LivePoll: () => null,
  PollCreator: () => null,
}));
vi.mock("@/hooks/useWhiteboardChannel", () => ({
  useWhiteboardChannel: () => ({
    isOpen: false,
    elements: [],
    revision: 0,
    publishMode: vi.fn(),
    publishElements: vi.fn(),
    resetSentVersions: vi.fn(),
  }),
}));
vi.mock("@/hooks/useSessionDataChannel", () => ({
  useSessionDataChannel: () => ({
    raisedHands: [],
    hasRaisedHand: false,
    toggleRaiseHand: vi.fn(),
    inviteSpeaker: vi.fn(),
    dismissHand: vi.fn(),
    activePolls: [],
    createPoll: vi.fn(),
    votePoll: vi.fn(),
    closePoll: vi.fn(),
    reactions: [],
    sendReaction: vi.fn(),
    muteAll: vi.fn(),
    muteAllSignal: 0,
    invitedToSpeak: false,
    clearSpeakerInvite: vi.fn(),
  }),
}));
vi.mock("@/app/actions/livekit", () => ({ inviteToSpeak: vi.fn(async () => ({ success: true })) }));

import { VideoRoomUI } from "@/components/sessions/VideoRoomUI";

function person(identity: string, options: { canPublish?: boolean; role?: string } = {}) {
  return {
    identity,
    name: identity,
    permissions: { canPublish: options.canPublish ?? false, canPublishData: true },
    metadata: options.role ? JSON.stringify({ role: options.role }) : undefined,
  };
}

function renderRoom(options: { isHost?: boolean; hostName?: string } = {}) {
  holder.room = {
    state: "connected",
    localParticipant: {
      identity: "s1:me",
      name: "Me",
      permissions: { canPublish: options.isHost ?? false, canPublishData: true },
      publishData: vi.fn(async () => {}),
      setMicrophoneEnabled: vi.fn(async () => {}),
    },
    on: vi.fn(),
    off: vi.fn(),
    registerTextStreamHandler: vi.fn(),
    unregisterTextStreamHandler: vi.fn(),
  };
  return render(
    <NextIntlClientProvider locale="en" messages={MESSAGES} timeZone="UTC">
      <VideoRoomUI
        sessionId="s1"
        sessionMode="video"
        isHost={options.isHost ?? false}
        hostName={options.hostName ?? "Ada Lovelace"}
      />
    </NextIntlClientProvider>
  );
}

afterEach(() => {
  cleanup();
  holder.participants = [];
  vi.clearAllMocks();
});

// ───────────────────────────────────────────────────────────────────────────
describe("the notes panel belongs to the host", () => {
  it("is not rendered for a member", () => {
    // Not disabled — absent. The action would refuse every write, so an editor
    // here is a promise the server does not keep.
    renderRoom({ isHost: false });

    expect(screen.queryByTestId("notes-editor")).toBeNull();
    expect(screen.queryByText(ROOM.notesPanel.title)).toBeNull();
  });

  it("is still there for the host", () => {
    renderRoom({ isHost: true });

    expect(screen.getByTestId("notes-editor")).toBeTruthy();
    expect(screen.getByText(ROOM.notesPanel.title)).toBeTruthy();
  });

  it("does not leave the member a tab that opens nothing", () => {
    const { container } = renderRoom({ isHost: false });
    const tabs = [...container.querySelectorAll("button")].filter(
      (node) => node.getAttribute("title") === ROOM.panels.notes
    );
    expect(tabs).toHaveLength(0);
  });

  it("keeps that tab for the host", () => {
    const { container } = renderRoom({ isHost: true });
    const tabs = [...container.querySelectorAll("button")].filter(
      (node) => node.getAttribute("title") === ROOM.panels.notes
    );
    expect(tabs).toHaveLength(1);
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe("the host is listed once", () => {
  it("does not repeat the host under speakers", () => {
    // The host publishes, so `canPublish` alone put them in both sections.
    holder.participants = [
      person("s1:host", { canPublish: true, role: "host" }),
      person("s1:member"),
    ];
    renderRoom({ isHost: false, hostName: "Ada Lovelace" });

    expect(screen.getAllByText("Ada Lovelace")).toHaveLength(1);
    // The host's participant row is the one that must not appear again.
    expect(screen.queryByText("s1:host")).toBeNull();
  });

  it("still lists a promoted speaker, who is not the host", () => {
    // `canPublish` answers "may they talk"; the role answers "are they running
    // this". Filtering on the first would have hidden this person too.
    holder.participants = [
      person("s1:host", { canPublish: true, role: "host" }),
      person("s1:speaker", { canPublish: true, role: "speaker" }),
    ];
    renderRoom({ isHost: false });

    expect(screen.getByText("s1:speaker")).toBeTruthy();
  });

  it("counts two people as two", () => {
    holder.participants = [
      person("s1:host", { canPublish: true, role: "host" }),
      person("s1:member"),
    ];
    renderRoom({ isHost: false });

    expect(screen.getByText("2 attending")).toBeTruthy();
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe("the host has a name", () => {
  it("shows it in the header and in the host row", () => {
    renderRoom({ isHost: false, hostName: "Ada Lovelace" });

    expect(screen.getByText(`Host: Ada Lovelace`)).toBeTruthy();
    expect(screen.getByText("Ada Lovelace")).toBeTruthy();
  });

  it("never renders an empty one", () => {
    // An account with no name of any kind. The circle used to render
    // `"".charAt(0)` — nothing at all inside an orange dot.
    renderRoom({ isHost: false, hostName: "" });

    expect(screen.getByText(`Host: ${ROOM.participants.hostFallback}`)).toBeTruthy();
    expect(screen.getByText(ROOM.participants.hostFallback)).toBeTruthy();
  });

  it("is carried from the page to the room", () => {
    // The props existed the whole time; nothing passed them.
    const room = fs.readFileSync(path.join(REPO_ROOT, "components/sessions/VideoRoom.tsx"), "utf8");
    const page = fs.readFileSync(
      path.join(REPO_ROOT, "app/(dashboard)/dashboard/sessions/[sessionId]/room/page.tsx"),
      "utf8"
    );
    expect(room).toMatch(/hostName=\{hostName\}/);
    expect(room).toMatch(/hostAvatar=\{hostAvatar\}/);
    expect(page).toMatch(/hostName=\{resolveDisplayName\(videoSession\.mentor\)\}/);
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe("what to call somebody", () => {
  it("prefers the name they set", () => {
    expect(resolveDisplayName({ name: "Ada", firstName: "A", username: "ada" })).toBe("Ada");
  });

  it("composes a first and last name when there is no name", () => {
    expect(resolveDisplayName({ firstName: "Ada", lastName: "Lovelace" })).toBe("Ada Lovelace");
  });

  it("does not produce a stray space from half a name", () => {
    // `${first} ${last}` with one half missing yields " Lovelace", which is not
    // empty and would beat a perfectly good username.
    expect(resolveDisplayName({ lastName: "Lovelace", username: "ada" })).toBe("Lovelace");
    expect(resolveDisplayName({ firstName: "  ", username: "ada" })).toBe("ada");
  });

  it("falls back to the username", () => {
    expect(resolveDisplayName({ username: "ada" })).toBe("ada");
  });

  it("returns nothing rather than inventing a word", () => {
    // The fallback is copy: it differs by surface and has to be translated.
    expect(resolveDisplayName({})).toBe("");
    expect(resolveDisplayName(null)).toBe("");
    expect(resolveDisplayName({ name: "   " })).toBe("");
  });
});

describe("reading the role off the token", () => {
  it("finds the host", () => {
    expect(roleFromMetadata(JSON.stringify({ role: "host" }))).toBe("host");
  });

  it("shrugs at metadata it cannot read", () => {
    expect(roleFromMetadata(undefined)).toBeNull();
    expect(roleFromMetadata("not json")).toBeNull();
    expect(roleFromMetadata(JSON.stringify({ role: "emperor" }))).toBeNull();
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe("nobody is called Unknown", () => {
  it("is gone from the two surfaces that still said it", () => {
    for (const file of ["app/actions/reactions.ts", "app/[locale]/c/[slug]/page.tsx"]) {
      const source = fs
        .readFileSync(path.join(REPO_ROOT, file), "utf8")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/^\s*\/\/.*$/gm, "");
      expect(source, file).not.toMatch(/"Unknown"/);
      expect(source, file).toMatch(/resolveDisplayName\(/);
    }
  });

  it("has a translated word for it in all three locales", () => {
    for (const locale of ["en", "es", "fr"]) {
      const messages = JSON.parse(
        fs.readFileSync(path.join(REPO_ROOT, `locales/${locale}.json`), "utf8")
      );
      expect(messages.liveSession.room.participants.hostFallback, locale).toBeTruthy();
      expect(messages.community.landing.stats.anonymousMember, locale).toBeTruthy();
      expect(messages.dashboard.communityAdmin.reactions.anonymous, locale).toBeTruthy();
    }
  });

  it("does not ship the English word as a translation", () => {
    const read = (locale: string) =>
      JSON.parse(fs.readFileSync(path.join(REPO_ROOT, `locales/${locale}.json`), "utf8"));
    for (const locale of ["es", "fr"]) {
      expect(read(locale).liveSession.room.participants.hostFallback).not.toBe(
        read("en").liveSession.room.participants.hostFallback
      );
      expect(read(locale).community.landing.stats.anonymousMember).not.toBe(
        read("en").community.landing.stats.anonymousMember
      );
    }
  });
});
