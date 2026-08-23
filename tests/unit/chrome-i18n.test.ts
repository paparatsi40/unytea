import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

/**
 * The chrome the homepage pass did not reach.
 *
 * The marketing page was translated while the screens around it were not: a
 * visitor read a Spanish landing, clicked "Crear cuenta", and landed on "Create
 * your account / Full Name / At least 8 characters required". The session
 * detail view was English top to bottom — 56 strings — and the install prompt
 * had never seen `useTranslations` at all.
 *
 * Same shape as tests/unit/home-i18n.test.ts: no hardcoded English, an
 * anti-vacuity check so the scanner cannot pass by matching nothing, every key
 * the surface reads resolving in all three locales, and es/fr not being the
 * English block pasted three times.
 */

const REPO_ROOT = path.resolve(__dirname, "../..");
const LOCALES = ["en", "es", "fr"] as const;

/** The surfaces this guard owns, and the namespace each one reads. */
const SURFACES = [
  { file: "app/auth/signup/signup-content.tsx", label: "signup" },
  { file: "app/auth/signin/signin-content.tsx", label: "signin" },
  { file: "app/auth/forgot-password/page.tsx", label: "forgot-password" },
  { file: "app/auth/reset-password/page.tsx", label: "reset-password" },
  { file: "app/(dashboard)/dashboard/sessions/[sessionId]/page.tsx", label: "session detail" },
  { file: "app/(dashboard)/dashboard/sessions/[sessionId]/room/page.tsx", label: "session room" },
];

/**
 * Never translated: our brand, the networks we link to or share on, and the
 * masked-password placeholder, which is punctuation rather than words.
 */
const NOT_COPY = new Set([
  "Unytea",
  "LinkedIn",
  "WhatsApp",
  "Twitter",
  "GitHub",
  "Google",
  "Apple",
  "X",
  "Promise",
  "••••••••",
]);

