import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

/**
 * SEC-07 — the open transactional-email relay.
 *
 * `POST /api/email/send` authenticated but never authorized. It trusted the
 * client for the recipient, the community name, the join link and the entire
 * recap body, had no schema and no rate limit, and was a registered live route.
 * One free account could drive unlimited branded invite mail from the verified
 * Resend domain.
 *
 * It had zero callers in the codebase, so the root-cause fix was removal rather
 * than hardening: there was no flow to preserve. These tests pin that decision
 * — both that the endpoint is gone, and that no equivalent relay reappears.
 */

const REPO_ROOT = path.resolve(__dirname, "../..");
const APP_DIR = path.join(REPO_ROOT, "app");

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(entry.name)) out.push(p);
  }
  return out;
}

const appFiles = walk(APP_DIR);

function read(file: string): string {
  return fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n");
}

function rel(file: string): string {
  return path.relative(REPO_ROOT, file).split(path.sep).join("/");
}

describe("the email relay endpoint is gone", () => {
  it("app/api/email/send/route.ts no longer exists", () => {
    expect(fs.existsSync(path.join(APP_DIR, "api/email/send/route.ts"))).toBe(false);
  });

  it("no route handler remains anywhere under app/api/email", () => {
    expect(fs.existsSync(path.join(APP_DIR, "api/email"))).toBe(false);
  });
});

/**
 * The templates in lib/email.ts are kept — they are inert library functions, and
 * a future invite feature will want them. What must not come back is a
 * *client-reachable* path that sends them with caller-supplied content.
 */
describe("no client-reachable path can send invite or recap mail", () => {
  const RELAY_TEMPLATES = ["sendCommunityInviteEmail", "sendSessionRecapEmail"] as const;

  const routeHandlers = appFiles.filter((f) => /[\\/]route\.tsx?$/.test(f));
  const serverActionModules = appFiles.filter((f) =>
    /^(?:\s*(?:\/\/[^\n]*|\/\*[\s\S]*?\*\/))*\s*["']use server["']\s*;/.test(read(f))
  );

  it.each(RELAY_TEMPLATES)("%s is imported by no API route", (template) => {
    const offenders = routeHandlers.filter((f) => read(f).includes(template)).map(rel);
    expect(offenders).toEqual([]);
  });

  it.each(RELAY_TEMPLATES)("%s is imported by no Server Action module", (template) => {
    const offenders = serverActionModules.filter((f) => read(f).includes(template)).map(rel);
    expect(offenders).toEqual([]);
  });

  it("finds the route handlers and action modules it claims to scan", () => {
    // Guards against the two assertions above passing vacuously.
    expect(routeHandlers.length).toBeGreaterThan(20);
    expect(serverActionModules.length).toBeGreaterThan(20);
  });
});

/**
 * Welcome mail is still sent — by the signup route, server-side, to the address
 * that just registered. That is the correct shape and must keep working.
 */
describe("legitimate server-side mail is unaffected", () => {
  it("signup still sends the welcome email", () => {
    const signup = read(path.join(APP_DIR, "api/auth/signup/route.ts"));
    expect(signup).toContain("sendWelcomeEmail");
  });

  it("forgot-password still sends a password email", () => {
    const forgot = read(path.join(APP_DIR, "api/auth/forgot-password/route.ts"));
    // Two templates now: "reset" for an account that has a password, "set" for
    // one created through a provider, which used to be turned away in silence.
    expect(forgot).toContain("sendPasswordResetEmail");
    expect(forgot).toContain("sendSetPasswordEmail");
  });

  it("neither derives the recipient from a client-supplied 'to' field", () => {
    // The relay's defining flaw was taking `to` from the request body.
    const signup = read(path.join(APP_DIR, "api/auth/signup/route.ts"));
    const forgot = read(path.join(APP_DIR, "api/auth/forgot-password/route.ts"));

    // signup mails the address being registered.
    expect(signup).toContain("sendWelcomeEmail(email");

    // forgot-password mails the address resolved from the database, never the
    // raw input. It picks its template through a local alias now, so every call
    // site is enumerated rather than one spelling being matched — the property
    // is "the recipient is the row we found", not "this function name appears".
    const recipients = [
      ...forgot.matchAll(/\b(?:sendPasswordResetEmail|sendSetPasswordEmail|send)\(\s*([\w.]+)/g),
    ].map((m) => m[1]);

    expect(recipients.length).toBeGreaterThan(0);
    for (const recipient of recipients) {
      expect(recipient, "forgot-password must mail the address from the database").toBe(
        "user.email"
      );
    }
  });
});
