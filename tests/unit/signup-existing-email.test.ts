import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

import {
  signupConflictCode,
  isSignupConflictCode,
  SIGNUP_CONFLICT_CODES,
} from "@/lib/signup-conflict";
import {
  signInErrorKey,
  SIGNIN_ERROR_CODES,
  AUTH_PAGE_ERROR_FALLBACK,
} from "@/lib/auth-error-page";

/**
 * Signing up with an address you already have an account for.
 *
 * The route answered 201 with "if this email is available, an account has been
 * created", so as not to confirm the address was taken. The client read
 * `response.ok` as success and went on to `signIn("credentials", …)` with the
 * password just typed — which fails for any account with a different password,
 * and for every account created through Google, which has no password at all.
 * The user got a bare "sign-in error" toast on a signup form: never told the
 * account existed, never offered a way back into it.
 *
 * And the anti-enumeration that cost bought was already gone: with any random
 * password, a fresh address signs in and a taken one does not, so line four
 * handed back the answer line one had withheld. Only the user was in the dark.
 *
 * Related: the sign-in page never read `?error=` either, so every failure
 * NextAuth routed there rendered a blank, ordinary login form.
 */

const REPO_ROOT = path.resolve(__dirname, "../..");
const LOCALES = ["en", "es", "fr"] as const;

function read(relativePath: string): string {
  return fs.readFileSync(path.join(REPO_ROOT, relativePath), "utf8");
}

