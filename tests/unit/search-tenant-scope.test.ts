import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * H1 — cross-community content leak in `searchGlobal`.
 *
 * The posts and courses branches filtered only on `isPublished`/`deletedAt` and
 * discarded `ctx` entirely, so any authenticated user could search the full body
 * of posts, and the titles/descriptions of courses, inside private and paid
 * communities they had never joined.
 *
 * The seam's anonymous-only harness cannot catch this: the caller *is*
 * authenticated, and `searchGlobal` is legitimately `auth: "user"` because it
 * spans every community. The boundary has to live in the query.
 */

vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("@/lib/rate-limit", () => ({
  rateLimiters: new Proxy(
    {},
    { get: () => ({ check: async () => ({ success: true, remaining: 99, resetTime: 0 }) }) }
  ),
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { searchGlobal } from "@/app/actions/search";
import { admits, visibilityClauseFrom, type CommunityFixture } from "../helpers/visibility";

const CALLER = "user_caller";

const publicCommunity: CommunityFixture = { id: "c_public", isPrivate: false, members: [] };
const ownPrivateCommunity: CommunityFixture = {
  id: "c_own",
  isPrivate: true,
  members: [{ userId: CALLER, status: "ACTIVE" }],
};
const foreignPrivateCommunity: CommunityFixture = {
  id: "c_foreign",
  isPrivate: true,
  members: [{ userId: "someone_else", status: "ACTIVE" }],
};
const pendingPrivateCommunity: CommunityFixture = {
  id: "c_pending",
  isPrivate: true,
  members: [{ userId: CALLER, status: "PENDING" }],
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(auth).mockResolvedValue({ user: { id: CALLER, role: "USER" } } as never);
  vi.mocked(prisma.post.findMany).mockResolvedValue([]);
  vi.mocked(prisma.course.findMany).mockResolvedValue([]);
  vi.mocked(prisma.community.findMany).mockResolvedValue([]);
  vi.mocked(prisma.user.findMany).mockResolvedValue([]);
});

async function whereFor(model: "post" | "course") {
  await searchGlobal("secret", "all");
  const call = vi.mocked(prisma[model].findMany).mock.calls[0]?.[0];
  expect(call, `${model}.findMany was never called`).toBeDefined();
  return (call as { where: unknown }).where;
}

describe("searchGlobal — community visibility scope (H1)", () => {
  describe("the posts query is scoped", () => {
    it("carries a community-visibility clause", async () => {
      // Pre-fix this threw: the where had no community clause at all.
      expect(() => visibilityClauseFrom(undefined)).toThrow();
      const clause = visibilityClauseFrom(await whereFor("post"));
      expect(clause).toBeDefined();
    });

    it("binds the membership branch to the caller, not an arbitrary user", async () => {
      const clause = visibilityClauseFrom(await whereFor("post"));
      expect(JSON.stringify(clause)).toContain(CALLER);
    });

    it("admits public communities", async () => {
      const clause = visibilityClauseFrom(await whereFor("post"));
      expect(admits(clause, publicCommunity)).toBe(true);
    });

    it("admits a private community the caller is an ACTIVE member of", async () => {
      const clause = visibilityClauseFrom(await whereFor("post"));
      expect(admits(clause, ownPrivateCommunity)).toBe(true);
    });

    it("excludes a private community the caller does not belong to", async () => {
      const clause = visibilityClauseFrom(await whereFor("post"));
      expect(admits(clause, foreignPrivateCommunity)).toBe(false);
    });

    it("excludes a private community where the caller's membership is only PENDING", async () => {
      const clause = visibilityClauseFrom(await whereFor("post"));
      expect(admits(clause, pendingPrivateCommunity)).toBe(false);
    });
  });

  describe("the courses query is scoped", () => {
    it("carries a community-visibility clause bound to the caller", async () => {
      const clause = visibilityClauseFrom(await whereFor("course"));
      expect(JSON.stringify(clause)).toContain(CALLER);
    });

    it("admits public and own-private, excludes foreign-private", async () => {
      const clause = visibilityClauseFrom(await whereFor("course"));
      expect(admits(clause, publicCommunity)).toBe(true);
      expect(admits(clause, ownPrivateCommunity)).toBe(true);
      expect(admits(clause, foreignPrivateCommunity)).toBe(false);
    });
  });

  it("scopes to whichever caller is signed in", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "other_user", role: "USER" } } as never);
    const clause = visibilityClauseFrom(await whereFor("post"));

    // The same private community is foreign to this caller and their own to the first.
    expect(admits(clause, ownPrivateCommunity)).toBe(false);
    expect(
      admits(clause, {
        id: "c",
        isPrivate: true,
        members: [{ userId: "other_user", status: "ACTIVE" }],
      })
    ).toBe(true);
  });

  it("still restricts the communities branch to public ones", async () => {
    await searchGlobal("secret", "all");
    const where = vi.mocked(prisma.community.findMany).mock.calls[0][0]?.where as {
      AND: { isPrivate?: boolean }[];
    };
    expect(where.AND).toContainEqual({ isPrivate: false });
  });
});
