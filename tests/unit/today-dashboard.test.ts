import { describe, it, expect, vi, beforeEach } from "vitest";

// Override the shared setup mock — today-dashboard fans out across user /
// community / member / mentorSession / post.
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    community: { findMany: vi.fn() },
    member: { findMany: vi.fn(), count: vi.fn() },
    mentorSession: { findFirst: vi.fn(), count: vi.fn() },
    post: { findMany: vi.fn(), count: vi.fn() },
  },
}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getTodayDashboard } from "@/app/actions/today-dashboard";

// The mocks below intentionally provide minimal/partial shapes. We assert them
// through the real resolved return type of each method (via `unknown`) so the
// casts document intent and stay free of `any`.
type UserResult = Awaited<ReturnType<typeof prisma.user.findUnique>>;
type CommunityResult = Awaited<ReturnType<typeof prisma.community.findMany>>;
type MemberResult = Awaited<ReturnType<typeof prisma.member.findMany>>;
type SessionResult = Awaited<ReturnType<typeof prisma.mentorSession.findFirst>>;
type PostResult = Awaited<ReturnType<typeof prisma.post.findMany>>;
type AuthResult = Awaited<ReturnType<typeof auth>>;

const mockUser = { name: "Test User" };
const mockCommunity = {
  id: "comm-1",
  slug: "test-comm",
  name: "Test Community",
  imageUrl: null,
  memberCount: 10,
};
const mockSession = {
  id: "session-1",
  slug: "session-slug",
  title: "Test Session",
  scheduledAt: new Date("2026-06-15T19:00:00Z"),
  duration: 60,
  community: { slug: "test-comm", name: "Test Community" },
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(auth).mockResolvedValue({ user: { id: "user-1" } } as unknown as AuthResult);
  vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as unknown as UserResult);
  vi.mocked(prisma.community.findMany).mockResolvedValue([]);
  vi.mocked(prisma.member.findMany).mockResolvedValue([]);
  vi.mocked(prisma.member.count).mockResolvedValue(0);
  vi.mocked(prisma.mentorSession.findFirst).mockResolvedValue(null);
  vi.mocked(prisma.mentorSession.count).mockResolvedValue(0);
  vi.mocked(prisma.post.findMany).mockResolvedValue([]);
  vi.mocked(prisma.post.count).mockResolvedValue(0);
});