function source(relativePath: string): string {
  return fs
    .readFileSync(path.join(REPO_ROOT, relativePath), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

function hardcoded(relativePath: string): string[] {
  const src = source(relativePath);
  const found: string[] = [];

  // Text between JSX tags.
  for (const m of src.matchAll(/>\s*([A-Z][A-Za-z][^<>{}\n]{2,})\s*</g)) found.push(m[1].trim());
  // Copy passed as a literal prop.
  for (const m of src.matchAll(/\b(placeholder|title|alt|aria-label)="([^"]{3,})"/g))
    found.push(m[2]);
  // User-facing toasts.
  for (const m of src.matchAll(/toast\.\w+\(\s*"([^"]+)"/g)) found.push(m[1]);

  return found.filter((v) => !NOT_COPY.has(v)).sort();
}

describe("the auth, session and PWA surfaces render from the catalog", () => {
  it.each(SURFACES)("$label carries no hardcoded English", ({ file }) => {
    expect(hardcoded(file)).toEqual([]);
  });

  it.each(SURFACES)("$label actually reads the catalog", ({ file }) => {
    // Anti-vacuity: without this, emptying a file would satisfy the test above.
    const src = source(file);
    expect(src.length).toBeGreaterThan(400);
    expect((src.match(/\bt\(/g) ?? []).length).toBeGreaterThan(0);
  });
});

describe("every key these surfaces read exists in all three locales", () => {
  function catalog(locale: string): Record<string, unknown> {
    return JSON.parse(fs.readFileSync(path.join(REPO_ROOT, `locales/${locale}.json`), "utf8"));
  }

  function lookup(root: Record<string, unknown>, dotted: string): unknown {
    return dotted
      .split(".")
      .reduce<unknown>(
        (n, k) => (n && typeof n === "object" ? (n as Record<string, unknown>)[k] : undefined),
        root
      );
  }

  /** `useTranslations("x.y")` / `getTranslations("x.y")` in a file. */
  function namespaceOf(src: string): string {
    const m = src.match(/use(?:Translations)\("([^"]+)"\)/);
    return m ? m[1] : "";
  }

  /** Every literal `t("…")` in a file, resolved against its namespace. */
  function keysOf(relativePath: string): string[] {
    const src = source(relativePath);
    const ns = namespaceOf(src);
    const keys = new Set<string>();
    for (const m of src.matchAll(/\bt(?:\.rich|\.raw)?\("([^"]+)"[,)]/g)) {
      const key = m[1];
      // A file may bind more than one namespace (a page and its error
      // catalogue); keys already carrying a dotted prefix that starts with a
      // known root are used as-is.
      keys.add(
        key.startsWith("auth.") || key.startsWith("common.") ? key : ns ? `${ns}.${key}` : key
      );
    }
    return [...keys];
  }

  it.each(LOCALES)("%s resolves every key", (locale) => {
    const root = catalog(locale);
    const missing: string[] = [];

    for (const { file } of SURFACES) {
      for (const key of keysOf(file)) {
        if (lookup(root, key) === undefined) missing.push(`${file} → ${key}`);
      }
    }

    expect(missing).toEqual([]);
  });

  it("finds a realistic number of keys", () => {
    const total = SURFACES.reduce((n, { file }) => n + keysOf(file).length, 0);
    expect(total).toBeGreaterThan(70);
  });
});

describe("the new copy is real translation, not English pasted three times", () => {
  const BLOCKS = [
    "auth.signup",
    "auth.forgot",
    "auth.reset",
    "auth.errors",
    "dashboard.sessions.detail",
    "liveSession.room.toasts",
  ];

  function flatten(node: unknown, prefix = "", out: Record<string, string> = {}) {
    if (typeof node === "string") out[prefix] = node;
    else if (node && typeof node === "object")
      for (const [k, v] of Object.entries(node)) flatten(v, prefix ? `${prefix}.${k}` : k, out);
    return out;
  }

  function block(locale: string, dotted: string): Record<string, string> {
    const root = JSON.parse(
      fs.readFileSync(path.join(REPO_ROOT, `locales/${locale}.json`), "utf8")
    );
    const node = dotted.split(".").reduce<unknown>((n, k) => (n as never)?.[k], root);
    return flatten(node);
  }

  it.each(BLOCKS)("%s: es and fr differ from en", (dotted) => {
    const en = block("en", dotted);
    const es = block("es", dotted);
    const fr = block("fr", dotted);

    // Not 100%: "Notes", "Chat" and the masked-password dots are the same word
    // in all three. A copy-pasted English block sits far below this line.
    const total = Object.keys(en).length;
    const diffEs = Object.keys(en).filter((k) => en[k] !== es[k]).length;
    const diffFr = Object.keys(en).filter((k) => en[k] !== fr[k]).length;

    expect(total).toBeGreaterThan(0);
    expect(diffEs / total).toBeGreaterThan(0.6);
    expect(diffFr / total).toBeGreaterThan(0.6);
  });

  it.each(BLOCKS)("%s: no locale is missing a value", (dotted) => {
    for (const locale of LOCALES) {
      for (const [key, value] of Object.entries(block(locale, dotted))) {
        expect(value.trim(), `${locale}.${dotted}.${key}`).not.toBe("");
      }
    }
  });
});

describe("auth API errors travel as codes, not English sentences", () => {
  const ROUTES = [
    "app/api/auth/signup/route.ts",
    "app/api/auth/forgot-password/route.ts",
    "app/api/auth/reset-password/route.ts",
  ];

  it.each(ROUTES)("%s returns a code with every error", (route) => {
    const src = source(route);
    const errors = src.match(/error:\s*"/g) ?? [];
    // `code: "LITERAL"` or the shorthand `code` — the signup route's conflict
    // code is computed (which of Google, GitHub or a password the existing
    // account uses), so it cannot be written as a literal. What the rule is
    // about is that a code travels beside every English sentence, not the
    // syntax it is written in.
    const codes = src.match(/code:\s*"|(?<![\w.])code\s*[,}]/g) ?? [];

    expect(errors.length).toBeGreaterThan(0);
    // One code per hardcoded error string, so nothing falls back to raw English.
    expect(codes.length).toBeGreaterThanOrEqual(errors.length);
  });

  it("every code the routes emit is translated in all three locales", () => {
    const emitted = new Set<string>();
    for (const route of ROUTES) {
      for (const m of source(route).matchAll(/code:\s*"([A-Z_]+)"/g)) emitted.add(m[1]);
    }
    // Codes chosen dynamically from a field name are declared in the helper.
    for (const m of source("lib/auth-error-message.ts").matchAll(/"([A-Z_]+)"/g)) emitted.add(m[1]);

    expect(emitted.size).toBeGreaterThan(4);

    for (const locale of LOCALES) {
      const errs = JSON.parse(
        fs.readFileSync(path.join(REPO_ROOT, `locales/${locale}.json`), "utf8")
      ).auth.errors;
      for (const code of emitted) {
        expect(errs[code], `${locale}.auth.errors.${code}`).toBeTruthy();
      }
    }
  });
});

/**
 * The install banner is mounted in app/layout.tsx, outside every
 * NextIntlClientProvider, so `useTranslations` throws there — it broke the
 * prerender of every static page when this pass first tried it. It carries its
 * own table instead, the same way components/gdpr/CookieConsent.tsx does, and
 * is guarded here rather than against the catalog.
 */
describe("the PWA install banner carries all three languages in-file", () => {
  const FILE = "components/pwa/PWAInstallPrompt.tsx";

  it("does not reach for a provider that is not there", () => {
    expect(source(FILE)).not.toContain("useTranslations");
  });

  it("defines every string in en, es and fr", () => {
    const src = source(FILE);
    for (const locale of LOCALES) {
      const block = src.slice(src.indexOf(`${locale}: {`));
      for (const key of ["title", "body", "accept", "dismiss"]) {
        expect(block, `${locale}.${key}`).toContain(`${key}:`);
      }
    }
  });

  it("es and fr are not the English strings repeated", () => {
    const src = source(FILE);
    const grab = (locale: string) => {
      const start = src.indexOf(`${locale}: {`);
      return src.slice(start, src.indexOf("},", start));
    };
    expect(grab("es")).not.toBe(grab("en"));
    expect(grab("fr")).not.toBe(grab("en"));
    expect(grab("es")).not.toBe(grab("fr"));
  });
});