// ───────────────────────────────────────────────────────────────────────────
describe("which door an existing account should be sent to", () => {
  it("sends an account with a password to the password form", () => {
    expect(signupConflictCode({ password: "$2a$12$hash", accounts: [] })).toBe(
      "EMAIL_IN_USE_PASSWORD"
    );
  });

  it("names Google when that is how the account was made", () => {
    expect(signupConflictCode({ password: null, accounts: [{ provider: "google" }] })).toBe(
      "EMAIL_IN_USE_GOOGLE"
    );
  });

  it("names GitHub when that is how the account was made", () => {
    expect(signupConflictCode({ password: null, accounts: [{ provider: "github" }] })).toBe(
      "EMAIL_IN_USE_GITHUB"
    );
  });

  it("prefers the password when the account has both", () => {
    // They are already typing a password and that password will work. Sending
    // them to Google instead would be the long way round for no reason.
    expect(
      signupConflictCode({ password: "$2a$12$hash", accounts: [{ provider: "google" }] })
    ).toBe("EMAIL_IN_USE_PASSWORD");
  });

  it("falls back to recovery when there is neither", () => {
    // A real state, not a defensive branch: our own `signIn` callback creates
    // the user row a moment before the adapter links the account to it.
    expect(signupConflictCode({ password: null, accounts: [] })).toBe("EMAIL_IN_USE");
    expect(signupConflictCode({})).toBe("EMAIL_IN_USE");
    expect(signupConflictCode({ password: null, accounts: null })).toBe("EMAIL_IN_USE");
  });

  it("treats an empty password hash as no password", () => {
    // An empty string is not a hash anyone can match, so pointing someone at
    // the password form with one would be sending them to a door that opens
    // onto nothing.
    expect(signupConflictCode({ password: "", accounts: [{ provider: "google" }] })).toBe(
      "EMAIL_IN_USE_GOOGLE"
    );
    expect(signupConflictCode({ password: "" })).toBe("EMAIL_IN_USE");
  });

  it("ignores a provider it has no message for", () => {
    expect(signupConflictCode({ password: null, accounts: [{ provider: "twitter" }] })).toBe(
      "EMAIL_IN_USE"
    );
  });

  it("recognises its own codes and nothing else", () => {
    for (const code of SIGNUP_CONFLICT_CODES) expect(isSignupConflictCode(code)).toBe(true);
    expect(isSignupConflictCode("RATE_LIMITED")).toBe(false);
    expect(isSignupConflictCode("EMAIL_IN_USE_TWITTER")).toBe(false);
    expect(isSignupConflictCode(undefined)).toBe(false);
    expect(isSignupConflictCode(409)).toBe(false);
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe("what the signup route does with a taken address", () => {
  const route = read("app/api/auth/signup/route.ts");

  it("answers 409 with a conflict code instead of a generic 201", () => {
    const branch = route.slice(
      route.indexOf("if (existingUser)"),
      route.indexOf("// Hash password")
    );
    expect(branch).toContain("signupConflictCode(existingUser)");
    expect(branch).toContain("status: 409");
    expect(branch).not.toContain("status: 201");
  });

  it("no longer claims the account may have been created", () => {
    // The hedge was the other half of the enumeration guard. Keeping it while
    // the branch above answers 409 would be a hedge about something already
    // said plainly.
    expect(route).not.toContain("If this email is available");
  });

  it("reads the account fields the decision needs, and no more", () => {
    const lookup = route.slice(
      route.indexOf("prisma.user.findUnique"),
      route.indexOf("if (existingUser)")
    );
    expect(lookup).toContain("password: true");
    expect(lookup).toContain("accounts: { select: { provider: true } }");
  });

  it("never returns the password hash", () => {
    // It is selected so its presence can be tested. It must not travel.
    const branch = route.slice(
      route.indexOf("if (existingUser)"),
      route.indexOf("// Hash password")
    );
    expect(branch).not.toMatch(/password:\s*existingUser/);
    expect(branch).not.toContain("existingUser.password");
  });

  it("still rate-limits before it says anything", () => {
    // Naming the provider is a bounded disclosure, and this is the bound:
    // 5 attempts per IP per 15 minutes, checked before the lookup runs.
    expect(route.indexOf("rateLimiters.auth.check")).toBeLessThan(
      route.indexOf("prisma.user.findUnique")
    );
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe("what the signup page does with that answer", () => {
  const signup = read("app/auth/signup/signup-content.tsx");

  it("stops before signing in", () => {
    // Calling signIn() with a password that was never this account's is exactly
    // how this used to end in a bare "sign-in error" on a signup form.
    const handler = signup.slice(
      signup.indexOf("if (!response.ok)"),
      signup.indexOf("// Sign in after")
    );
    expect(handler).toContain("isSignupConflictCode(data.code)");
    expect(handler).toContain("setConflict(data.code)");
    expect(handler).not.toContain("signIn(");
  });

  it("shows it in place rather than in a toast", () => {
    // A toast is gone in four seconds; the links in it go with it.
    const banner = signup.slice(signup.indexOf("{conflict && ("));
    expect(banner).toContain('role="alert"');
    expect(banner).toContain("auth.signupConflict.");
  });

  it("offers sign-in, carrying the address across", () => {
    expect(signup).toContain("/auth/signin?email=${encodeURIComponent(email)}");
  });

  it("offers password recovery only where there is a password to recover", () => {
    // On a Google account, "forgot your password?" is a question about
    // something that never existed.
    const banner = signup.slice(signup.indexOf("{conflict && ("));
    const forgot = banner.indexOf("forgotCta");
    const guard = banner.indexOf('conflict === "EMAIL_IN_USE_PASSWORD"');
    expect(guard).toBeGreaterThan(-1);
    expect(forgot).toBeGreaterThan(guard);
  });

  it("clears the notice when the address is edited", () => {
    // It names one address; once that is being changed it is advice about
    // somebody else's account.
    const emailInput = signup.slice(signup.indexOf('id="email"'), signup.indexOf('id="password"'));
    expect(emailInput).toContain("setConflict(null)");
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe("what the sign-in page says when it was sent an error", () => {
  const signin = read("app/auth/signin/signin-content.tsx");

  it.each([...SIGNIN_ERROR_CODES])("keeps %s as its own key", (code) => {
    expect(signInErrorKey(code)).toBe(code);
  });

  it("covers the codes that can actually land here", () => {
    // Every client-safe type whose kind is "signIn", plus `Configuration` (what
    // a sign-in-kind error that is not client-safe is flattened to) and
    // `SessionRequired` (appended by next-auth/react itself). `AccessDenied`
    // rides along for hand-written links.
    expect([...SIGNIN_ERROR_CODES].sort()).toEqual([
      "AccessDenied",
      "AccountNotLinked",
      "Configuration",
      "CredentialsSignin",
      "MissingCSRF",
      "OAuthAccountNotLinked",
      "OAuthCallbackError",
      "SessionRequired",
    ]);
  });

  it("falls back on anything else", () => {
    expect(signInErrorKey("Whatever")).toBe(AUTH_PAGE_ERROR_FALLBACK);
    expect(signInErrorKey(null)).toBe(AUTH_PAGE_ERROR_FALLBACK);
    expect(signInErrorKey("")).toBe(AUTH_PAGE_ERROR_FALLBACK);
    expect(signInErrorKey(7)).toBe(AUTH_PAGE_ERROR_FALLBACK);
  });

  it("refuses a near-miss instead of guessing", () => {
    // Loosening this would let whoever wrote the link choose which of our
    // sentences appears in an alert box under our logo.
    expect(signInErrorKey("credentialssignin")).toBe(AUTH_PAGE_ERROR_FALLBACK);
    expect(signInErrorKey("CredentialsSigninX")).toBe(AUTH_PAGE_ERROR_FALLBACK);
  });

  it("reads the parameter through the allow-list", () => {
    expect(signin).toContain("signInErrorKey(signInError)");
  });

  it("never renders the raw parameter", () => {
    const jsx = signin.slice(signin.indexOf("return ("));
    expect(jsx).not.toMatch(/\{\s*signInError\s*\}/);
    expect(jsx).not.toMatch(/searchParams/);
  });

  it("puts password recovery next to the password field", () => {
    // It used to sit in grey type at the foot of the page, under "Don't have an
    // account?", which is not where somebody who has just mistyped a password
    // is looking. And it must appear exactly once.
    const forgotLinks = [...signin.matchAll(/href="\/auth\/forgot-password"/g)];
    expect(forgotLinks).toHaveLength(1);
    expect(forgotLinks[0].index).toBeLessThan(signin.indexOf('id="password"'));
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe("the new copy exists in every locale", () => {
  const catalogs = Object.fromEntries(
    LOCALES.map((l) => [l, JSON.parse(read(`locales/${l}.json`))])
  ) as Record<(typeof LOCALES)[number], { auth: Record<string, Record<string, string>> }>;

  const conflictKeys = [...SIGNUP_CONFLICT_CODES, "title", "signInCta", "forgotCta"];
  const signinKeys = [...SIGNIN_ERROR_CODES, AUTH_PAGE_ERROR_FALLBACK];

  it.each(LOCALES)("%s defines every auth.signupConflict key", (locale) => {
    for (const key of conflictKeys) {
      expect(catalogs[locale].auth.signupConflict[key], `${locale}: ${key}`).toBeTruthy();
    }
  });

  it.each(LOCALES)("%s defines every auth.signinErrors key", (locale) => {
    for (const key of signinKeys) {
      expect(catalogs[locale].auth.signinErrors[key], `${locale}: ${key}`).toBeTruthy();
    }
  });

  it.each(LOCALES)("%s defines the signup divider label", (locale) => {
    expect(catalogs[locale].auth.signup.orWithEmail).toBeTruthy();
  });

  it("translates the copy rather than copying English across", () => {
    for (const locale of ["es", "fr"] as const) {
      expect(catalogs[locale].auth.signupConflict.EMAIL_IN_USE_GOOGLE).not.toBe(
        catalogs.en.auth.signupConflict.EMAIL_IN_USE_GOOGLE
      );
      expect(catalogs[locale].auth.signinErrors.CredentialsSignin).not.toBe(
        catalogs.en.auth.signinErrors.CredentialsSignin
      );
      expect(catalogs[locale].auth.signup.orWithEmail).not.toBe(
        catalogs.en.auth.signup.orWithEmail
      );
    }
  });

  it("no longer hardcodes the divider in the page", () => {
    expect(read("app/auth/signup/signup-content.tsx")).not.toContain('"or sign up with email"');
  });
});
