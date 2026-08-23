import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

import {
  authPageErrorKey,
  AUTH_PAGE_ERROR_CODES,
  AUTH_PAGE_ERROR_FALLBACK,
} from "@/lib/auth-error-page";

/**
 * Two routes the app linked to did not exist.
 *
 * `lib/auth.ts` declared `pages.error: "/auth/error"`, so @auth/core redirected
 * every OAuth failure there — and the commonest failure is pressing "Cancel" on
 * Google's consent screen, which raises `AccessDenied`. There was no such page.
 * The visitor met Next's bare 404: no logo, no navigation, no way back.
 *
 * The password reset was the same shape. `app/auth/reset-password/page.tsx`
 * existed, but `app/[locale]/auth/reset-password` did not — and the middleware
 * sends every unprefixed `/auth/*` through next-intl with
 * `localePrefix: "always"`, so the link mailed to users,
 * `${SITE_URL}/auth/reset-password?token=…`, 307'd to `/en/auth/reset-password`
 * and 404'd there. Every other auth page had its one-line locale re-export;
 * reset-password had been skipped.
 *
 * The last group below is the one that matters most: it does not check these
 * two paths, it checks that *every* path `pages` claims resolves to a real
 * route. That is the assertion that would have caught both.
 */

const REPO_ROOT = path.resolve(__dirname, "../..");

function read(relativePath: string): string {
  return fs.readFileSync(path.join(REPO_ROOT, relativePath), "utf8");
}

function exists(relativePath: string): boolean {
  return fs.existsSync(path.join(REPO_ROOT, relativePath));
}

