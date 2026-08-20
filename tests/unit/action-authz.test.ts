import { describe, it, expect, vi, beforeEach } from "vitest";
import fs from "node:fs";
import path from "node:path";

/**
 * H9 — the authorization harness.
 *
 * Enumerates every export of every `"use server"` module and asserts each one is
 * either on the explicit public allowlist below, carrying its justification, or
 * rejects an anonymous caller.
 *
 * This is what makes the SEC-02 fix self-enforcing. A new ungated action — or an
 * existing one quietly downgraded to `auth: "public"` — fails the build here
 * rather than shipping. The ESLint rule `unytea/no-bare-server-action` stops a
 * bare export; this stops a wrapped-but-open one.
 */

// Heavy externals pulled in transitively by the action modules. lib/openai.ts in
// particular throws at module load when OPENAI_API_KEY is absent.
vi.mock("@/lib/openai", () => ({
  openai: { chat: { completions: { create: vi.fn() } } },
  moderateContent: vi.fn(),
  generateChatCompletion: vi.fn(),
  AI_CONFIG: { model: "test", temperature: 0, maxTokens: 100, systemPrompt: "" },
}));
vi.mock("livekit-server-sdk", () => ({
  AccessToken: class {
    metadata = "";
    addGrant() {}
    async toJwt() {
      return "test.jwt.token";
    }
  },
  WebhookReceiver: class {
    receive() {
      return {};
    }
  },
  // The token issuer also reaches for the room API now, to move a promoted
  // member's grant on a connection that is already open.
  RoomServiceClient: class {
    async updateParticipant() {
      return {};
    }
  },
  EgressStatus: {},
}));
vi.mock("pusher", () => ({
  default: class {
    trigger() {}
    authorizeChannel() {}
  },
}));
vi.mock("@/lib/push", () => ({ sendPushToUser: vi.fn(), pushTemplates: {} }));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("@/lib/rate-limit", () => ({
  rateLimiters: new Proxy(
    {},
    { get: () => ({ check: async () => ({ success: true, remaining: 99, resetTime: 0 }) }) }
  ),
  getIP: () => "127.0.0.1",
  getIdentifier: () => "test",
}));

import { auth } from "@/lib/auth";

/**
 * Actions that may run without an authenticated caller.
 *
 * Every entry is a deliberate decision, not an oversight. Adding one requires
 * editing this list, which is the point — it turns "this endpoint is open" into
 * a reviewable diff.
 */
const PUBLIC_ALLOWLIST: Record<string, string> = {
  logout:
    "Ending a session must work when the session is already expired, malformed or half-cleared — exactly the state a user reaches for the button in. Requiring a valid session to end one would fail closed precisely when it is needed. Reads and returns nothing; the worst an anonymous POST achieves is clearing cookies it does not have.",
  loadMoreCommunitiesAction:
    "Backs the anonymous /explore directory. Reads only communities that opted into discovery; returns no member data.",
  getCommunityWithSections:
    "Renders a community's public landing page. Returns presentation sections only, never member data.",
  getPublicSession:
    "Backs the public /s/[slug] session page. Gates recording.url behind a per-request membership check using the optional viewer identity.",
  getPublicSessionBySlug: "Legacy shape of getPublicSession, used by the same public page.",
  getPublicSessionsForSEO: "Feeds sitemap.xml. Returns slug and timestamps only.",
  getRelatedSessions: "Related-sessions rail on the public session page.",
  getRelatedCommunitiesHostingThisWeek:
    "Discovery rail on the public session page. Community-level data only.",
  getNextCommunitySession: "Next-session banner on the public community page.",
  getSessionNotesForPublic:
    "Notes for a session whose host set visibility to public; gated on that flag inside the handler.",
  verifyCertificate:
    "Credential verification by number — the point of a certificate is that a third party can check it. Returns only the fields already printed on it, never the holder's account.",
  trackClipShare:
    "Share-count telemetry from the public session page. Records no personal data and reads nothing back.",
  getLiveKitConnectionInfo:
    "Returns the public websocket URL and a configured boolean, both of which ship to the browser anyway.",
};

