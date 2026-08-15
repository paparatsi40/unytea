import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

/**
 * UX_REVIEW Tier 3, PROD-04 — icon-only controls had no accessible name.
 *
 * Roughly 260 buttons across the app against ~25 aria-labels. A button whose
 * only child is a lucide glyph is announced as "button" and nothing else: a
 * screen reader user hears the same word for Send, Delete and Close sitting
 * side by side in a chat composer.
 *
 * The scan below is the same one used to find them, kept as a test so a new
 * unlabelled icon button fails CI rather than shipping.
 */

const REPO_ROOT = path.resolve(__dirname, "../..");
const LOCALES = ["en", "es", "fr"] as const;

function read(relativePath: string): string {
  return fs.readFileSync(path.join(REPO_ROOT, relativePath), "utf8");
}

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (![".next", "node_modules"].includes(entry.name)) walk(p, out);
    } else if (entry.name.endsWith(".tsx")) out.push(p);
  }
  return out;
}

const FILES = [...walk(path.join(REPO_ROOT, "app")), ...walk(path.join(REPO_ROOT, "components"))];

function rel(file: string): string {
  return path.relative(REPO_ROOT, file).split(path.sep).join("/");
}

/** Component names imported from lucide-react in a given source file. */
function lucideNames(src: string): Set<string> {
  const names = new Set<string>();
  const re = /import\s*\{([^}]+)\}\s*from\s*["']lucide-react["']/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    for (const part of m[1].split(",")) {
      const name = part
        .trim()
        .split(/\s+as\s+/)
        .pop()
        ?.trim();
      if (name) names.add(name);
    }
  }
  return names;
}

interface Element {
  start: number;
  openTag: string;
  body: string;
}

/** Extract `<tag …>…</tag>` blocks, balancing nesting and JSX expressions. */
function elements(src: string, tag: string): Element[] {
  const found: Element[] = [];
  const escaped = tag.replace(".", "\\.");
  const open = new RegExp(`<${escaped}(?=\\s|>)`, "g");
  let m: RegExpExecArray | null;

  while ((m = open.exec(src))) {
    const start = m.index;
    let i = start;
    let depth = 0;
    let quote: string | null = null;
    let selfClosing = false;

    for (; i < src.length; i++) {
      const c = src[i];
      if (quote) {
        if (c === quote) quote = null;
        continue;
      }
      if (c === '"' || c === "'" || c === "`") quote = c;
      else if (c === "{") depth++;
      else if (c === "}") depth--;
      else if (c === ">" && depth === 0) {
        selfClosing = src[i - 1] === "/";
        break;
      }
    }

    const openTag = src.slice(start, i + 1);
    if (selfClosing) {
      found.push({ start, openTag, body: "" });
      continue;
    }

    let level = 1;
    let j = i + 1;
    const openRe = new RegExp(`<${escaped}(?=\\s|>)`, "g");
    const closeRe = new RegExp(`</${escaped}>`, "g");
    while (level > 0 && j < src.length) {
      openRe.lastIndex = j;
      closeRe.lastIndex = j;
      const nextOpen = openRe.exec(src);
      const nextClose = closeRe.exec(src);
      if (!nextClose) break;
      if (nextOpen && nextOpen.index < nextClose.index) {
        level++;
        j = nextOpen.index + 1;
      } else {
        level--;
        j = nextClose.index + `</${tag}>`.length;
      }
    }
    found.push({ start, openTag, body: src.slice(i + 1, j - `</${tag}>`.length) });
  }
  return found;
}

