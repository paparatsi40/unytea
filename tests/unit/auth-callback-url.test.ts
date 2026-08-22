import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

import { safeCallbackUrl, DEFAULT_CALLBACK_URL } from "@/lib/auth-callback-url";

/**
 * Landing somewhere after signing in, and landing somewhere *of ours*.
 *
 * Two things went wrong at the same line. The visible one: `signIn` was called
 * with `redirect: false` and followed by a bare `router.push`, which serves the
 * client Router Cache — and for anyone who reached the login page by being
 * bounced off `/dashboard`, the cached payload for `/dashboard` *is* that
 * bounce. So a correct password put them back on the login page looking signed
 * out, and only a manual reload got them in.
 *
 * The quiet one: `callbackUrl` comes from the query string, which means it
 * comes from whoever wrote the link. Handed straight to `router.push`, the
 * login page is an open redirect — and the worst possible moment to send
 * somebody elsewhere is the instant after they typed their password on our
 * domain.
 */

const REPO_ROOT = path.resolve(__dirname, "../..");

function code(relativePath: string): string {
  return fs
    .readFileSync(path.join(REPO_ROOT, relativePath), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

// ───────────────────────────────────────────────────────────────────────────
describe("where a callbackUrl is allowed to send someone", () => {
  it("keeps a path on this site", () => {
    expect(safeCallbackUrl("/dashboard/settings")).toBe("/dashboard/settings");
    expect(safeCallbackUrl("/en/c/my-community/join?plan=vip")).toBe(
      "/en/c/my-community/join?plan=vip"
    );
  });

  it("falls back when there is nothing to go on", () => {
    expect(safeCallbackUrl(null)).toBe(DEFAULT_CALLBACK_URL);
    expect(safeCallbackUrl(undefined)).toBe(DEFAULT_CALLBACK_URL);
    expect(safeCallbackUrl("")).toBe(DEFAULT_CALLBACK_URL);
    expect(safeCallbackUrl("   ")).toBe(DEFAULT_CALLBACK_URL);
  });

  it("refuses another origin outright", () => {
    expect(safeCallbackUrl("https://evil.example/login")).toBe(DEFAULT_CALLBACK_URL);
    expect(safeCallbackUrl("http://evil.example/steal")).toBe(DEFAULT_CALLBACK_URL);
  });

  it("refuses a protocol-relative URL", () => {
    // `//evil.example` is a host, not a path — and it is the shape that slips
    // past a check for a leading slash.
    expect(safeCallbackUrl("//evil.example/login")).toBe(DEFAULT_CALLBACK_URL);
    expect(safeCallbackUrl("/\\evil.example")).toBe(DEFAULT_CALLBACK_URL);
  });

  it("refuses a javascript: URL", () => {
    expect(safeCallbackUrl("javascript:alert(1)")).toBe(DEFAULT_CALLBACK_URL);
  });

  it("refuses a host that merely contains ours", () => {
    // `unytea.com.evil.example` is not us, and a substring check would say it
    // is. The path here must differ from the fallback: the first draft used
    // `/dashboard`, which is *also* what a refusal returns — so a leak and a
    // refusal produced the same answer and the test proved nothing.
    expect(safeCallbackUrl("https://unytea.com.evil.example/steal")).toBe(DEFAULT_CALLBACK_URL);
    expect(safeCallbackUrl("https://notunytea.com/steal")).toBe(DEFAULT_CALLBACK_URL);
  });

  it("accepts our own absolute URL and reduces it to the path", () => {
    expect(safeCallbackUrl("https://unytea.com/dashboard/agenda?tab=today")).toBe(
      "/dashboard/agenda?tab=today"
    );
  });

  it("refuses the retired www host, which is a different origin", () => {
    // It 308s to the apex, so pushing to it would be a cross-host hop — the
    // exact thing the canonicalisation work removed.
    expect(safeCallbackUrl("https://www.unytea.com/settings")).toBe(DEFAULT_CALLBACK_URL);
  });

  it("takes a caller-supplied fallback", () => {
    expect(safeCallbackUrl(null, "/onboarding")).toBe("/onboarding");
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe("what happens after a correct password", () => {
  const signin = code("app/auth/signin/signin-content.tsx");
  const signup = code("app/auth/signup/signup-content.tsx");

  it("discards the router cache before navigating", () => {
    // The whole bug. `push` alone answers from the cache, and the cache holds
    // what the server said while there was no session.
    const success = signin.slice(signin.indexOf('toast.success(t("auth.welcomeBack"))'));
    const refresh = success.indexOf("router.refresh()");
    const push = success.indexOf("router.push(callbackUrl)");
    expect(refresh).toBeGreaterThan(-1);
    expect(push).toBeGreaterThan(refresh);
  });

  it("does the same after signing up", () => {
    const success = signup.slice(signup.indexOf('toast.success(t("auth.accountCreated"))'));
    const refresh = success.indexOf("router.refresh()");
    const push = success.indexOf("router.push(");
    expect(refresh).toBeGreaterThan(-1);
    expect(push).toBeGreaterThan(refresh);
  });

  it("narrows the callbackUrl before it is used", () => {
    expect(signin).toMatch(/safeCallbackUrl\(searchParams\?\.get\("callbackUrl"\)\)/);
    // The raw read must not survive anywhere in the file.
    expect(signin).not.toMatch(/searchParams\?\.get\("callbackUrl"\) \|\|/);
  });

  it("does not reach for a reload or a timer", () => {
    // Both are ways of papering over the cache rather than clearing it, and
    // both throw away the client state the visitor already has.
    expect(signin).not.toMatch(/window\.location/);
    expect(signin).not.toMatch(/setTimeout/);
  });
});
