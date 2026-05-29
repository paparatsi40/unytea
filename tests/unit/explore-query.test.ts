import { beforeEach, describe, expect, it, vi } from "vitest";
import { subDays } from "date-fns";

// Override the shared setup mock — explore query touches several models the
// shared stub in tests/setup.ts does not declare (community.count,
// comment.findMany).
vi.mock("@/lib/prisma", () => ({
  prisma: {
    community: { findMany: vi.fn(), count: vi.fn() },
    post: { findMany: vi.fn() },
    comment: { findMany: vi.fn() },
    member: { findMany: vi.fn() },
    mentorSession: { findMany: vi.fn() },
  },
}));

import { prisma } from "@/lib/prisma";
import { getExploreCommunities } from "@/lib/explore-query";

// ---------------------------------------------------------------------------
// Test helpers — build fixtures and wire up the 5 batched prisma calls in a
// single `setup()` so each test reads as data-in / response-out.

const NOW = new Date("2026-05-28T12:00:00Z");
const FIFTEEN_DAYS_AGO = subDays(NOW, 15);
const TWO_DAYS_FROM_NOW = subDays(NOW, -2);
const FIVE_DAYS_AGO = subDays(NOW, 5);
const TEN_DAYS_AGO = subDays(NOW, 10);

type CandidateOverrides = Partial<{
  id: string;
  name: string;
  slug: string;
  description: string | null;
  coverImageUrl: string | null;
  imageUrl: string | null;
  category: string | null;
  language: string | null;
  isPaid: boolean;
  memberCount: number;
  pricing: unknown;
  primaryColor: string | null;
  secondaryColor: string | null;
  ownerId: string;
  ownerTitle: string | null;
  createdAt: Date;
}>;

// Spread preserves explicit null override values (vs `??` which would replace
// `null` with the fallback — important for "force this field to null" fixtures).
function makeCandidate(over: CandidateOverrides = {}) {
  const id = over.id ?? "qb-pass";
  const defaults = {
    id,
    name: "Healthy Community",
    slug: id,
    description: "A community that meets all 5 quality criteria." as string | null,
    coverImageUrl: "https://example.com/cover.jpg" as string | null,
    imageUrl: null as string | null,
    category: "HEALTH_WELLNESS" as string | null,
    language: "en" as string | null,
    isPaid: false,
    memberCount: 50,
    pricing: null as unknown,
    primaryColor: null as string | null,
    secondaryColor: null as string | null,
    ownerId: `owner-${id}`,
    ownerTitle: "Founder" as string | null,
    createdAt: FIFTEEN_DAYS_AGO,
  };
  const merged = { ...defaults, ...over, id };
  return {
    ...merged,
    owner: {
      id: merged.ownerId,
      name: "Jane Doe",
      image: null as string | null,
    },
  };
}

type SetupOpts = {
  candidates: ReturnType<typeof makeCandidate>[];
  // Active authors per community — used to satisfy/violate criterion 2.
  // Default: 3 unique authors per candidate (passes).
  authorsByCommunity?: Record<string, string[]>;
  // Upcoming sessions per community. Default: 1 session in 2 days each.
  upcomingByCommunity?: Record<string, { scheduledAt: Date; title: string }[]>;
  totalCount?: number;
};