/** True when the button renders something a sighted user can read. */
function hasVisibleText(body: string, icons: Set<string>): boolean {
  for (const chunk of body
    .replace(/<[^>]*>/g, " ")
    .split(" ")
    .map((s) => s.trim())
    .filter(Boolean)) {
    if (/^\{\s*\/\*/.test(chunk)) continue;
    if (/^\{["'`]/.test(chunk)) return true;
    if (/^\{/.test(chunk)) {
      const inner = chunk.slice(1, -1);
      // Match the icon as a rendered element, not as a substring: a translation
      // key like "createDialog.typeVideo" contains the icon name "Video" and
      // would otherwise be mistaken for the icon itself.
      if (![...icons].some((n) => inner.includes(`<${n}`))) return true;
      continue;
    }
    if (/[A-Za-z0-9]/.test(chunk)) return true;
  }
  return false;
}

/**
 * Known and justified exceptions. Each is a deliberate decision, not an
 * oversight, and each states why — an unexplained entry here would just be the
 * bug with extra steps.
 */
const EXEMPT: Record<string, string> = {
  "components/pwa/PWAInstallPrompt.tsx":
    "Mounted in app/layout.tsx, the root layout, which has no NextIntlClientProvider — " +
    "useTranslations would throw. The whole component is English-only and needs the " +
    "provider question answered before any of it can be localized.",
  "components/dashboard/ShareableMetrics.tsx":
    "Dead component: nothing in app/ or components/ imports it, so labelling it " +
    "would be maintaining UI no user can reach. Reported for deletion instead.",
  "components/upload/ImageGallery.tsx":
    "Dead component: nothing in app/ or components/ imports it, so labelling it " +
    "would be maintaining UI no user can reach. Reported for deletion instead.",
};

function unnamedIconButtons(): string[] {
  const offenders: string[] = [];

  for (const file of FILES) {
    const relative = rel(file);
    if (EXEMPT[relative]) continue;

    const src = fs.readFileSync(file, "utf8");
    const icons = lucideNames(src);
    if (icons.size === 0) continue;

    for (const tag of ["button", "Button", "motion.button"]) {
      for (const el of elements(src, tag)) {
        const whole = el.openTag + el.body;
        if (![...icons].some((n) => whole.includes(`<${n}`))) continue;
        if (/aria-label\s*=|aria-labelledby\s*=|title\s*=/.test(el.openTag)) continue;
        if (hasVisibleText(el.body, icons)) continue;

        const line = src.slice(0, el.start).split("\n").length;
        offenders.push(`${relative}:${line}`);
      }
    }
  }
  return offenders;
}

describe("icon-only buttons expose an accessible name", () => {
  it("scans a realistic number of files", () => {
    // Guards the assertion below against passing because the walk found nothing.
    expect(FILES.length).toBeGreaterThan(200);
  });

  it("finds no unlabelled icon-only button", () => {
    expect(unnamedIconButtons()).toEqual([]);
  });

  it("every exemption states a reason", () => {
    for (const [file, reason] of Object.entries(EXEMPT)) {
      expect(fs.existsSync(path.join(REPO_ROOT, file)), `${file} should exist`).toBe(true);
      expect(reason.length, `${file} needs a real justification`).toBeGreaterThan(40);
    }
  });
});

/**
 * The dense surfaces named in the review — the ones where several icon buttons
 * sit together and are indistinguishable without names.
 */
describe("the dense icon surfaces are named", () => {
  const SURFACES: Array<[string, string[]]> = [
    ["components/dashboard/header.tsx", ["sidebar.openMenu", "navigation.messages"]],
    ["components/sessions/SessionChat.tsx", ["addEmoji", "send"]],
    ["components/chat/PusherChat.tsx", ["send"]],
    ["components/messages/MessageInput.tsx", ["send", "removeAttachment"]],
    ["components/community/PremiumPostCard.tsx", ["moreActions"]],
    ["components/community/PremiumPostFeed.tsx", ["removeAttachment"]],
    ["components/community/CommentItem.tsx", ["deleteComment"]],
    ["components/notifications/Toast.tsx", ["dismiss"]],
    ["components/sessions/VideoRoomUI.tsx", ["showRaisedHands", "unpinQuestion", "clearInvite"]],
    ["components/live-session/LivePoll.tsx", ["close", "removeOption"]],
  ];

  it.each(SURFACES)("%s labels its controls", (file, keys) => {
    const src = read(file);
    for (const key of keys) {
      expect(src, `${file} should reference ${key}`).toContain(key);
    }
  });

  it("labels come from the catalog, never inline English", () => {
    // An `aria-label="Close"` is invisible to translators and ships English to
    // every Spanish and French user.
    const offenders: string[] = [];
    for (const [file] of SURFACES) {
      for (const m of read(file).matchAll(/aria-label=["']([^"']+)["']/g)) {
        offenders.push(`${file}: aria-label="${m[1]}"`);
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe("the a11y catalog", () => {
  it.each(LOCALES)("%s defines every key the components use", (locale) => {
    const catalog = JSON.parse(read(`locales/${locale}.json`)).a11y as Record<string, string>;

    const used = new Set<string>();
    for (const file of FILES) {
      for (const m of fs.readFileSync(file, "utf8").matchAll(/tA11y\(\s*["']([^"']+)["']/g)) {
        used.add(m[1]);
      }
    }

    expect(used.size).toBeGreaterThan(15);
    for (const key of used) {
      expect(catalog[key], `${locale}.a11y.${key} is missing`).toBeTruthy();
    }
  });

  it("has no key the components stopped using", () => {
    const catalog = JSON.parse(read("locales/en.json")).a11y as Record<string, string>;
    const used = new Set<string>();
    for (const file of FILES) {
      for (const m of fs.readFileSync(file, "utf8").matchAll(/tA11y\(\s*["']([^"']+)["']/g)) {
        used.add(m[1]);
      }
    }
    expect(Object.keys(catalog).filter((k) => !used.has(k))).toEqual([]);
  });
});

/**
 * Focus must remain visible. Removing the outline without putting something
 * back makes a control invisible to anyone navigating by keyboard.
 */
describe("focus stays visible", () => {
  it("no element removes its outline without a replacement", () => {
    const offenders: string[] = [];
    for (const file of FILES) {
      const src = fs.readFileSync(file, "utf8");
      for (const m of src.matchAll(/className=\{?["`]([^"`]*focus:outline-none[^"`]*)["`]/g)) {
        if (!/focus:ring|focus-visible:|focus:border|focus:shadow/.test(m[1])) {
          offenders.push(`${rel(file)}:${src.slice(0, m.index).split("\n").length}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("the account menu trigger keeps a ring", () => {
    // The one control on the top bar that had no other focus affordance.
    expect(read("components/dashboard/header.tsx")).toContain("focus-visible:ring-2");
  });
});
