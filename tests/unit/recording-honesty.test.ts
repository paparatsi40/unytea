import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

/**
 * Nothing in this product produces a recording.
 *
 * `startRecording` in lib/jobs/livekit-webhook.ts still carries `TODO:
 * Implement actual Egress API call`, so the Egress API is never invoked, no
 * `egress_started`/`egress_ended` webhook ever arrives, no `Recording` row is
 * written and `MentorSession.recordingUrl` is null on every row that has ever
 * existed. The in-room control is disabled and labelled unavailable.
 *
 * That has not stopped the promise from growing back. It has been pruned in
 * several passes and reappeared each time, because "recording" is the obvious
 * thing to mention next to a session and nothing pushed back. These tests are
 * that push-back.
 *
 * The rule they enforce is not "never say recording". It is: **a surface may
 * only offer a recording behind a check that a file exists.** `recordingUrl`,
 * `recording?.url` or a variable derived from one. The recap built from the
 * host's notes is real and deliberately untouched — notes exist, the recap is a
 * template render over them, and nothing here should discourage that.
 *
 * The lists below may shrink. They must never grow.
 */

const REPO_ROOT = path.resolve(__dirname, "../..");

/** Comments explain intent; a structural assertion must not read one as code. */
function code(relativePath: string): string {
  return fs
    .readFileSync(path.join(REPO_ROOT, relativePath), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

/**
 * The surfaces that offer a recording to a user. Every one was, at some point,
 * offering it unconditionally.
 */
const GATED_SURFACES: { file: string; what: string }[] = [
  { file: "components/sessions/PostSessionFlow.tsx", what: "the post-session next steps" },
  {
    file: "app/(dashboard)/dashboard/sessions/[sessionId]/page.tsx",
    what: "the session detail actions",
  },
  { file: "components/sessions/PublicSessionPage.tsx", what: "the public replay page" },
  { file: "components/community/SessionAnnouncementCard.tsx", what: "the feed announcement CTA" },
  { file: "app/(dashboard)/dashboard/agenda/AgendaPageClient.tsx", what: "the agenda list" },
  {
    file: "app/(dashboard)/dashboard/sessions/SessionsPageClient.tsx",
    what: "the sessions hub cards",
  },
  { file: "lib/jobs/session-recap.ts", what: "the recap posted to the feed" },
];

/** Anything that reads as "a recording is on its way" or "here is one". */
const OFFER =
  /watchRecording|watchReplay|recordingAvailable|createClip|addToCourse|recording\.watch/;

/** A check that a file exists. Either column, or a flag named for one. */
const GATE = /recordingUrl|recording\?\.url|recording\.url|hasRecording|hasRecordingFile/;

describe("a recording is only offered when one exists", () => {
  for (const { file, what } of GATED_SURFACES) {
    it(`${what} checks for a file (${file})`, () => {
      const source = code(file);
      if (!OFFER.test(source)) return; // nothing offered here any more: fine.
      expect(source, `${file} offers a recording without ever checking for one`).toMatch(GATE);
    });
  }
});

/** The columns that actually prove a file exists. No aliases, no flags. */
const URL_COLUMN = /recordingUrl|recording\?\.url|recording\.url/;

/**
 * A gate that is not derived from a URL is not a gate.
 *
 * The check above only proves a gating token appears somewhere in the file,
 * which a mutation caught out: rewriting `const hasRecording =
 * !!session.recordingUrl` to `const hasRecording = true` left every button
 * ungated and still satisfied it. So wherever a surface gates on a named flag
 * rather than on the column directly, that flag's own definition has to trace
 * back to the column.
 *
 * This is also what found the live one. SessionAnnouncementCard took a
 * server-sent `hasRecording` boolean and a `recordingUrl` as two separate
 * inputs; only the href checked the URL, so a true flag with a null URL
 * rendered a "Watch recording" button pointing at the room instead.
 */
describe("gating flags are derived from a real URL", () => {
  const ALIASES = ["hasRecordingFile", "hasRecording"];

  for (const { file } of GATED_SURFACES) {
    const source = code(file);
    for (const alias of ALIASES) {
      if (!source.includes(`${alias} =`)) continue;

      it(`${alias} in ${file} is defined from the recording URL`, () => {
        const at = source.indexOf(`${alias} =`);
        const lineEnd = source.indexOf("\n", at);
        const definition = source.slice(at, lineEnd === -1 ? undefined : lineEnd);

        expect(definition, `${alias} is gating on something other than a file`).toMatch(URL_COLUMN);
      });
    }
  }
});

/**
 * A spinner is a claim that work is in progress. No work is in progress, so a
 * loading indicator next to recording copy is a lie told in animation — and it
 * survived the pass that fixed the words directly above it.
 */
describe("no surface animates a recording that is not being made", () => {
  // RecordingsTabView was deleted with the library's Recordings tab when
  // recording was withdrawn — the ratchet shrinks.
  const NO_SPINNER = ["components/sessions/PostSessionFlow.tsx"];

  for (const file of NO_SPINNER) {
    it(`${file} shows no spinner`, () => {
      expect(code(file)).not.toMatch(/animate-spin/);
    });
  }
});

/**
 * The recap is the honest half and must stay that way in both directions: it is
 * built from notes, so it may not be gated on a recording, and it may not smuggle
 * a replay link out to the feed either.
 */
describe("the recap stays honest in both directions", () => {
  const source = code("lib/jobs/session-recap.ts");

  it("still builds from the host's notes", () => {
    expect(source).toMatch(/notes\?\.summary/);
    expect(source).toMatch(/keyTakeaways/);
  });

  it("does not put a replay link in the feed without a file", () => {
    // The template used to end with an unconditional "[Watch Recording →]",
    // which meant every recap ever posted promised a video to the whole
    // community.
    const link = source.indexOf("Watch Recording");
    if (link === -1) return;
    expect(source.slice(0, link)).toMatch(/session\.recordingUrl/);
  });
});

/**
 * Known-remaining mentions, with the reason each is allowed. A ratchet: this
 * list may shrink, never grow. An entry with no reason is just the bug with an
 * exemption stapled to it.
 */
const ALLOWED_UNGATED: Record<string, string> = {
  "components/community/CommunitySessionsView.tsx":
    "Replay counts and filters are computed from rows with a recordingUrl, so " +
    "they read zero and the lists are empty rather than promising anything.",
  "lib/email.ts": "The Watch Recording button is behind `data.recordingLink`.",
  "lib/jobs/autopilot.ts":
    "The capture step is behind `recording?.status === READY || recordingUrl`.",
  "lib/jobs/livekit-webhook.ts":
    "The egress handlers themselves, now marked DORMANT. They are the code that " +
    "would create a recording; they are not a promise to a user.",
  "components/sessions/RecordingDistributionActions.tsx":
    "Receives `recordingUrl` as a prop and is only rendered by surfaces that have one.",
  "components/public-content/CreateSocialClipDialog.tsx":
    "Receives `recordingUrl` as a prop; its only entry points are now gated on it.",
};

describe("the ratchet", () => {
  it("lists no file that has since been cleaned up", () => {
    // An exemption for a file that no longer needs one is stale, and a stale
    // exemption is how the next regression gets waved through.
    const stale = Object.keys(ALLOWED_UNGATED).filter((file) => {
      const full = path.join(REPO_ROOT, file);
      return !fs.existsSync(full) || !/record/i.test(fs.readFileSync(full, "utf8"));
    });
    expect(stale).toEqual([]);
  });

  it("does not exempt anything without a stated reason", () => {
    for (const [file, reason] of Object.entries(ALLOWED_UNGATED)) {
      expect(reason.length, `${file} has no real reason`).toBeGreaterThan(40);
    }
  });
});

/**
 * The actions that need a video file. Each one hard-fails without it, so an
 * entry point that does not check first can only ever produce an error toast.
 */
describe("actions that require a recorded file say so", () => {
  const source = code("app/actions/session-course.ts");

  it("all three still refuse to run without one", () => {
    // If one of these ever stops checking, the UI gate above stops being the
    // thing that protects the user and starts being the only thing.
    const refusals =
      source.match(/Recording not available yet|recording not available yet/gi) ?? [];
    expect(refusals.length).toBeGreaterThanOrEqual(3);
  });

  it("publishing to the library is a replay publisher, not a notes publisher", () => {
    // Worth pinning because the name suggests otherwise: it writes a VIDEO
    // resource whose externalUrl is the recording. The notes only supply a
    // description fallback.
    const start = source.indexOf("createResourceFromSession");
    const body = source.slice(start);
    expect(body).toMatch(/type: "VIDEO"/);
    expect(body).toMatch(/externalUrl: videoUrl/);
  });
});

/**
 * Recording is withdrawn, not delayed (2026-08-18).
 *
 * The previous pass replaced false promises with "coming soon", which was true
 * at the time. It is not any more: saying a withdrawn feature is on its way is
 * the same over-promise in a quieter voice, and it is harder to spot precisely
 * because it sounds honest.
 *
 * The backend scaffolding stays — dormant, commented, and unreachable — so this
 * checks what a user can see, not what exists.
 */
describe("nothing tells a user that recording is coming", () => {
  const COMING =
    /coming soon|isn't available yet|is not available yet|will appear once|próximamente|aún no está disponible|bientôt disponible|pas encore disponible/i;

  it("no locale promises a recording", () => {
    // Walks the parsed catalog rather than raw lines, so a value is judged
    // whole and a key whose *name* is about recording is judged by what it says.
    const RECORDING = /record|grabaci|enregistrement|replay/i;

    for (const locale of ["en", "es", "fr"]) {
      const catalog: unknown = JSON.parse(
        fs.readFileSync(path.join(REPO_ROOT, `locales/${locale}.json`), "utf8")
      );
      const offenders: string[] = [];

      const walk = (node: unknown, keyPath: string) => {
        if (typeof node === "string") {
          if ((RECORDING.test(node) || RECORDING.test(keyPath)) && COMING.test(node)) {
            offenders.push(`${keyPath}: ${node}`);
          }
          return;
        }
        if (Array.isArray(node)) {
          node.forEach((item, index) => walk(item, `${keyPath}[${index}]`));
          return;
        }
        if (node && typeof node === "object") {
          for (const [key, value] of Object.entries(node)) walk(value, `${keyPath}.${key}`);
        }
      };
      walk(catalog, locale);

      expect(offenders, `locales/${locale}.json still promises recording`).toEqual([]);
    }
  });

  it("the surfaces that carried the coming-soon copy are gone", () => {
    // Each of these rendered a panel, tab or control whose only content was an
    // explanation that recording had not arrived.
    const removed = [
      "components/dashboard/library/RecordingsTab.tsx",
      "components/dashboard/library/RecordingsTabView.tsx",
    ];
    for (const file of removed) {
      expect(fs.existsSync(path.join(REPO_ROOT, file)), `${file} is back`).toBe(false);
    }
  });

  it("the room has no recording control", () => {
    // A permanently disabled button in the host's main toolbar advertises the
    // feature every session.
    const source = code("components/sessions/VideoRoomUI.tsx");
    expect(source).not.toMatch(/recordingComingSoon|header\.recordingBadge/);
  });

  it("the post-session flow has no recording card", () => {
    const source = code("components/sessions/PostSessionFlow.tsx");
    expect(source).not.toMatch(/recording\.comingSoonTitle|recording\.readyTitle/);
  });

  it("the session detail has no recording tab", () => {
    const source = code("app/(dashboard)/dashboard/sessions/[sessionId]/page.tsx");
    expect(source).not.toMatch(/value="recording"|tabs\.recording/);
  });

  it("the scaffolding that stays is marked dormant", () => {
    // Kept deliberately, so the next reader needs to know it is not a gap.
    for (const file of [
      "app/actions/recording.ts",
      "lib/jobs/recording.ts",
      "lib/jobs/livekit-webhook.ts",
    ]) {
      const source = fs.readFileSync(path.join(REPO_ROOT, file), "utf8");
      expect(source, `${file} is unreachable but unlabelled`).toMatch(/DORMANT/);
    }
  });
});
