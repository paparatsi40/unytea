import { describe, it, expect, beforeAll } from "vitest";

/**
 * CSP source expressions with a partial wildcard are silently discarded.
 *
 * Production console reported:
 *   The source list for the CSP directive 'connect-src' contains an invalid
 *   source: 'wss://ws-*.pusher.com'. It will be ignored.
 *   … 'wss://sockjs-*.pusher.com'. It will be ignored.
 *
 * In CSP a `*` is only valid as an entire leftmost label — `*.pusher.com` is
 * legal, `ws-*.pusher.com` is not. The browser drops the whole expression, so
 * the host it was meant to authorize is simply absent from the policy. Nothing
 * fails loudly; the source just does not exist.
 *
 * These two were redundant (`wss://*.pusher.com` already covered them, and the
 * enforced policy still carries a blanket `wss:`), so realtime was never
 * actually blocked. The danger was entirely in the future: the Report-Only
 * policy they lived in is staged for promotion to enforced in Phase 4c, and a
 * policy that has been silently dropping sources during its monitoring period
 * is exactly the one that looks clean right up until it is turned on.
 *
 * Asserted against the real `next.config.mjs`, not a copy of the string, so
 * the test cannot drift from the header Next actually emits.
 */

type HeaderRule = { source: string; headers?: { key: string; value: string }[] };

let enforced = "";
let reportOnly = "";

beforeAll(async () => {
  const mod = await import("../../next.config.mjs");
  const config = mod.default as { headers: () => Promise<HeaderRule[]> };
  const all = (await config.headers()).flatMap((rule) => rule.headers ?? []);

  enforced = all.find((h) => h.key === "Content-Security-Policy")?.value ?? "";
  reportOnly = all.find((h) => h.key === "Content-Security-Policy-Report-Only")?.value ?? "";
});

/** Pull one directive's source list out of a policy string. */
function directive(policy: string, name: string): string {
  const found = policy
    .split(";")
    .map((part) => part.trim())
    .find((part) => part === name || part.startsWith(`${name} `));
  return found ?? "";
}

/**
 * A wildcard preceded by anything other than a `/` or the start of the host.
 * Matches `ws-*.pusher.com` and `sockjs-*.pusher.com`; does not match the legal
 * `*.pusher.com` or `https://*.livekit.cloud`.
 */
const PARTIAL_WILDCARD = /[a-z0-9-]+\*\./i;

describe("the CSP headers exist at all", () => {
  it("emits both the enforced and the report-only policy", () => {
    // Guards every assertion below against passing on an empty string.
    expect(enforced).toContain("default-src");
    expect(reportOnly).toContain("default-src");
  });
});

describe("no directive contains a partial wildcard", () => {
  it.each([
    ["Content-Security-Policy", () => enforced],
    ["Content-Security-Policy-Report-Only", () => reportOnly],
  ])("%s is free of them", (_name, get) => {
    const offenders = get()
      .split(";")
      .map((part) => part.trim())
      .filter((part) => PARTIAL_WILDCARD.test(part));

    expect(offenders).toEqual([]);
  });

  it.each([
    ["Content-Security-Policy", () => enforced],
    ["Content-Security-Policy-Report-Only", () => reportOnly],
  ])("%s: every wildcard is a whole leftmost label", (_name, get) => {
    // Every `*` in a source must be either the bare `*` or immediately
    // preceded by `//` (scheme) or nothing, and immediately followed by `.`.
    const bad = [...get().matchAll(/\S*\*\S*/g)]
      .map((m) => m[0])
      .filter((source) => source !== "*" && !/^(?:[a-z]+:\/\/)?\*\./i.test(source));

    expect(bad).toEqual([]);
  });

  it("the regex it relies on actually catches the original bug", () => {
    // A guard that fails loudly if the detector is ever weakened.
    expect(PARTIAL_WILDCARD.test("wss://ws-*.pusher.com")).toBe(true);
    expect(PARTIAL_WILDCARD.test("wss://sockjs-*.pusher.com")).toBe(true);
    expect(PARTIAL_WILDCARD.test("wss://*.pusher.com")).toBe(false);
    expect(PARTIAL_WILDCARD.test("https://*.ingest.us.sentry.io")).toBe(false);
  });
});

describe("Pusher is authorized by the tightened policy", () => {
  it("allows the WebSocket transport", () => {
    // ws-<cluster>.pusher.com
    expect(directive(reportOnly, "connect-src")).toContain("wss://*.pusher.com");
  });

  it("allows the SockJS fallback, which speaks https rather than wss", () => {
    // sockjs-<cluster>.pusher.com over XHR — a wss-only allowance would leave
    // the fallback blocked precisely when the WebSocket could not connect.
    expect(directive(reportOnly, "connect-src")).toContain("https://*.pusher.com");
  });

  it("no longer carries the two invalid sources", () => {
    for (const policy of [enforced, reportOnly]) {
      expect(policy).not.toContain("ws-*.pusher.com");
      expect(policy).not.toContain("sockjs-*.pusher.com");
    }
  });

  it("does not allow hosts the client never contacts", () => {
    // pusher-js 8.5 defaults `enableStats` to false and the client passes
    // neither enableStats nor disableStats, so stats.pusher.com is never hit;
    // *.pusherapp.com is legacy and unused with a cluster-configured client.
    // Widening a policy for traffic that does not exist is just a bigger hole.
    expect(reportOnly).not.toContain("stats.pusher.com");
    expect(reportOnly).not.toContain("pusherapp.com");
  });
});

describe("the other third-party wildcards are well-formed", () => {
  it.each([
    "https://*.uploadthing.com",
    "https://*.livekit.cloud",
    "wss://*.livekit.cloud",
    "https://*.sentry.io",
    "https://*.ingest.sentry.io",
    "https://*.ingest.us.sentry.io",
  ])("%s survives in connect-src", (source) => {
    expect(directive(reportOnly, "connect-src")).toContain(source);
  });

  it.each(["https://*.vercel.app", "https://*.livekit.cloud", "https://*.livekit.io"])(
    "%s survives in script-src",
    (source) => {
      expect(directive(reportOnly, "script-src")).toContain(source);
    }
  );
});
