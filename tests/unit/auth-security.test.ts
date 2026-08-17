import { describe, it, expect, beforeAll } from "vitest";
import fs from "fs";
import path from "path";

// Structural assertions have to read code, not prose: a comment explaining a
// pattern quotes it literally and would match. Same helper as
// tests/unit/livekit-room-options.test.ts.
function code(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

describe("Auth Security Checks", () => {
  let authFileContent: string;
  let credentialsFileContent: string;
  beforeAll(() => {
    authFileContent = fs.readFileSync(path.resolve(__dirname, "../../lib/auth.ts"), "utf-8");
    // The credentials `authorize` path lives in its own module so it can be
    // exercised behaviourally — see tests/unit/auth-flows.test.ts, which is the
    // real coverage. The source assertions below remain as cheap tripwires.
    credentialsFileContent = fs.readFileSync(
      path.resolve(__dirname, "../../lib/auth-credentials.ts"),
      "utf-8"
    );
  });
  it("should enable allowDangerousEmailAccountLinking at most once", () => {
    // This was a blanket ban. Google now carries the flag deliberately: it
    // verifies email ownership, so linking an OAuth account to the existing
    // password account for the same verified address is safe, and without it a
    // user who signed up by email hits OAuthAccountNotLinked forever.
    //
    // The ban is narrowed rather than dropped, because the danger the original
    // test guarded against is real for providers that do NOT verify ownership.
    // Which provider carries it is asserted behaviourally against the config
    // handed to NextAuth — see tests/unit/oauth-provider-gating.test.tsx. This
    // remains a cheap tripwire against it spreading to a second provider.
    const occurrences = code(authFileContent).split("allowDangerousEmailAccountLinking").length - 1;
    expect(occurrences).toBe(1);
  });
  it("should use JWT session strategy", () => {
    expect(authFileContent).toContain('strategy: "jwt"');
  });
  it("should have httpOnly cookies", () => {
    expect(authFileContent).toContain("httpOnly: true");
  });
  it("should have secure cookies in production", () => {
    // Was asserted as `secure: process.env.NODE_ENV === "production"`. That is
    // the wrong question and it disagreed with @auth/core, which derives the
    // same decision from the auth URL's protocol for every cookie it names
    // itself; where the two disagreed the browser dropped the __Host- CSRF
    // cookie and signout was silently refused. Both now come from
    // lib/auth-cookies.ts, which is asserted directly in logout-flow.test.ts.
    expect(authFileContent).toContain("secure: shouldUseSecureCookies()");
    expect(authFileContent).not.toContain('process.env.NODE_ENV === "production"');
  });
  it("should have sameSite policy", () => {
    expect(authFileContent).toContain('sameSite: "lax"');
  });
  it("should validate with Zod", () => {
    expect(credentialsFileContent).toContain("credentialsSchema.parse");
  });
  it("should hash passwords with bcrypt", () => {
    expect(credentialsFileContent).toContain("bcrypt.compare");
  });
  it("should not throw on login failure", () => {
    const section = credentialsFileContent.split("authorizeCredentials")[1] || "";
    expect(section).not.toContain("throw ");
  });
  it("should keep the constant-time dummy hash that blocks user enumeration", () => {
    expect(credentialsFileContent).toContain("FAKE_BCRYPT_HASH");
  });
});

describe("Next.js Config Security", () => {
  let configContent: string;
  beforeAll(() => {
    configContent = fs.readFileSync(path.resolve(__dirname, "../../next.config.mjs"), "utf-8");
  });
  it("should NOT have wildcard image domains", () => {
    expect(configContent).not.toContain('hostname: "**"');
  });
  it("should have reactStrictMode enabled", () => {
    expect(configContent).toContain("reactStrictMode: true");
  });
  it("should whitelist specific image domains", () => {
    [
      "utfs.io",
      "uploadthing.com",
      "lh3.googleusercontent.com",
      "avatars.githubusercontent.com",
    ].forEach((d) => expect(configContent).toContain(d));
  });
});

describe("Environment Config Security", () => {
  it("should not reference Clerk", () => {
    const p = path.resolve(__dirname, "../../.env.example");
    if (fs.existsSync(p)) {
      expect(fs.readFileSync(p, "utf-8")).not.toContain("CLERK_");
    }
  });
});

describe("Cron Routes - No Query Param Secrets", () => {
  const routes = [
    "app/api/cron/sessions/route.ts",
    "app/api/cron/session-reminders/route.ts",
    "app/api/cron/autopilot/route.ts",
  ];
  for (const route of routes) {
    it(route + " should not read secrets from query params", () => {
      const p = path.resolve(__dirname, "../../", route);
      if (fs.existsSync(p)) {
        const c = fs.readFileSync(p, "utf-8");
        expect(c).not.toContain('searchParams.get("secret")');
      }
    });
  }
});

describe("Signup Route - No Email Enumeration", () => {
  let content: string;
  beforeAll(() => {
    content = fs.readFileSync(
      path.resolve(__dirname, "../../app/api/auth/signup/route.ts"),
      "utf-8"
    );
  });
  it("should not return Email already registered", () => {
    expect(content).not.toContain("already registered");
  });
  it("should have rate limiting", () => {
    expect(content).toContain("rateLimiters");
    expect(content).toContain("rateLimitOk");
  });
  it("should not expose user data in response", () => {
    expect(content).not.toMatch(/user:\s*\{[^}]*id:/);
  });
});

describe("canUsersDirectMessage — PD V1 §5 Cat B Interpretation B", () => {
  let messagesFileContent: string;
  beforeAll(() => {
    messagesFileContent = fs.readFileSync(
      path.resolve(__dirname, "../../app/actions/messages.ts"),
      "utf-8"
    );
  });
  it("requires communityId param (non-optional)", () => {
    expect(messagesFileContent).toMatch(
      /canUsersDirectMessage\([\s\S]*?communityId:\s*string\s*\)/
    );
  });
  it("checks Member.role for OWNER per Cat B canonical pattern", () => {
    expect(messagesFileContent).toMatch(/role\s*===\s*["']OWNER["']/);
  });
  it("implements XOR pattern (exactly one party is OWNER)", () => {
    expect(messagesFileContent).toMatch(/senderIsOwner\s*!==\s*recipientIsOwner/);
  });
  it("rejects self-DM", () => {
    expect(messagesFileContent).toMatch(/senderId\s*===\s*recipientId/);
  });
  it("references PD V1 Cat B in doc comment", () => {
    expect(messagesFileContent).toContain("Cat B");
  });
});