/**
 * Files that contain an inline `"use server"` closure rather than a module-level
 * directive. Those closures are endpoints too, but they are not exports, so the
 * ESLint rule and the export enumeration below cannot see them. Pinning the set
 * means a new one shows up as a failing test.
 *
 * Each was reviewed: all either check auth themselves or delegate to a gated action.
 */
const INLINE_SERVER_ACTION_FILES = [
  "app/(dashboard)/dashboard/c/[slug]/page.tsx",
  "app/(dashboard)/dashboard/communities/[communityId]/sessions/page.tsx",
  "app/[locale]/community/[slug]/page.tsx",
];

const APP_DIR = path.resolve(__dirname, "../../app");
const REPO_ROOT = path.resolve(__dirname, "../..");

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(entry.name)) out.push(p);
  }
  return out;
}

/** Read with line endings normalised, so CRLF files classify the same as LF ones. */
function readSource(file: string): string {
  return fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n");
}

/**
 * True only when "use server" is a directive prologue statement.
 *
 * A leading block or line comment before the directive is legal and used here
 * (resources.ts opens with a file header), so those are skipped.
 */
function hasModuleDirective(source: string): boolean {
  return /^(?:\s*(?:\/\/[^\n]*|\/\*[\s\S]*?\*\/))*\s*["']use server["']\s*;/.test(source);
}

/** An indented directive inside a function body — an inline server action. */
function hasInlineDirective(source: string): boolean {
  return /\n[ \t]+["']use server["']\s*;/.test(source);
}

const allFiles = walk(APP_DIR);
const serverModules = allFiles
  .filter((f) => hasModuleDirective(readSource(f)))
  .map((f) => path.relative(REPO_ROOT, f).split(path.sep).join("/"))
  .sort();

/** Statically pair each export with the `name` and `auth` its config declares. */
function parseActions(source: string) {
  const found: { exportName: string; declaredName: string | null; auth: string | null }[] = [];
  const re = /export\s+const\s+(\w+)\s*=\s*defineAction\s*\(/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source))) {
    const tail = source.slice(m.index, m.index + 900);
    found.push({
      exportName: m[1],
      declaredName: tail.match(/name:\s*"([^"]+)"/)?.[1] ?? null,
      auth: tail.match(/auth:\s*"(public|user|member|admin)"/)?.[1] ?? null,
    });
  }
  return found;
}