function setup(opts: SetupOpts) {
  const {
    candidates,
    authorsByCommunity,
    upcomingByCommunity,
    totalCount = candidates.length,
  } = opts;

  vi.mocked(prisma.community.findMany).mockResolvedValue(candidates as never);
  vi.mocked(prisma.community.count).mockResolvedValue(totalCount as never);

  // Build posts that emit the desired set of distinct authors per community.
  const posts = candidates.flatMap((c) => {
    const authors = authorsByCommunity?.[c.id] ?? ["a", "b", "c"];
    return authors.map((authorId, i) => ({
      communityId: c.id,
      authorId,
      createdAt: subDays(NOW, (i + 1) * 2), // 2, 4, 6, ... days ago
    }));
  });
  vi.mocked(prisma.post.findMany).mockResolvedValue(posts as never);

  // No comments by default.
  vi.mocked(prisma.comment.findMany).mockResolvedValue([] as never);

  // Sample members: 5 dummy members per community, none owners.
  const members = candidates.flatMap((c) =>
    Array.from({ length: 5 }).map((_, i) => ({
      communityId: c.id,
      userId: `member-${c.id}-${i}`,
      user: { id: `member-${c.id}-${i}`, name: `Member ${i}`, image: null },
    }))
  );
  vi.mocked(prisma.member.findMany).mockResolvedValue(members as never);

  // Upcoming sessions: 1 each unless overridden.
  const sessions = candidates.flatMap((c) => {
    const list = upcomingByCommunity?.[c.id] ?? [
      { scheduledAt: TWO_DAYS_FROM_NOW, title: `${c.name} live` },
    ];
    return list.map((s) => ({ communityId: c.id, ...s }));
  });
  vi.mocked(prisma.mentorSession.findMany).mockResolvedValue(sessions as never);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

// ---------------------------------------------------------------------------
// QUALITY BAR — WHERE-level assertions
//
// Criteria 1, 3, 4, 5 + excludeFromExplore + deletedAt are expressed in the
// Prisma WHERE clause. We verify the constructed where matches the spec.
// Behavioral tests (criteria 2 post-fetch, narrows for null fields) follow.

describe("getExploreCommunities — quality bar WHERE clause", () => {
  it("constructs WHERE with all 5 typed quality criteria + opt-out + soft-delete", async () => {
    setup({ candidates: [makeCandidate()] });

    await getExploreCommunities({}, { page: 1, pageSize: 24 });

    const call = vi.mocked(prisma.community.findMany).mock.calls[0][0];
    const where = call?.where as Record<string, unknown>;

    expect(where.deletedAt).toBeNull();
    expect(where.excludeFromExplore).toBe(false);
    expect(where.category).toEqual({ not: null });
    expect(where.description).toEqual({ not: null });
    expect(where.coverImageUrl).toEqual({ not: null });
    expect(where.AND).toEqual([{ description: { not: "" } }, { coverImageUrl: { not: "" } }]);
    // createdAt < (now - 14 days)
    const createdAtFilter = where.createdAt as { lt: Date };
    expect(createdAtFilter.lt.getTime()).toBe(subDays(NOW, 14).getTime());
    // sessions.some constraint
    const sessions = where.sessions as { some: Record<string, unknown> };
    expect(sessions.some.status).toEqual({ not: "CANCELLED" });
  });

  it("computes the count using the same WHERE", async () => {
    setup({ candidates: [makeCandidate()] });

    await getExploreCommunities({}, { page: 1, pageSize: 24 });

    const findWhere = vi.mocked(prisma.community.findMany).mock.calls[0][0]?.where;
    const countWhere = vi.mocked(prisma.community.count).mock.calls[0][0]?.where;
    expect(countWhere).toEqual(findWhere);
  });
});

// ---------------------------------------------------------------------------
// QUALITY BAR — Post-fetch defensive narrows + criterion 2 (≥3 active members)

describe("getExploreCommunities — post-fetch quality narrows", () => {
  it("excludes a candidate with category=null even if Prisma returned it", async () => {
    setup({ candidates: [makeCandidate({ id: "no-cat", category: null })] });

    const result = await getExploreCommunities({}, { page: 1, pageSize: 24 });

    expect(result.communities).toEqual([]);
  });

  it("excludes a candidate with description=null", async () => {
    setup({ candidates: [makeCandidate({ id: "no-desc", description: null })] });

    const result = await getExploreCommunities({}, { page: 1, pageSize: 24 });

    expect(result.communities).toEqual([]);
  });

  it("excludes a candidate with coverImageUrl=null", async () => {
    setup({ candidates: [makeCandidate({ id: "no-cover", coverImageUrl: null })] });

    const result = await getExploreCommunities({}, { page: 1, pageSize: 24 });

    expect(result.communities).toEqual([]);
  });

  it("excludes a community with <3 distinct active members (criterion 2)", async () => {
    setup({
      candidates: [makeCandidate({ id: "low-activity" })],
      authorsByCommunity: { "low-activity": ["only-one", "only-one", "only-one"] },
    });

    const result = await getExploreCommunities({}, { page: 1, pageSize: 24 });

    expect(result.communities).toEqual([]);
  });

  it("includes a community with exactly 3 distinct active members", async () => {
    setup({
      candidates: [makeCandidate({ id: "barely-pass" })],
      authorsByCommunity: { "barely-pass": ["a", "b", "c"] },
    });

    const result = await getExploreCommunities({}, { page: 1, pageSize: 24 });

    expect(result.communities.map((c) => c.id)).toEqual(["barely-pass"]);
  });

  it("counts comments toward active-members criterion (not just posts)", async () => {
    const candidate = makeCandidate({ id: "comments-only" });
    setup({
      candidates: [candidate],
      authorsByCommunity: { "comments-only": [] }, // zero posts
    });
    // Override: 3 distinct comment authors keep this community alive.
    vi.mocked(prisma.comment.findMany).mockResolvedValue([
      {
        authorId: "x",
        createdAt: FIVE_DAYS_AGO,
        post: { communityId: "comments-only" },
      },
      {
        authorId: "y",
        createdAt: TEN_DAYS_AGO,
        post: { communityId: "comments-only" },
      },
      {
        authorId: "z",
        createdAt: FIVE_DAYS_AGO,
        post: { communityId: "comments-only" },
      },
    ] as never);

    const result = await getExploreCommunities({}, { page: 1, pageSize: 24 });

    expect(result.communities.map((c) => c.id)).toEqual(["comments-only"]);
  });
});

// ---------------------------------------------------------------------------
// FILTERS — assert WHERE construction for user-applied filters

describe("getExploreCommunities — filters", () => {
  it("filters by category", async () => {
    setup({ candidates: [] });
    await getExploreCommunities({ category: "TECH_PROGRAMMING" }, { page: 1, pageSize: 24 });
    const where = vi.mocked(prisma.community.findMany).mock.calls[0][0]?.where as Record<
      string,
      unknown
    >;
    expect(where.category).toBe("TECH_PROGRAMMING");
  });

  it("filters by language", async () => {
    setup({ candidates: [] });
    await getExploreCommunities({ language: "es" }, { page: 1, pageSize: 24 });
    const where = vi.mocked(prisma.community.findMany).mock.calls[0][0]?.where as Record<
      string,
      unknown
    >;
    expect(where.language).toBe("es");
  });

  it("filters size=small → memberCount < 100", async () => {
    setup({ candidates: [] });
    await getExploreCommunities({ size: "small" }, { page: 1, pageSize: 24 });
    const where = vi.mocked(prisma.community.findMany).mock.calls[0][0]?.where as Record<
      string,
      unknown
    >;
    expect(where.memberCount).toEqual({ lt: 100 });
  });

  it("filters size=medium → memberCount in [100, 1000)", async () => {
    setup({ candidates: [] });
    await getExploreCommunities({ size: "medium" }, { page: 1, pageSize: 24 });
    const where = vi.mocked(prisma.community.findMany).mock.calls[0][0]?.where as Record<
      string,
      unknown
    >;
    expect(where.memberCount).toEqual({ gte: 100, lt: 1000 });
  });

  it("filters size=large → memberCount >= 1000", async () => {
    setup({ candidates: [] });
    await getExploreCommunities({ size: "large" }, { page: 1, pageSize: 24 });
    const where = vi.mocked(prisma.community.findMany).mock.calls[0][0]?.where as Record<
      string,
      unknown
    >;
    expect(where.memberCount).toEqual({ gte: 1000 });
  });

  it("filters type=free → isPaid=false", async () => {
    setup({ candidates: [] });
    await getExploreCommunities({ type: "free" }, { page: 1, pageSize: 24 });
    const where = vi.mocked(prisma.community.findMany).mock.calls[0][0]?.where as Record<
      string,
      unknown
    >;
    expect(where.isPaid).toBe(false);
  });

  it("filters type=paid → isPaid=true", async () => {
    setup({ candidates: [] });
    await getExploreCommunities({ type: "paid" }, { page: 1, pageSize: 24 });
    const where = vi.mocked(prisma.community.findMany).mock.calls[0][0]?.where as Record<
      string,
      unknown
    >;
    expect(where.isPaid).toBe(true);
  });

  it("search builds case-insensitive OR over name and description", async () => {
    setup({ candidates: [] });
    await getExploreCommunities({ search: "Healthy" }, { page: 1, pageSize: 24 });
    const where = vi.mocked(prisma.community.findMany).mock.calls[0][0]?.where as Record<
      string,
      unknown
    >;
    expect(where.OR).toEqual([
      { name: { contains: "Healthy", mode: "insensitive" } },
      { description: { contains: "Healthy", mode: "insensitive" } },
    ]);
  });
});

// ---------------------------------------------------------------------------
// SORT

describe("getExploreCommunities — sort", () => {
  it("default sort is createdAt desc (newest)", async () => {
    setup({ candidates: [] });
    await getExploreCommunities({}, { page: 1, pageSize: 24 });
    const orderBy = vi.mocked(prisma.community.findMany).mock.calls[0][0]?.orderBy;
    expect(orderBy).toEqual({ createdAt: "desc" });
  });

  it("sort=most-members orders by memberCount desc", async () => {
    setup({ candidates: [] });
    await getExploreCommunities({ sort: "most-members" }, { page: 1, pageSize: 24 });
    const orderBy = vi.mocked(prisma.community.findMany).mock.calls[0][0]?.orderBy;
    expect(orderBy).toEqual({ memberCount: "desc" });
  });

  it("sort=most-active falls back to createdAt at SQL level (re-sorted in JS)", async () => {
    // Two communities — same SQL order, different activity volume.
    const high = makeCandidate({ id: "high", name: "High Activity" });
    const low = makeCandidate({ id: "low", name: "Low Activity" });
    setup({
      candidates: [low, high],
      authorsByCommunity: {
        // Each unique author increments activity by 1; we want high > low.
        low: ["x", "y", "z"], // 3 actions
        high: ["a", "b", "c", "d", "e", "f", "g", "h"], // 8 actions
      },
    });

    const result = await getExploreCommunities({ sort: "most-active" }, { page: 1, pageSize: 24 });

    expect(result.communities.map((c) => c.id)).toEqual(["high", "low"]);
  });
});

// ---------------------------------------------------------------------------
// PAGINATION

describe("getExploreCommunities — pagination", () => {
  it("respects pageSize", async () => {
    const candidates = Array.from({ length: 3 }).map((_, i) =>
      makeCandidate({ id: `c-${i}`, name: `Community ${i}` })
    );
    setup({ candidates });

    const result = await getExploreCommunities({}, { page: 1, pageSize: 2 });

    expect(result.communities.length).toBeLessThanOrEqual(2);
  });

  it("computes skip from (page - 1) * pageSize", async () => {
    setup({ candidates: [] });

    await getExploreCommunities({}, { page: 3, pageSize: 24 });

    const call = vi.mocked(prisma.community.findMany).mock.calls[0][0];
    expect(call?.skip).toBe(48); // (3 - 1) * 24
  });

  it("fetches with 20% overshoot to leave room for post-fetch filter", async () => {
    setup({ candidates: [] });

    await getExploreCommunities({}, { page: 1, pageSize: 24 });

    const call = vi.mocked(prisma.community.findMany).mock.calls[0][0];
    expect(call?.take).toBe(Math.ceil(24 * 1.2));
  });

  it("hasMore=true when fetched candidates exceed pageSize", async () => {
    // Need at least pageSize + 1 candidates (all passing) to trigger hasMore.
    const candidates = Array.from({ length: 3 }).map((_, i) =>
      makeCandidate({ id: `c-${i}`, name: `Community ${i}` })
    );
    setup({ candidates });

    const result = await getExploreCommunities({}, { page: 1, pageSize: 2 });

    expect(result.hasMore).toBe(true);
  });

  it("hasMore=false on a final partial page", async () => {
    const candidates = Array.from({ length: 2 }).map((_, i) =>
      makeCandidate({ id: `c-${i}`, name: `Community ${i}` })
    );
    setup({ candidates });

    const result = await getExploreCommunities({}, { page: 1, pageSize: 24 });

    expect(result.hasMore).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// RESPONSE SHAPE

describe("getExploreCommunities — response shape", () => {
  it("returns total from count() (overestimate documented)", async () => {
    setup({ candidates: [makeCandidate()], totalCount: 42 });

    const result = await getExploreCommunities({}, { page: 1, pageSize: 24 });

    expect(result.total).toBe(42);
  });

  it("excludes the community owner from sampleMembers", async () => {
    const ownerId = "owner-qb-pass";
    setup({ candidates: [makeCandidate({ ownerId })] });
    // Override: include the owner as the very first member, plus 5 non-owners.
    vi.mocked(prisma.member.findMany).mockResolvedValue([
      {
        communityId: "qb-pass",
        userId: ownerId,
        user: { id: ownerId, name: "Owner", image: null },
      },
      ...Array.from({ length: 5 }).map((_, i) => ({
        communityId: "qb-pass",
        userId: `non-owner-${i}`,
        user: { id: `non-owner-${i}`, name: `Member ${i}`, image: null },
      })),
    ] as never);

    const result = await getExploreCommunities({}, { page: 1, pageSize: 24 });

    const ids = result.communities[0].sampleMembers.map((m) => m.id);
    expect(ids).not.toContain(ownerId);
    expect(result.communities[0].sampleMembers.length).toBe(5); // SAMPLE_MEMBERS_PER_COMMUNITY
  });

  it("computes activityHistory as 30-element array", async () => {
    setup({ candidates: [makeCandidate()] });

    const result = await getExploreCommunities({}, { page: 1, pageSize: 24 });

    expect(result.communities[0].activityHistory.length).toBe(30);
  });
});
