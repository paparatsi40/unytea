import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { createTranslator } from "next-intl";

import { rateLimiters, retryAfterSeconds, hashedKey, rateLimitedResponse } from "@/lib/rate-limit";
import { retryAfterMinutes, authErrorMessageWithRetry } from "@/lib/auth-error-message";

/**
 * The ceilings themselves, counted rather than read.
 *
 * These drive the real limiters against the in-memory store, so "20 an hour"
 * is a thing the code does, not a number in a config that something else might
 * be ignoring. Keys are unique per test so the buckets cannot leak into each
 * other.
 *
 * The last group is the guard rail on this whole branch: `rateLimiters.auth` is
 * shared with `deleteAccount`, so retuning it to fix a signup problem would
 * move a limit nobody asked to move. The two auth routes were given their own
 * ceilings precisely so that could not happen by accident.
 */

const REPO_ROOT = path.resolve(__dirname, "../..");
const LOCALES = ["en", "es", "fr"] as const;

function read(relativePath: string): string {
  return fs.readFileSync(path.join(REPO_ROOT, relativePath), "utf8");
}

/**
 * One limiter's declaration, bounded at its own closing brace.
 *
 * The first draft sliced from the entry name to the end of the file, which
 * meant every assertion below could be satisfied by some *other* limiter's
 * numbers further down — and it was: retuning `auth` to 1 hour / 20 still
 * passed, because `passwordReset` a few lines later still said 15 minutes / 5.
 * A test that cannot fail is worse than no test, so the slice ends where the
 * entry does.
 */
function limiterEntry(name: string): string {
  const source = read("lib/rate-limit.ts");
  const start = source.indexOf(`  ${name}: rateLimit({`);
  if (start === -1) throw new Error(`no limiter named ${name}`);
  const end = source.indexOf("}),", start);
  if (end === -1) throw new Error(`limiter ${name} is not closed`);
  return source.slice(start, end);
}

/** Run `attempts` checks against one key and report which ones were allowed. */
async function drive(
  limiter: { check: (key: string) => Promise<{ success: boolean }> },
  key: string,
  attempts: number
): Promise<boolean[]> {
  const results: boolean[] = [];
  for (let i = 0; i < attempts; i++) {
    results.push((await limiter.check(key)).success);
  }
  return results;
}