describe("H9 — Server Action authorization harness", () => {
  it("discovers the server action modules", () => {
    expect(serverModules.length).toBeGreaterThan(30);
  });

  describe("static structure", () => {
    it.each(serverModules)("%s: every export goes through defineAction", (rel) => {
      const source = readSource(path.resolve(REPO_ROOT, rel));
      // Mirrors the ESLint rule, so the guarantee survives even if lint is skipped.
      const bare = source.match(/^export\s+(?:async\s+)?function\s+\w+/gm) ?? [];
      expect(bare).toEqual([]);
    });

    it.each(serverModules)("%s: config name matches the exported symbol", (rel) => {
      const source = readSource(path.resolve(REPO_ROOT, rel));
      for (const a of parseActions(source)) {
        // A copy-pasted name would silently share another action's rate-limit bucket.
        expect(a.declaredName, `${rel} → ${a.exportName}`).toBe(a.exportName);
      }
    });

    it.each(serverModules)("%s: every action declares an auth level", (rel) => {
      const source = readSource(path.resolve(REPO_ROOT, rel));
      for (const a of parseActions(source)) {
        expect(a.auth, `${rel} → ${a.exportName}`).not.toBeNull();
      }
    });
  });

  /**
   * Row-level guards throw ForbiddenError. Nearly every handler wraps its body
   * in `try { ... } catch { return <generic failure> }`, so a guard called from
   * *inside* that try has its typed error swallowed: the write is still
   * prevented, but the seam never sees FORBIDDEN and the caller is told
   * something generic instead. Authorization must therefore run before any
   * error-swallowing.
   */
  describe("guards run before the handler's try block", () => {
    /**
     * Is line `i` the head of a `defineAction` handler?
     *
     * Two shapes, because prettier splits a signature that runs past
     * printWidth:
     *
     *     async (ctx, partnershipId: string) => {     one line
     *
     *     async (                                     split — `ctx` lands on
     *       ctx,                                      the following line
     *
     * Recognising only the first shape is what made this check report a false
     * offender: the walk below sailed past a split head and kept going until it
     * hit the `try {` of some earlier action in the same file.
     *
     * Deliberately not "any line that is `async (`". Handlers are full of inner
     * async arrows — `items.map(async (item) => …)`,
     * `prisma.$transaction(async (tx) => …)` — and treating one of those as the
     * head would stop the walk early and blind the check to a guard that really
     * is nested in a try. The context parameter is what identifies the handler,
     * so it has to be present either way.
     */
    function isHandlerHead(lines: string[], i: number): boolean {
      const line = lines[i].trim();
      if (/^async \(_?ctx\b/.test(line)) return true;
      if (line !== "async (") return false;
      return /^_?ctx\b/.test((lines[i + 1] ?? "").trim());
    }

    function guardsInsideTry(source: string): string[] {
      const offenders: string[] = [];
      const lines = source.split("\n");
      lines.forEach((line, index) => {
        if (!/^\s*await assert[A-Z]\w*\(/.test(line)) return;
        // Walk back to whichever comes first: the enclosing `try {` or the
        // handler's arrow head.
        for (let i = index - 1; i >= 0; i--) {
          const prev = lines[i].trim();
          if (prev === "try {") {
            offenders.push(`${index + 1}: ${line.trim()}`);
            return;
          }
          if (isHandlerHead(lines, i)) return;
        }
      });
      return offenders;
    }

    it.each(serverModules)("%s: no guard is nested inside a try", (rel) => {
      expect(guardsInsideTry(readSource(path.resolve(REPO_ROOT, rel)))).toEqual([]);
    });

    /**
     * The detector reads formatting, so formatting can break it. These fixtures
     * pin both halves of the fix: it must stop reporting the shape prettier
     * produces, and it must still catch the thing it exists to catch.
     */
    /**
     * Two actions, because one is not enough to reproduce the bug: the walk
     * only reports when it *finds* a `try {`, so a defeated walk in a file with
     * a single action simply runs off the top and reports nothing. The false
     * positive needs an earlier action with a try in it for the walk to land
     * on — which is exactly the shape of every real action module.
     */
    const SPLIT_SIGNATURE_GUARD_FIRST = [
      "export const first = defineAction(",
      '  { name: "first", auth: "member" },',
      "  async (ctx, id: string) => {",
      "    try {",
      "      return load(id);",
      "    } catch {",
      "      return null;",
      "    }",
      "  }",
      ");",
      "",
      "export const logMood = defineAction(",
      '  { name: "logMood", auth: "member" },',
      "  async (",
      "    ctx,",
      "    partnershipId: string,",
      "    mood: number,",
      "    notes?: string,",
      "  ) => {",
      "    await assertBuddyPartner(ctx, partnershipId);",
      "    try {",
      "      return { success: true };",
      "    } catch {",
      "      return { success: false };",
      "    }",
      "  }",
      ");",
    ].join("\n");

    const SPLIT_SIGNATURE_GUARD_INSIDE = [
      "export const logMood = defineAction(",
      '  { name: "logMood", auth: "member" },',
      "  async (",
      "    ctx,",
      "    partnershipId: string,",
      "    mood: number,",
      "    notes?: string,",
      "  ) => {",
      "    try {",
      "      await assertBuddyPartner(ctx, partnershipId);",
      "      return { success: true };",
      "    } catch {",
      "      return { success: false };",
      "    }",
      "  }",
      ");",
    ].join("\n");

    /**
     * An inner async arrow must not be mistaken for the handler's head.
     *
     * Two things have to line up for this to bite, and both are deliberate.
     * `async (` is alone on its line — the shape prettier gives a long inner
     * callback, and the only one confusable with a split handler signature.
     * And it sits *between* the `try {` and the guard, so a walk that stopped
     * there would never reach the try and would report nothing. Put the arrow
     * anywhere else and the fixture passes whatever the detector does.
     */
    const INNER_ARROW_THEN_GUARD_INSIDE = [
      "export const logMood = defineAction(",
      '  { name: "logMood", auth: "member" },',
      "  async (ctx, partnershipId: string) => {",
      "    try {",
      "      const rows = await Promise.all(",
      "        ids.map(",
      "          async (",
      "            id,",
      "          ) => {",
      "            return load(id);",
      "          },",
      "        ),",
      "      );",
      "      await assertBuddyPartner(ctx, partnershipId);",
      "      return rows;",
      "    } catch {",
      "      return [];",
      "    }",
      "  }",
      ");",
    ].join("\n");

    it("accepts a split signature whose guard runs before the try", () => {
      // The false positive. `async (` on its own line used to defeat the walk,
      // which then found an unrelated `try {` further up the file.
      expect(guardsInsideTry(SPLIT_SIGNATURE_GUARD_FIRST)).toEqual([]);
    });

    it("still catches a guard nested in a try under a split signature", () => {
      // The half that matters. A guard called from inside the try has its
      // ForbiddenError swallowed by the catch, so the seam never reports
      // FORBIDDEN and the caller is told something generic instead.
      expect(guardsInsideTry(SPLIT_SIGNATURE_GUARD_INSIDE)).toEqual([
        "10: await assertBuddyPartner(ctx, partnershipId);",
      ]);
    });

    it("is not blinded by an inner async arrow", () => {
      // `ids.map(async (` is not a handler head. If it were treated as one, the
      // walk would stop there and the nested guard below would go unreported —
      // which is how a fix for a false positive turns into a hole.
      expect(guardsInsideTry(INNER_ARROW_THEN_GUARD_INSIDE)).toEqual([
        "14: await assertBuddyPartner(ctx, partnershipId);",
      ]);
    });
  });

  describe("public allowlist", () => {
    const declaredPublic = serverModules.flatMap((rel) =>
      parseActions(readSource(path.resolve(REPO_ROOT, rel)))
        .filter((a) => a.auth === "public")
        .map((a) => a.exportName)
    );

    it("every public action is on the allowlist with a justification", () => {
      const undocumented = declaredPublic.filter((n) => !PUBLIC_ALLOWLIST[n]);
      expect(undocumented).toEqual([]);
    });

    it("the allowlist has no stale entries", () => {
      const stale = Object.keys(PUBLIC_ALLOWLIST).filter((n) => !declaredPublic.includes(n));
      expect(stale).toEqual([]);
    });

    it("every justification is a real sentence, not a placeholder", () => {
      for (const [name, why] of Object.entries(PUBLIC_ALLOWLIST)) {
        expect(why.length, name).toBeGreaterThan(30);
      }
    });

    it("keeps the public surface small", () => {
      // A tripwire, not a hard design limit: a jump here means someone opened up
      // a batch of endpoints and should be made to explain why.
      expect(declaredPublic.length).toBeLessThanOrEqual(15);
    });
  });

  describe("inline server action closures", () => {
    const inlineFiles = allFiles
      .filter((f) => {
        const src = readSource(f);
        return !hasModuleDirective(src) && hasInlineDirective(src);
      })
      .map((f) => path.relative(REPO_ROOT, f).split(path.sep).join("/"))
      .sort();

    it("only the reviewed files contain inline server actions", () => {
      expect(inlineFiles).toEqual([...INLINE_SERVER_ACTION_FILES].sort());
    });
  });

  describe("anonymous callers are rejected", () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue(null as never);
    });

    for (const rel of serverModules) {
      const source = readSource(path.resolve(REPO_ROOT, rel));
      const gated = parseActions(source).filter((a) => a.auth !== "public");
      if (gated.length === 0) continue;

      describe(rel, () => {
        it.each(gated.map((a) => a.exportName))(
          "%s rejects an unauthenticated caller",
          async (exportName) => {
            const mod = (await import(
              /* @vite-ignore */ "@/" + rel.replace(/^app\//, "app/").replace(/\.tsx?$/, "")
            )) as Record<string, unknown>;

            const action = mod[exportName];
            expect(typeof action, `${rel} → ${exportName} is not callable`).toBe("function");

            // The seam resolves identity before validating arguments, so calling
            // with none still exercises the auth gate.
            const result = await (action as (...a: unknown[]) => Promise<unknown>)();

            expect(
              result,
              `${exportName} returned a success-shaped value to an anonymous caller`
            ).toMatchObject({ success: false });
            expect(
              (result as { code: string }).code,
              `${exportName} failed for the wrong reason`
            ).toBe("UNAUTHORIZED");
          }
        );
      });
    }
  });
});
