import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

/**
 * UX Tier 1, items 2 and 3 — the app had one `loading.tsx` (explore) and no
 * `error.tsx` at all.
 *
 * Every dashboard route fetches on the server, so with no loading boundary a
 * navigation painted nothing until the query returned: indistinguishable from a
 * hung app. And with `global-error.tsx` as the only error boundary, one failing
 * query anywhere replaced the entire document — sidebar, header and all other
 * routes included — instead of the panel that actually broke.
 *
 * These tests pin the boundaries in place. They are structural on purpose: the
 * failure mode is a *missing file*, which no runtime test of the existing files
 * can catch.
 */

const REPO_ROOT = path.resolve(__dirname, "../..");
const DASHBOARD = "app/(dashboard)/dashboard";

function exists(relativePath: string): boolean {
  return fs.existsSync(path.join(REPO_ROOT, relativePath));
}

function read(relativePath: string): string {
  return fs.readFileSync(path.join(REPO_ROOT, relativePath), "utf8");
}

/** Route segments the user waits on: they fetch, so they must show a skeleton. */
const LOADING_SEGMENTS = [
  DASHBOARD,
  `${DASHBOARD}/sessions`,
  `${DASHBOARD}/sessions/[sessionId]`,
  `${DASHBOARD}/c/[slug]`,
  `${DASHBOARD}/c/[slug]/feed`,
  `${DASHBOARD}/c/[slug]/chat`,
  `${DASHBOARD}/c/[slug]/members`,
  `${DASHBOARD}/c/[slug]/sessions`,
  `${DASHBOARD}/c/[slug]/courses`,
  `${DASHBOARD}/c/[slug]/library`,
  `${DASHBOARD}/c/[slug]/about`,
  `${DASHBOARD}/c/[slug]/buddy`,
  `${DASHBOARD}/c/[slug]/settings`,
];

/** Segments big enough that losing the whole app to their failure is absurd. */
const ERROR_SEGMENTS = [DASHBOARD, `${DASHBOARD}/c/[slug]`, `${DASHBOARD}/sessions/[sessionId]`];

describe("loading skeletons", () => {
  it.each(LOADING_SEGMENTS)("%s has a loading.tsx", (segment) => {
    expect(exists(`${segment}/loading.tsx`)).toBe(true);
  });

  it.each(LOADING_SEGMENTS)("%s renders a skeleton, not a spinner or nothing", (segment) => {
    const source = read(`${segment}/loading.tsx`);

    // Shared primitives keep the ten skeletons one visual language; a bare
    // spinner conveys no layout and is what these replaced.
    expect(source).toMatch(/@\/components\/(ui\/skeleton|skeletons\/dashboard-skeletons)/);
    expect(source).toContain("export default function");
  });

  it.each(LOADING_SEGMENTS)("%s exports the skeleton as the default", (segment) => {
    // Next.js only honours the default export; a named-only export renders
    // nothing and fails silently.
    expect(read(`${segment}/loading.tsx`)).toMatch(/export default function \w+Loading\(/);
  });

  it("the skeleton primitives are server components", () => {
    // A `use client` here would ship the fallback itself as client JS, which is
    // the opposite of what a loading boundary is for.
    expect(read("components/skeletons/dashboard-skeletons.tsx")).not.toContain('"use client"');
  });
});

describe("error boundaries", () => {
  it.each(ERROR_SEGMENTS)("%s has an error.tsx", (segment) => {
    expect(exists(`${segment}/error.tsx`)).toBe(true);
  });

  it.each(ERROR_SEGMENTS)("%s boundary is a client component", (segment) => {
    // React error boundaries are stateful; Next.js rejects a server error.tsx.
    expect(read(`${segment}/error.tsx`)).toContain('"use client"');
  });

  it.each(ERROR_SEGMENTS)("%s boundary accepts reset and offers it", (segment) => {
    const source = read(`${segment}/error.tsx`);
    expect(source).toContain("reset");
    expect(source).toContain("SegmentError");
  });

  it("the shared boundary reports to Sentry, as global-error does", () => {
    const source = read("components/errors/SegmentError.tsx");
    expect(source).toContain("Sentry.captureException");
    // A contained error is the one most likely to go unnoticed, so it must be
    // tagged with where it happened.
    expect(source).toContain("segment: scope");
  });

  it("the shared boundary is localized rather than English-only", () => {
    const source = read("components/errors/SegmentError.tsx");
    expect(source).toContain('useTranslations("dashboard.errorBoundary")');
  });

  it("every scope the boundaries pass has copy in every locale", () => {
    const scopes = ERROR_SEGMENTS.map(
      (segment) => read(`${segment}/error.tsx`).match(/scope="(\w+)"/)?.[1]
    );
    expect(scopes).toEqual(["dashboard", "community", "session"]);

    for (const locale of ["en", "es", "fr"]) {
      const messages = JSON.parse(read(`locales/${locale}.json`));
      for (const scope of scopes) {
        expect(messages.dashboard.errorBoundary[scope as string].title).toBeTruthy();
        expect(messages.dashboard.errorBoundary[scope as string].description).toBeTruthy();
      }
    }
  });

  it("global-error.tsx remains as the last resort", () => {
    // Segment boundaries do not catch a failure in the root layout itself.
    expect(exists("app/global-error.tsx")).toBe(true);
  });
});