// ───────────────────────────────────────────────────────────────────────────
describe("which message an error code resolves to", () => {
  it.each([...AUTH_PAGE_ERROR_CODES])("keeps %s as its own key", (code) => {
    expect(authPageErrorKey(code)).toBe(code);
  });

  it("names the codes @auth/core can actually send here", () => {
    // `AccessDenied` and `Verification` are the two client-safe types whose
    // `kind` is "error", which is what routes them to `pages.error`.
    // `Configuration` is the label every non-client-safe failure is flattened
    // to. `OAuthAccountNotLinked` is a sign-in-kind error — it lands on the
    // sign-in page — but it is the code Auth.js documents most, so the page
    // answers for it rather than shrugging.
    expect([...AUTH_PAGE_ERROR_CODES].sort()).toEqual([
      "AccessDenied",
      "Configuration",
      "OAuthAccountNotLinked",
      "Verification",
    ]);
  });

  it("falls back when there is no code", () => {
    expect(authPageErrorKey(null)).toBe(AUTH_PAGE_ERROR_FALLBACK);
    expect(authPageErrorKey(undefined)).toBe(AUTH_PAGE_ERROR_FALLBACK);
    expect(authPageErrorKey("")).toBe(AUTH_PAGE_ERROR_FALLBACK);
  });

  it("falls back on a code it does not know", () => {
    // A code from a future @auth/core, or a typo, or an invention. The page has
    // to say something true either way.
    expect(authPageErrorKey("SessionRequired")).toBe(AUTH_PAGE_ERROR_FALLBACK);
    expect(authPageErrorKey("MissingCSRF")).toBe(AUTH_PAGE_ERROR_FALLBACK);
  });

  it("refuses a near-miss instead of guessing", () => {
    // The codes are @auth/core's class names and are matched exactly. Loosening
    // this to a case-insensitive or substring match would let a crafted value
    // pick which of our messages to display.
    expect(authPageErrorKey("accessdenied")).toBe(AUTH_PAGE_ERROR_FALLBACK);
    expect(authPageErrorKey("AccessDeniedXYZ")).toBe(AUTH_PAGE_ERROR_FALLBACK);
    expect(authPageErrorKey("xAccessDenied")).toBe(AUTH_PAGE_ERROR_FALLBACK);
  });

  it("tolerates whitespace around an otherwise exact code", () => {
    expect(authPageErrorKey("  AccessDenied  ")).toBe("AccessDenied");
  });

  it("falls back on anything that is not a string", () => {
    expect(authPageErrorKey(42)).toBe(AUTH_PAGE_ERROR_FALLBACK);
    expect(authPageErrorKey(["AccessDenied"])).toBe(AUTH_PAGE_ERROR_FALLBACK);
    expect(authPageErrorKey({ toString: () => "AccessDenied" })).toBe(AUTH_PAGE_ERROR_FALLBACK);
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe("the error page shows our words, never the visitor's", () => {
  const content = read("app/auth/error/auth-error-content.tsx");

  it("routes the query parameter through the allow-list", () => {
    expect(content).toMatch(/authPageErrorKey\(searchParams\?\.get\("error"\)\)/);
  });

  it("never renders the raw parameter", () => {
    // `?error=Your%20account%20is%20suspended,%20call%20555-0100` would
    // otherwise print attacker-written text under our logo. React escaping is
    // not the issue; whose sentence it is, is.
    const jsx = content.slice(content.indexOf("return ("));
    expect(jsx).not.toMatch(/searchParams/);
    expect(jsx).not.toMatch(/\{\s*(raw|error|code)\s*\}/);
  });

  it("always offers both ways out, unconditionally", () => {
    // Not behind a branch on the code: whatever happened, and even when the
    // code is unrecognised, sign-in and the home page are one click away.
    expect(content).toContain('href="/auth/signin"');
    expect(content).toContain('href="/"');
    const jsx = content.slice(content.indexOf("return ("));
    expect(jsx).not.toMatch(/\?\s*<Link/);
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe("the routes that were missing", () => {
  it.each([
    ["app/auth/error/page.tsx", "the error page itself"],
    ["app/[locale]/auth/error/page.tsx", "its locale re-export"],
    ["app/[locale]/auth/reset-password/page.tsx", "the reset-password locale re-export"],
    ["app/not-found.tsx", "the root 404"],
  ])("%s exists — %s", (file) => {
    expect(exists(file)).toBe(true);
  });

  it.each([
    ["app/[locale]/auth/error/page.tsx", "@/app/auth/error/page"],
    ["app/[locale]/auth/reset-password/page.tsx", "@/app/auth/reset-password/page"],
  ])("%s re-exports the unprefixed page", (file, target) => {
    // The same one-liner sign-in and sign-up use. Two copies of a page would
    // drift; this cannot.
    expect(read(file).trim()).toBe(`export { default } from "${target}";`);
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe("every page NextAuth is pointed at resolves to a route", () => {
  const auth = read("lib/auth.ts");
  const block = auth.slice(
    auth.indexOf("  pages: {"),
    auth.indexOf("  },", auth.indexOf("pages: {"))
  );
  const declared = [...block.matchAll(/(\w+):\s*"([^"]+)"/g)].map((m) => ({
    key: m[1],
    route: m[2],
  }));

  it("finds the declarations it means to check", () => {
    // Guards the parse: an empty list would make the assertion below vacuous.
    expect(declared.length).toBeGreaterThanOrEqual(3);
    expect(declared.map((d) => d.key)).toContain("error");
  });

  it("each declared page has a page.tsx behind it", () => {
    const missing = declared.filter(
      ({ route }) => !exists(`app${route}/page.tsx`) && !exists(`app/[locale]${route}/page.tsx`)
    );
    expect(missing.map((m) => `${m.key} → ${m.route}`)).toEqual([]);
  });

  it("no longer claims a verify-request page it does not have", () => {
    // Reachable only from @auth/core's `sendToken`, which runs for a provider
    // of `type: "email"`. This app registers Google, GitHub and Credentials —
    // no magic link — so nothing could ever send anyone there, and the claim
    // was removed rather than a page built for it. Without the line, a
    // hand-typed /api/auth/verify-request gets @auth/core's own page.
    expect(block).not.toContain("verifyRequest");
    expect(exists("app/auth/verify/page.tsx")).toBe(false);
  });

  it("does not register an email provider, which is what would change that", () => {
    // If one is ever added, `verifyRequest` has to come back with a page behind
    // it — and this test is where that gets noticed.
    expect(auth).not.toMatch(/from\s+"next-auth\/providers\/(email|nodemailer|resend)"/);
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe("the new copy exists in every locale", () => {
  const LOCALES = ["en", "es", "fr"] as const;
  const catalogs = Object.fromEntries(
    LOCALES.map((l) => [l, JSON.parse(read(`locales/${l}.json`))])
  ) as Record<(typeof LOCALES)[number], Record<string, Record<string, unknown>>>;

  const errorPageKeys = [
    ...[...AUTH_PAGE_ERROR_CODES, AUTH_PAGE_ERROR_FALLBACK].flatMap((code) => [
      `${code}.title`,
      `${code}.body`,
    ]),
    "backToSignIn",
    "backToHome",
    "needHelp",
  ];
  const notFoundKeys = ["code", "title", "body", "backToHome", "signIn"];

  function at(root: unknown, dotted: string): unknown {
    return dotted.split(".").reduce<unknown>((node, part) => {
      return node && typeof node === "object" ? (node as Record<string, unknown>)[part] : undefined;
    }, root);
  }

  it.each(LOCALES)("%s defines every auth.errorPage key the page reads", (locale) => {
    const errorPage = (catalogs[locale].auth as Record<string, unknown>).errorPage;
    for (const key of errorPageKeys) {
      expect(at(errorPage, key), `${locale}: auth.errorPage.${key}`).toBeTruthy();
    }
  });

  it.each(LOCALES)("%s defines every notFound key", (locale) => {
    for (const key of notFoundKeys) {
      expect(at(catalogs[locale].notFound, key), `${locale}: notFound.${key}`).toBeTruthy();
    }
  });

  it.each(LOCALES)("%s keeps the <contact> tag the rich text needs", (locale) => {
    // `t.rich("needHelp", { contact })` renders nothing for a tag the string
    // does not contain, so a translation that dropped it would silently lose
    // the support link.
    const errorPage = (catalogs[locale].auth as Record<string, unknown>).errorPage;
    expect(String(at(errorPage, "needHelp"))).toMatch(/<contact>.+<\/contact>/);
  });

  it("translates the copy rather than copying English into every locale", () => {
    const title = (locale: (typeof LOCALES)[number]) => {
      const errorPage = (catalogs[locale].auth as Record<string, unknown>).errorPage;
      return String(at(errorPage, "AccessDenied.title"));
    };
    expect(title("es")).not.toBe(title("en"));
    expect(title("fr")).not.toBe(title("en"));
    expect(String(at(catalogs.es.notFound, "title"))).not.toBe(
      String(at(catalogs.en.notFound, "title"))
    );
  });
});
