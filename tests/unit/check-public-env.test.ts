import { describe, it, expect } from "vitest";
// Plain-JS guard script, intentionally dependency-free so it can run via
// `node scripts/check-public-env.mjs` in CI and in a pre-commit hook without an install.
import { parseEnvFile, findViolations } from "../../scripts/check-public-env.mjs";

/**
 * Regression tests for SEC-01. A live Stripe secret key was stored as
 * NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY, which Next.js would have inlined into the
 * browser bundle. These tests pin the guard that prevents a recurrence.
 */
describe("check-public-env guard", () => {
  describe("parseEnvFile", () => {
    it("parses plain, quoted, and exported assignments", () => {
      const entries = parseEnvFile(
        [
          "PLAIN=value",
          'DOUBLE="quoted value"',
          "SINGLE='quoted value'",
          "export EXPORTED=exported-value",
        ].join("\n")
      );
      expect(entries).toEqual([
        { name: "PLAIN", value: "value" },
        { name: "DOUBLE", value: "quoted value" },
        { name: "SINGLE", value: "quoted value" },
        { name: "EXPORTED", value: "exported-value" },
      ]);
    });

    it("skips comments and blank lines", () => {
      const entries = parseEnvFile("# a comment\n\n   \nREAL=1\n");
      expect(entries).toEqual([{ name: "REAL", value: "1" }]);
    });

    it("keeps '=' characters inside a value", () => {
      const entries = parseEnvFile("TOKEN=abc=def==");
      expect(entries).toEqual([{ name: "TOKEN", value: "abc=def==" }]);
    });
  });

  describe("findViolations", () => {
    it("flags the exact SEC-01 case: a Stripe secret key under a public name", () => {
      const violations = findViolations([
        { name: "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", value: "sk_live_examplekeymaterial" },
      ]);
      expect(violations).toHaveLength(1);
      expect(violations[0].name).toBe("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY");
      expect(violations[0].reason).toContain("Stripe/OpenAI secret key");
    });

    it("never echoes the offending value", () => {
      const secret = "sk_live_supersecretmaterial";
      const violations = findViolations([{ name: "NEXT_PUBLIC_X", value: secret }]);
      expect(JSON.stringify(violations)).not.toContain(secret);
    });

    it.each([
      ["sk_test_abc", "Stripe/OpenAI secret key"],
      ["sk-proj-abc", "OpenAI secret key"],
      ["rk_live_abc", "Stripe restricted key"],
      ["whsec_abc", "Stripe webhook secret"],
      ["re_abc123", "Resend API key"],
      ["ghp_abc123", "GitHub personal access token"],
      ["github_pat_abc", "GitHub fine-grained PAT"],
      ["xoxb-abc", "Slack bot token"],
      ["AKIAIOSFODNN7EXAMPLE", "AWS access key id"],
      ["shpat_abc", "Shopify access token"],
    ])("flags secret prefix %s", (value, expectedLabel) => {
      const violations = findViolations([{ name: "NEXT_PUBLIC_THING", value }]);
      expect(violations).toHaveLength(1);
      expect(violations[0].reason).toContain(expectedLabel);
    });

    it.each([
      ["postgresql://user:pw@host/db", "PostgreSQL connection string"],
      ["postgres://user:pw@host/db", "PostgreSQL connection string"],
      ["mysql://user:pw@host/db", "MySQL connection string"],
      ["mongodb+srv://user:pw@host/db", "MongoDB connection string"],
      ["rediss://user:pw@host:6379", "Redis connection string"],
      ["-----BEGIN RSA PRIVATE KEY-----", "PEM private key block"],
    ])("flags connection-string / key material %s", (value, expectedLabel) => {
      const violations = findViolations([{ name: "NEXT_PUBLIC_THING", value }]);
      expect(violations.length).toBeGreaterThanOrEqual(1);
      expect(violations.some((v: { reason: string }) => v.reason.includes(expectedLabel))).toBe(true);
    });

    it.each([["NEXT_PUBLIC_API_SECRET"], ["NEXT_PUBLIC_VAPID_PRIVATE_KEY"], ["NEXT_PUBLIC_DB_PASSWORD"]])(
      "flags secret-shaped variable name %s regardless of value",
      (name) => {
        const violations = findViolations([{ name, value: "harmless" }]);
        expect(violations).toHaveLength(1);
      }
    );

    it("allows the public variables this project legitimately ships", () => {
      const violations = findViolations([
        { name: "NEXT_PUBLIC_APP_URL", value: "https://www.unytea.com" },
        { name: "NEXT_PUBLIC_PUSHER_KEY", value: "abc123def456" },
        { name: "NEXT_PUBLIC_PUSHER_CLUSTER", value: "us2" },
        { name: "NEXT_PUBLIC_STRIPE_CREATOR_PRICE_ID", value: "price_1ABCdef" },
        { name: "NEXT_PUBLIC_VAPID_PUBLIC_KEY", value: "BEl62iUYgUivxIkv69yViEuiBIa" },
        { name: "NEXT_PUBLIC_LIVEKIT_URL", value: "wss://unytea.livekit.cloud" },
      ]);
      expect(violations).toEqual([]);
    });

    it("does not confuse a publishable key with a secret key", () => {
      const violations = findViolations([
        { name: "NEXT_PUBLIC_STRIPE_PK", value: "pk_live_51ABCdefGHI" },
      ]);
      expect(violations).toEqual([]);
    });

    it("ignores secrets on non-public variable names", () => {
      const violations = findViolations([
        { name: "STRIPE_SECRET_KEY", value: "sk_live_abc" },
        { name: "DATABASE_URL", value: "postgresql://user:pw@host/db" },
      ]);
      expect(violations).toEqual([]);
    });
  });
});