describe("getTodayDashboard", () => {
  it("returns null when no authenticated session", async () => {
    vi.mocked(auth).mockResolvedValue(null as unknown as AuthResult);
    const result = await getTodayDashboard();
    expect(result).toBeNull();
  });

  it("returns shape with all fields for authenticated user with no data", async () => {
    const result = await getTodayDashboard();
    expect(result).toMatchObject({
      user: { name: "Test User" },
      nextLiveSession: null,
      communities: [],
      weeklyStats: {
        sessionsThisWeek: 0,
        newMembersThisWeek: 0,
        postsThisWeek: 0,
        sessionsDelta: 0,
        newMembersDelta: 0,
        postsDelta: 0,
      },
      recentActivity: [],
    });
  });

  it("deduplicates communities: owned community NOT also in memberCommunities result", async () => {
    vi.mocked(prisma.community.findMany).mockResolvedValue([
      mockCommunity,
    ] as unknown as CommunityResult);
    vi.mocked(prisma.member.findMany).mockResolvedValue([
      // Same community appears in member list (user is owner AND member).
      { community: mockCommunity, joinedAt: new Date() },
    ] as unknown as MemberResult);

    const result = await getTodayDashboard();
    expect(result?.communities).toHaveLength(1);
    expect(result?.communities[0]).toMatchObject({
      id: "comm-1",
      role: "owner", // owner takes priority over member
    });
  });

  it("caps total communities at 6", async () => {
    const owned = Array.from({ length: 4 }, (_, i) => ({
      ...mockCommunity,
      id: `owned-${i}`,
      slug: `owned-${i}`,
    }));
    const memberOf = Array.from({ length: 4 }, (_, i) => ({
      community: { ...mockCommunity, id: `member-${i}`, slug: `member-${i}` },
      joinedAt: new Date(),
    }));

    vi.mocked(prisma.community.findMany).mockResolvedValue(owned as unknown as CommunityResult);
    vi.mocked(prisma.member.findMany).mockResolvedValue(memberOf as unknown as MemberResult);

    const result = await getTodayDashboard();
    expect(result?.communities).toHaveLength(6);
    // First 4 are owned (priority), next 2 are member.
    expect(result?.communities[0].role).toBe("owner");
    expect(result?.communities[3].role).toBe("owner");
    expect(result?.communities[4].role).toBe("member");
    expect(result?.communities[5].role).toBe("member");
  });

  it("returns next live session when within 7-day window", async () => {
    vi.mocked(prisma.mentorSession.findFirst).mockResolvedValue(
      mockSession as unknown as SessionResult
    );

    const result = await getTodayDashboard();
    expect(result?.nextLiveSession).toMatchObject({
      id: "session-1",
      slug: "session-slug",
      title: "Test Session",
      duration: 60,
      communitySlug: "test-comm",
      communityName: "Test Community",
    });
  });

  it("computes deltas correctly (week-over-week)", async () => {
    // mentorSession.count is invoked this-week first, then last-week.
    vi.mocked(prisma.mentorSession.count)
      .mockResolvedValueOnce(5) // sessionsThisWeek
      .mockResolvedValueOnce(3); // sessionsLastWeek

    vi.mocked(prisma.member.count)
      .mockResolvedValueOnce(10) // newMembersThisWeek
      .mockResolvedValueOnce(15); // newMembersLastWeek (decline)

    vi.mocked(prisma.post.count)
      .mockResolvedValueOnce(20) // postsThisWeek
      .mockResolvedValueOnce(20); // postsLastWeek (no change)

    const result = await getTodayDashboard();
    expect(result?.weeklyStats).toMatchObject({
      sessionsThisWeek: 5,
      sessionsDelta: 2,
      newMembersThisWeek: 10,
      newMembersDelta: -5,
      postsThisWeek: 20,
      postsDelta: 0,
    });
  });

  it("recentActivity sorted by date descending", async () => {
    const older = new Date("2026-05-30T10:00:00Z");
    const middle = new Date("2026-05-30T15:00:00Z");
    const newer = new Date("2026-05-30T20:00:00Z");

    // First member.findMany call = top communities; second = recent members.
    vi.mocked(prisma.member.findMany)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { user: { name: "Alice" }, joinedAt: older, community: { slug: "c1", name: "C1" } },
        { user: { name: "Charlie" }, joinedAt: newer, community: { slug: "c1", name: "C1" } },
      ] as unknown as MemberResult);

    vi.mocked(prisma.post.findMany).mockResolvedValue([
      { author: { name: "Bob" }, createdAt: middle, community: { slug: "c1", name: "C1" } },
    ] as unknown as PostResult);

    const result = await getTodayDashboard();
    expect(result?.recentActivity).toHaveLength(3);
    // Sorted DESC: Charlie (newer), Bob (middle), Alice (older).
    // Labels are localized client-side, so assert on the structured actorName.
    expect(result?.recentActivity[0].actorName).toBe("Charlie");
    expect(result?.recentActivity[1].actorName).toBe("Bob");
    expect(result?.recentActivity[2].actorName).toBe("Alice");
  });

  it("recentActivity capped at 10 events", async () => {
    const members = Array.from({ length: 8 }, (_, i) => ({
      user: { name: `User${i}` },
      joinedAt: new Date(`2026-05-${(20 - i).toString().padStart(2, "0")}`),
      community: { slug: "c1", name: "C1" },
    }));

    vi.mocked(prisma.member.findMany)
      .mockResolvedValueOnce([]) // first call (communities)
      .mockResolvedValueOnce(members as unknown as MemberResult); // second call (recent activity)

    vi.mocked(prisma.post.findMany).mockResolvedValue(
      Array.from({ length: 8 }, (_, i) => ({
        author: { name: `Author${i}` },
        createdAt: new Date(`2026-05-${(20 - i).toString().padStart(2, "0")}`),
        community: { slug: "c1", name: "C1" },
      })) as unknown as PostResult
    );

    const result = await getTodayDashboard();
    expect(result?.recentActivity).toHaveLength(10);
  });
});
