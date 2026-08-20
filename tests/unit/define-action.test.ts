import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";

/**
 * Unit coverage for the SEC-02 authorization seam.
 *
 * Every assertion here is a property the 224 migrated actions inherit, so a
 * regression in this file is a regression in the whole action layer.
 */

const mockRateLimitCheck = vi.fn();
vi.mock("@/lib/rate-limit", () => ({
  rateLimiters: {
    api: { check: (...a: unknown[]) => mockRateLimitCheck(...a) },
    general: { check: (...a: unknown[]) => mockRateLimitCheck(...a) },
    create: { check: (...a: unknown[]) => mockRateLimitCheck(...a) },
    message: { check: (...a: unknown[]) => mockRateLimitCheck(...a) },
    ai: { check: (...a: unknown[]) => mockRateLimitCheck(...a) },
    auth: { check: (...a: unknown[]) => mockRateLimitCheck(...a) },
    cspReport: { check: (...a: unknown[]) => mockRateLimitCheck(...a) },
  },
}));

const mockHeaders = vi.fn();
vi.mock("next/headers", () => ({ headers: () => mockHeaders() }));

const mockCaptureException = vi.fn();
vi.mock("@sentry/nextjs", () => ({
  captureException: (...a: unknown[]) => mockCaptureException(...a),
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { defineAction } from "@/lib/actions/define-action";
import { makeMemberRow, makeCommunityRow } from "../helpers/authz";

const asSession = (over: Record<string, unknown> = {}) => ({
  user: { id: "user_1", role: "USER", ...over },
});

beforeEach(() => {
  vi.clearAllMocks();
  mockRateLimitCheck.mockResolvedValue({ success: true, remaining: 10, resetTime: Date.now() });
  mockHeaders.mockResolvedValue(
    new Headers({ "x-forwarded-for": "1.2.3.4", "user-agent": "test" })
  );
  vi.mocked(auth).mockResolvedValue(asSession() as never);
  vi.mocked(prisma.community.findUnique).mockResolvedValue(makeCommunityRow());
  vi.mocked(prisma.member.findUnique).mockResolvedValue(makeMemberRow());
});

describe("defineAction — auth: public", () => {
  it("runs for an anonymous caller", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const action = defineAction({ name: "pub", auth: "public", args: [] }, async (ctx) => ({
      success: true as const,
      userId: ctx.userId,
    }));

    await expect(action()).resolves.toEqual({ success: true, userId: null });
  });

  it("still exposes the identity when one happens to be present", async () => {
    const action = defineAction({ name: "pub", auth: "public", args: [] }, async (ctx) => ({
      success: true as const,
      userId: ctx.userId,
    }));

    await expect(action()).resolves.toEqual({ success: true, userId: "user_1" });
  });
});

describe("defineAction — auth: user", () => {
  const action = defineAction({ name: "userAction", auth: "user", args: [] }, async (ctx) => ({
    success: true as const,
    userId: ctx.userId,
  }));

  it("rejects an anonymous caller with UNAUTHORIZED", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    await expect(action()).resolves.toMatchObject({ success: false, code: "UNAUTHORIZED" });
  });

  it("rejects a session with no user id", async () => {
    vi.mocked(auth).mockResolvedValue({ user: {} } as never);
    await expect(action()).resolves.toMatchObject({ success: false, code: "UNAUTHORIZED" });
  });

  it("passes the server-derived identity to the handler", async () => {
    await expect(action()).resolves.toEqual({ success: true, userId: "user_1" });
  });

  it("never runs the handler when unauthenticated", async () => {
    const handler = vi.fn().mockResolvedValue({ success: true });
    const guarded = defineAction({ name: "g", auth: "user", args: [] }, handler);
    vi.mocked(auth).mockResolvedValue(null as never);

    await guarded();

    expect(handler).not.toHaveBeenCalled();
  });
});

describe("defineAction — auth: member", () => {
  const action = defineAction(
    {
      name: "memberAction",
      auth: "member",
      args: [z.string()],
      community: ([communityId]) => communityId,
    },
    async (ctx) => ({
      success: true as const,
      member: ctx.member?.role,
      communityId: ctx.communityId,
    })
  );

  it("rejects an anonymous caller", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    await expect(action("community_1")).resolves.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("rejects an authenticated non-member with FORBIDDEN", async () => {
    vi.mocked(prisma.member.findUnique).mockResolvedValue(null);
    await expect(action("community_1")).resolves.toMatchObject({
      success: false,
      code: "FORBIDDEN",
    });
  });

  it("rejects a member whose status is not ACTIVE", async () => {
    vi.mocked(prisma.member.findUnique).mockResolvedValue(makeMemberRow({ status: "PENDING" }));
    await expect(action("community_1")).resolves.toMatchObject({ code: "FORBIDDEN" });
  });

  it("admits an ACTIVE member and exposes the membership row", async () => {
    await expect(action("community_1")).resolves.toEqual({
      success: true,
      member: "MEMBER",
      communityId: "community_1",
    });
  });

  it("returns NOT_FOUND when the resolver cannot find the community", async () => {
    const unresolvable = defineAction(
      { name: "x", auth: "member", args: [z.string()], community: () => null },
      async () => ({ success: true as const })
    );
    await expect(unresolvable("nope")).resolves.toMatchObject({ code: "NOT_FOUND" });
  });

  it("throws at definition time if a member action has no community resolver", () => {
    expect(() =>
      defineAction({ name: "bad", auth: "member", args: [] }, async () => ({
        success: true as const,
      }))
    ).toThrow(/requires a `community` resolver/);
  });

  describe("paywall gate (SEC-08)", () => {
    it("blocks a non-owner member when the community is paywall-locked", async () => {
      vi.mocked(prisma.community.findUnique).mockResolvedValue(
        makeCommunityRow({ paywallLocked: true, ownerId: "someone_else" })
      );
      await expect(action("community_1")).resolves.toMatchObject({ code: "PAYWALL_LOCKED" });
    });

    it("lets the owner through so they can resolve billing", async () => {
      vi.mocked(prisma.community.findUnique).mockResolvedValue(
        makeCommunityRow({ paywallLocked: true, ownerId: "user_1" })
      );
      await expect(action("community_1")).resolves.toMatchObject({ success: true });
    });

    it("can be waived explicitly for billing actions", async () => {
      vi.mocked(prisma.community.findUnique).mockResolvedValue(
        makeCommunityRow({ paywallLocked: true, ownerId: "someone_else" })
      );
      const billing = defineAction(
        {
          name: "billing",
          auth: "member",
          args: [z.string()],
          community: ([id]) => id,
          allowPaywallLocked: true,
        },
        async () => ({ success: true as const })
      );
      await expect(billing("community_1")).resolves.toMatchObject({ success: true });
    });
  });
});

describe("defineAction — auth: admin", () => {
  const communityAdmin = defineAction(
    {
      name: "adminAction",
      auth: "admin",
      args: [z.string()],
      community: ([id]) => id,
    },
    async () => ({ success: true as const })
  );

  it("rejects a plain member of the community", async () => {
    vi.mocked(prisma.member.findUnique).mockResolvedValue(makeMemberRow({ role: "MEMBER" }));
    await expect(communityAdmin("community_1")).resolves.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects a MODERATOR by default", async () => {
    vi.mocked(prisma.member.findUnique).mockResolvedValue(makeMemberRow({ role: "MODERATOR" }));
    await expect(communityAdmin("community_1")).resolves.toMatchObject({ code: "FORBIDDEN" });
  });

  it("admits an ADMIN", async () => {
    vi.mocked(prisma.member.findUnique).mockResolvedValue(makeMemberRow({ role: "ADMIN" }));
    await expect(communityAdmin("community_1")).resolves.toMatchObject({ success: true });
  });

  it("admits an OWNER", async () => {
    vi.mocked(prisma.member.findUnique).mockResolvedValue(makeMemberRow({ role: "OWNER" }));
    await expect(communityAdmin("community_1")).resolves.toMatchObject({ success: true });
  });

  it("honours a widened `roles` list", async () => {
    const moderatorOk = defineAction(
      {
        name: "mod",
        auth: "admin",
        args: [z.string()],
        community: ([id]) => id,
        roles: ["OWNER", "ADMIN", "MODERATOR"],
      },
      async () => ({ success: true as const })
    );
    vi.mocked(prisma.member.findUnique).mockResolvedValue(makeMemberRow({ role: "MODERATOR" }));
    await expect(moderatorOk("community_1")).resolves.toMatchObject({ success: true });
  });

  describe("allowPlatformAdmin — cross-tenant moderation", () => {
    const moderate = defineAction(
      {
        name: "moderate",
        auth: "admin",
        args: [z.string()],
        community: ([id]) => (id === "orphan" ? null : id),
        allowPlatformAdmin: true,
      },
      async (ctx) => ({ success: true as const, communityId: ctx.communityId })
    );

    it("lets platform staff act on a community they are not a member of", async () => {
      vi.mocked(auth).mockResolvedValue(asSession({ role: "ADMIN" }) as never);
      vi.mocked(prisma.member.findUnique).mockResolvedValue(null);

      await expect(moderate("community_1")).resolves.toMatchObject({ success: true });
    });

    it("lets platform staff act on a target with no community (USER/MESSAGE reports)", async () => {
      vi.mocked(auth).mockResolvedValue(asSession({ role: "ADMIN" }) as never);

      await expect(moderate("orphan")).resolves.toMatchObject({
        success: true,
        communityId: null,
      });
    });

    it("still blocks a non-admin who is not a community admin", async () => {
      vi.mocked(prisma.member.findUnique).mockResolvedValue(makeMemberRow({ role: "MEMBER" }));

      await expect(moderate("community_1")).resolves.toMatchObject({ code: "FORBIDDEN" });
    });

    it("still returns NOT_FOUND to a non-admin when the target has no community", async () => {
      vi.mocked(prisma.member.findUnique).mockResolvedValue(makeMemberRow({ role: "ADMIN" }));

      await expect(moderate("orphan")).resolves.toMatchObject({ code: "NOT_FOUND" });
    });

    it("does not bypass anything unless the action opts in", async () => {
      vi.mocked(auth).mockResolvedValue(asSession({ role: "ADMIN" }) as never);
      vi.mocked(prisma.member.findUnique).mockResolvedValue(null);

      await expect(communityAdmin("community_1")).resolves.toMatchObject({ code: "FORBIDDEN" });
    });
  });

  describe("platform admin (no community resolver)", () => {
    const platformAdmin = defineAction({ name: "platform", auth: "admin", args: [] }, async () => ({
      success: true as const,
    }));

    it("rejects a normal user", async () => {
      vi.mocked(auth).mockResolvedValue(asSession({ role: "USER" }) as never);
      await expect(platformAdmin()).resolves.toMatchObject({ code: "FORBIDDEN" });
    });

    it("admits a platform ADMIN", async () => {
      vi.mocked(auth).mockResolvedValue(asSession({ role: "ADMIN" }) as never);
      await expect(platformAdmin()).resolves.toMatchObject({ success: true });
    });
  });
});

describe("defineAction — input validation", () => {
  const action = defineAction(
    { name: "validated", auth: "user", args: [z.string().min(3).max(10), z.number().int()] },
    async (_ctx, text, count) => ({ success: true as const, text, count })
  );

  it("accepts values that satisfy the schemas", async () => {
    await expect(action("hello", 3)).resolves.toEqual({ success: true, text: "hello", count: 3 });
  });

  it("rejects a value that violates a schema", async () => {
    await expect(action("ab", 3)).resolves.toMatchObject({ success: false, code: "VALIDATION" });
  });

  it("enforces the .max() bound on user content", async () => {
    await expect(action("x".repeat(50), 3)).resolves.toMatchObject({ code: "VALIDATION" });
  });

  it("rejects a wrong-typed argument", async () => {
    await expect(action("hello", "3" as unknown as number)).resolves.toMatchObject({
      code: "VALIDATION",
    });
  });

  it("reports field-level issues keyed by argument index", async () => {
    const result = await action("ab", 1.5);
    expect(result).toMatchObject({ code: "VALIDATION" });
    expect((result as { issues: Record<string, string[]> }).issues).toHaveProperty("0");
  });

  it("never runs the handler on invalid input", async () => {
    const handler = vi.fn().mockResolvedValue({ success: true });
    const guarded = defineAction({ name: "g2", auth: "user", args: [z.string().min(3)] }, handler);

    await guarded("x");

    expect(handler).not.toHaveBeenCalled();
  });

  it("rejects extra positional arguments", async () => {
    const single = defineAction({ name: "single", auth: "user", args: [z.string()] }, async () => ({
      success: true as const,
    }));
    await expect(
      (single as unknown as (...a: unknown[]) => Promise<unknown>)("a", "b")
    ).resolves.toMatchObject({ code: "VALIDATION" });
  });
});

describe("defineAction — rate limiting", () => {
  it("engages the limiter on every call", async () => {
    const action = defineAction({ name: "limited", auth: "user", args: [] }, async () => ({
      success: true as const,
    }));

    await action();

    expect(mockRateLimitCheck).toHaveBeenCalledTimes(1);
  });

  it("keys the bucket per action name and identity", async () => {
    const action = defineAction({ name: "limited", auth: "user", args: [] }, async () => ({
      success: true as const,
    }));

    await action();

    expect(mockRateLimitCheck).toHaveBeenCalledWith("action:limited:user:user_1");
  });

  it("falls back to the IP for anonymous callers, ignoring the attacker-controlled user-agent", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const action = defineAction({ name: "pub", auth: "public", args: [] }, async () => ({
      success: true as const,
    }));

    await action();

    expect(mockRateLimitCheck).toHaveBeenCalledWith("action:pub:anon:1.2.3.4");
  });

  it("returns RATE_LIMITED and skips the handler once the bucket is empty", async () => {
    mockRateLimitCheck.mockResolvedValue({ success: false, remaining: 0, resetTime: Date.now() });
    const handler = vi.fn().mockResolvedValue({ success: true });
    const action = defineAction({ name: "limited", auth: "user", args: [] }, handler);

    await expect(action()).resolves.toMatchObject({ success: false, code: "RATE_LIMITED" });
    expect(handler).not.toHaveBeenCalled();
  });

  it("checks the limit before touching the database", async () => {
    mockRateLimitCheck.mockResolvedValue({ success: false, remaining: 0, resetTime: Date.now() });
    const action = defineAction(
      { name: "limited", auth: "member", args: [z.string()], community: ([id]) => id },
      async () => ({ success: true as const })
    );

    await action("community_1");

    expect(prisma.member.findUnique).not.toHaveBeenCalled();
  });

  it("can be opted out of explicitly", async () => {
    const action = defineAction(
      { name: "unlimited", auth: "user", args: [], rateLimit: false },
      async () => ({ success: true as const })
    );

    await action();

    expect(mockRateLimitCheck).not.toHaveBeenCalled();
  });
});

describe("defineAction — error handling", () => {
  it("converts a thrown ForbiddenError into a FORBIDDEN failure", async () => {
    const { ForbiddenError } = await import("@/lib/authorization");
    const action = defineAction({ name: "boom", auth: "user", args: [] }, async () => {
      throw new ForbiddenError("nope");
    });

    await expect(action()).resolves.toMatchObject({
      success: false,
      code: "FORBIDDEN",
      error: "nope",
    });
  });

  it("converts a thrown UnauthorizedError into an UNAUTHORIZED failure", async () => {
    const { UnauthorizedError } = await import("@/lib/authorization");
    const action = defineAction({ name: "boom", auth: "user", args: [] }, async () => {
      throw new UnauthorizedError("signed out");
    });

    await expect(action()).resolves.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("reports an unexpected error to Sentry instead of swallowing it", async () => {
    const action = defineAction({ name: "boom", auth: "user", args: [] }, async () => {
      throw new Error("database on fire");
    });

    const result = await action();

    expect(result).toMatchObject({ success: false, code: "INTERNAL" });
    expect(mockCaptureException).toHaveBeenCalledTimes(1);
    expect(mockCaptureException.mock.calls[0][1]).toMatchObject({ tags: { action: "boom" } });
  });

  it("does not leak the internal error message to the caller", async () => {
    const action = defineAction({ name: "boom", auth: "user", args: [] }, async () => {
      throw new Error("connection string postgres://user:pw@host/db failed");
    });

    const result = await action();

    expect(JSON.stringify(result)).not.toContain("postgres://");
  });
});