// ───────────────────────────────────────────────────────────────────────────
describe("FACET 2 · signup allows a roomful, not five", () => {
  it("lets twenty through and refuses the twenty-first", async () => {
    const outcomes = await drive(rateLimiters.signupAttempt, "test:signup:room", 21);
    expect(outcomes.slice(0, 20).every(Boolean)).toBe(true);
    expect(outcomes[20]).toBe(false);
  });

  it("counts them per key, so one IP's ceiling is not everybody's", async () => {
    await drive(rateLimiters.signupAttempt, "test:signup:a", 20);
    const other = await rateLimiters.signupAttempt.check("test:signup:b");
    expect(other.success).toBe(true);
  });

  it("spends the hour it promises", async () => {
    const { resetTime } = await rateLimiters.signupAttempt.check("test:signup:window");
    const seconds = retryAfterSeconds(resetTime);
    expect(seconds).toBeGreaterThan(59 * 60);
    expect(seconds).toBeLessThanOrEqual(60 * 60);
  });

  it("does not raise the hourly average, only the burst", () => {
    // 5 per 15 minutes was already 20 an hour. What changed is that the twenty
    // may arrive together — which is the difference between onboarding a room
    // and turning away its sixth person.
    const entry = limiterEntry("signupAttempt");
    expect(entry).toContain("interval: 60 * 60 * 1000");
    expect(entry).toContain("uniqueTokenPerInterval: 20");
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe("FACET 2E · three reset mails an hour, per mailbox", () => {
  it("lets three through and refuses the fourth", async () => {
    const key = hashedKey("test:forgot-to", "victim@example.com");
    const outcomes = await drive(rateLimiters.passwordResetRecipient, key, 4);
    expect(outcomes.slice(0, 3).every(Boolean)).toBe(true);
    expect(outcomes[3]).toBe(false);
  });

  it("hashes what it is given, and hides it", async () => {
    const key = hashedKey("forgot-to", "victim@example.com");
    expect(key).toMatch(/^forgot-to:[0-9a-f]{32}$/);
    expect(key).not.toContain("victim");
  });

  it("gives the same key for the same value and different keys for different ones", () => {
    expect(hashedKey("p", "a@b.com")).toBe(hashedKey("p", "a@b.com"));
    expect(hashedKey("p", "a@b.com")).not.toBe(hashedKey("p", "c@d.com"));
  });

  it("keeps the reset window for the per-IP bucket where it was", () => {
    // No shared-IP pressure here: nobody resets a password in a group. It has
    // its own entry only so tuning it later cannot reach `deleteAccount`.
    const entry = limiterEntry("passwordReset");
    expect(entry).toContain("interval: 15 * 60 * 1000");
    expect(entry).toContain("uniqueTokenPerInterval: 5");
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe("the shared `auth` limiter was not touched", () => {
  it("still allows five per fifteen minutes", async () => {
    const outcomes = await drive(rateLimiters.auth, "test:auth:untouched", 6);
    expect(outcomes.slice(0, 5).every(Boolean)).toBe(true);
    expect(outcomes[5]).toBe(false);
  });

  it("still declares five per fifteen minutes", () => {
    const entry = limiterEntry("auth");
    expect(entry).toContain("interval: 15 * 60 * 1000");
    expect(entry).toContain("uniqueTokenPerInterval: 5");
  });

  it("is what deleteAccount still counts in, which is why it was left alone", () => {
    // `app/actions/settings.ts` shares this bucket under a per-user key. Retune
    // it to fix a signup problem and you move a limit nobody asked to move.
    expect(read("app/actions/settings.ts")).toContain('rateLimit: "auth"');
  });

  it("is no longer what the two auth routes reach for", () => {
    for (const route of ["app/api/auth/signup/route.ts", "app/api/auth/forgot-password/route.ts"]) {
      expect(read(route), route).not.toContain("rateLimiters.auth");
    }
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe("telling the reader how long to wait", () => {
  it("rounds seconds up, and never says zero", () => {
    const now = 1_000_000;
    expect(retryAfterSeconds(now + 1, now)).toBe(1);
    expect(retryAfterSeconds(now + 1_001, now)).toBe(2);
    expect(retryAfterSeconds(now + 60_000, now)).toBe(60);
    // A window that has already passed still means "not immediately".
    expect(retryAfterSeconds(now - 5_000, now)).toBe(1);
  });

  it("rounds minutes up, and never says zero", () => {
    // "Try again in 0 minutes" is what the refusal is asking them not to do,
    // and 61 seconds reported as "1 minute" earns them a second refusal.
    expect(retryAfterMinutes(1)).toBe(1);
    expect(retryAfterMinutes(60)).toBe(1);
    expect(retryAfterMinutes(61)).toBe(2);
    expect(retryAfterMinutes(900)).toBe(15);
  });

  it("falls back to a message without a time when there is no usable number", () => {
    // An older deployment that does not send the field, or a body that never
    // had one.
    for (const junk of [undefined, null, 0, -5, "600", NaN, Infinity]) {
      expect(retryAfterMinutes(junk)).toBeNull();
    }
  });

  it("puts the seconds in the header and the body alike", async () => {
    const response = rateLimitedResponse({
      success: false,
      remaining: 0,
      resetTime: Date.now() + 125_000,
    });
    const body = (await response.json()) as { code: string; retryAfterSeconds: number };
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe(String(body.retryAfterSeconds));
    expect(body.retryAfterSeconds).toBeGreaterThan(120);
    expect(body.retryAfterSeconds).toBeLessThanOrEqual(125);
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe("the sentence the reader actually sees", () => {
  const translator = (locale: (typeof LOCALES)[number]) =>
    createTranslator({
      locale,
      messages: JSON.parse(read(`locales/${locale}.json`)),
      namespace: "auth.errors",
    });

  it.each(LOCALES)("%s renders the singular and the plural", (locale) => {
    // ICU plural, rendered rather than eyeballed in the JSON.
    const t = translator(locale) as unknown as (
      key: string,
      values?: Record<string, string | number | Date>
    ) => string;

    const one = authErrorMessageWithRetry(t, "RATE_LIMITED", 60);
    const many = authErrorMessageWithRetry(t, "RATE_LIMITED", 900);

    expect(one).toContain("1");
    expect(many).toContain("15");
    expect(one).not.toBe(many);
    expect(one).not.toMatch(/[{}#]/);
    expect(many).not.toMatch(/[{}#]/);
  });

  it.each(LOCALES)("%s falls back to the plain message with no number", (locale) => {
    const t = translator(locale) as unknown as (
      key: string,
      values?: Record<string, string | number | Date>
    ) => string;

    const plain = authErrorMessageWithRetry(t, "RATE_LIMITED", undefined);
    expect(plain).toBe(t("RATE_LIMITED"));
    expect(plain).not.toMatch(/\d/);
  });

  it("leaves every other code alone", () => {
    const t = translator("en") as unknown as (
      key: string,
      values?: Record<string, string | number | Date>
    ) => string;
    // A retry time on a validation failure would be nonsense.
    expect(authErrorMessageWithRetry(t, "VALIDATION_EMAIL", 600)).toBe(t("VALIDATION_EMAIL"));
    expect(authErrorMessageWithRetry(t, "NOPE", 600)).toBe(t("generic"));
  });

  it("is translated in every locale, not copied from English", () => {
    const message = (locale: (typeof LOCALES)[number]) =>
      JSON.parse(read(`locales/${locale}.json`)).auth.errors.RATE_LIMITED_IN as string;
    for (const locale of LOCALES) expect(message(locale)).toBeTruthy();
    expect(message("es")).not.toBe(message("en"));
    expect(message("fr")).not.toBe(message("en"));
  });

  it("is what both pages call", () => {
    for (const page of [
      "app/auth/signup/signup-content.tsx",
      "app/auth/forgot-password/page.tsx",
    ]) {
      const source = read(page);
      expect(source, page).toContain("authErrorMessageWithRetry(tError, data.code");
      expect(source, page).toContain("data.retryAfterSeconds");
    }
  });
});
