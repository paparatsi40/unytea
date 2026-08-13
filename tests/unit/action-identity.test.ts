import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Rate-limit identity for Server Actions.
 *
 * The bucket key is the whole of the rate limiter's protection, so anything an
 * attacker controls must stay out of it.
 */

const mockHeaders = vi.fn();
vi.mock("next/headers", () => ({ headers: () => mockHeaders() }));

import { getActionIdentifier } from "@/lib/actions/identity";

const withHeaders = (h: Record<string, string>) => {
  mockHeaders.mockResolvedValue(new Headers(h));
};

beforeEach(() => vi.clearAllMocks());

describe("getActionIdentifier", () => {
  it("keys an authenticated caller on their user id", async () => {
    withHeaders({ "x-forwarded-for": "1.2.3.4" });
    await expect(getActionIdentifier("user_1")).resolves.toBe("user:user_1");
  });

  it("ignores headers entirely for an authenticated caller", async () => {
    withHeaders({ "x-forwarded-for": "9.9.9.9", "user-agent": "anything" });
    await expect(getActionIdentifier("user_1")).resolves.toBe("user:user_1");
  });

  it("keys an anonymous caller on their IP", async () => {
    withHeaders({ "x-forwarded-for": "1.2.3.4" });
    await expect(getActionIdentifier(null)).resolves.toBe("anon:1.2.3.4");
  });

  it("takes the client IP from the left of x-forwarded-for", async () => {
    withHeaders({ "x-forwarded-for": "1.2.3.4, 10.0.0.1, 10.0.0.2" });
    await expect(getActionIdentifier(null)).resolves.toBe("anon:1.2.3.4");
  });

  it("falls back to x-real-ip", async () => {
    withHeaders({ "x-real-ip": "5.6.7.8" });
    await expect(getActionIdentifier(null)).resolves.toBe("anon:5.6.7.8");
  });

  it("falls back to a constant when no IP header is present", async () => {
    withHeaders({});
    await expect(getActionIdentifier(null)).resolves.toBe("anon:unknown");
  });

  /**
   * The regression this fix exists for: the user-agent is an attacker-controlled
   * request header. While it was part of the key, a script that randomised it
   * received a fresh bucket on every call, making the limit on public actions
   * unenforceable.
   */
  describe("user-agent must not affect the bucket", () => {
    it("gives two requests from one IP the same bucket despite different user-agents", async () => {
      withHeaders({ "x-forwarded-for": "1.2.3.4", "user-agent": "Mozilla/5.0 (first)" });
      const first = await getActionIdentifier(null);

      withHeaders({ "x-forwarded-for": "1.2.3.4", "user-agent": "curl/8.4.0 (second)" });
      const second = await getActionIdentifier(null);

      expect(first).toBe(second);
    });

    it("does not let a rotating user-agent manufacture new buckets", async () => {
      const keys = new Set<string>();
      for (let i = 0; i < 100; i++) {
        withHeaders({ "x-forwarded-for": "1.2.3.4", "user-agent": `agent-${i}` });
        keys.add(await getActionIdentifier(null));
      }
      expect(keys.size).toBe(1);
    });

    it("never embeds the user-agent in the key", async () => {
      withHeaders({ "x-forwarded-for": "1.2.3.4", "user-agent": "SentinelAgent/9" });
      await expect(getActionIdentifier(null)).resolves.not.toContain("SentinelAgent");
    });

    it("still separates distinct IPs", async () => {
      withHeaders({ "x-forwarded-for": "1.2.3.4", "user-agent": "same" });
      const a = await getActionIdentifier(null);
      withHeaders({ "x-forwarded-for": "5.6.7.8", "user-agent": "same" });
      const b = await getActionIdentifier(null);

      expect(a).not.toBe(b);
    });
  });
});
