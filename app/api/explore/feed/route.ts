import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function communityCategory(settings: unknown): string {
  if (!settings || typeof settings !== "object") return "General";
  const candidate = (settings as Record<string, unknown>).category;
  if (typeof candidate === "string" && candidate.trim().length > 0) return candidate.trim();
  return "General";
}

function communityLanguage(settings: unknown): string {
  if (!settings || typeof settings !== "object") return "Any";
  const candidate = (settings as Record<string, unknown>).language;
  if (typeof candidate === "string" && candidate.trim().length > 0) return candidate.trim();
  return "Any";
}

function getUpcomingSessionWeight(nextSessionAt: Date | null, now: Date): number {
  if (!nextSessionAt) return 0;
  const hoursUntil = (nextSessionAt.getTime() - now.getTime()) / (1000 * 60 * 60);
  if (hoursUntil <= 24) return 5;
  if (hoursUntil <= 72) return 3;
  if (hoursUntil <= 7 * 24) return 2;
  return 0;
}

function getBoostScore(settings: unknown): number {
  if (!settings || typeof settings !== "object") return 0;
  const value = (settings as Record<string, unknown>).boostScore;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return 0;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const q = searchParams.get("q")?.trim() || "";
    const category = searchParams.get("category")?.trim() || "all";
    const monetization = searchParams.get("monetization")?.trim() || "all";
    const language = searchParams.get("language")?.trim() || "all";
    const sessionsWeek = searchParams.get("sessionsWeek")?.trim() || "all";
    const sort = searchParams.get("sort")?.trim() || "trending";

    const cursor = Number(searchParams.get("cursor") || "0");
    const limit = Math.min(Number(searchParams.get("limit") || "12"), 24);

    const now = new Date();
    const weekAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const communities = await prisma.community.findMany({
      where: {
        isPrivate: false,
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { description: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
        ...(monetization === "paid" ? { isPaid: true } : {}),
        ...(monetization === "free" ? { isPaid: false } : {}),
      },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        settings: true,
        isPaid: true,
        createdAt: true,
        owner: {
          select: { name: true, firstName: true, lastName: true },
        },
        _count: {
          select: { members: true },
        },
        sessions: {
          where: { status: "SCHEDULED", scheduledAt: { gt: now } },
          orderBy: { scheduledAt: "asc" },
          take: 4,
          select: { id: true, title: true, scheduledAt: true },
        },
        posts: {
          where: { isPublished: true },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { title: true, content: true },
        },
      },
      take: 120,
    });

    const communityIds = communities.map((c) => c.id);

    const [recentPosts, recentMembers] = await Promise.all([
      communityIds.length
        ? prisma.post.groupBy({
            by: ["communityId"],
            where: { communityId: { in: communityIds }, createdAt: { gte: sevenDaysAgo } },
            _count: { communityId: true },
          })
        : Promise.resolve([]),
      communityIds.length
        ? prisma.member.findMany({
            where: { communityId: { in: communityIds }, joinedAt: { gte: sevenDaysAgo } },
            select: { communityId: true },
          })
        : Promise.resolve([]),
    ]);

    const sessionIds = communities.flatMap((c) => c.sessions.map((s) => s.id));
    const attendingRows = sessionIds.length
      ? await prisma.sessionParticipation.findMany({
          where: { sessionId: { in: sessionIds } },
          select: { sessionId: true },
        })
      : [];

    const attendingBySession = new Map<string, number>();
    for (const row of attendingRows) {
      attendingBySession.set(row.sessionId, (attendingBySession.get(row.sessionId) || 0) + 1);
    }

    const postsByCommunity = new Map(recentPosts.map((row) => [row.communityId, row._count.communityId]));
    const newMembersByCommunity = new Map<string, number>();
    for (const row of recentMembers) {
      newMembersByCommunity.set(row.communityId, (newMembersByCommunity.get(row.communityId) || 0) + 1);
    }

    const normalized = communities
      .map((community) => {
        const computedCategory = communityCategory(community.settings);
        const computedLanguage = communityLanguage(community.settings);
        const sessionsThisWeekList = community.sessions.filter(
          (session) => session.scheduledAt >= now && session.scheduledAt <= weekAhead
        );

        const nextSession = community.sessions[0] ?? null;
        const nextSessionAttending = nextSession ? attendingBySession.get(nextSession.id) || 0 : 0;
        const postsLast7d = postsByCommunity.get(community.id) || 0;
        const newMembersLast7d = newMembersByCommunity.get(community.id) || 0;
        const upcomingSessionWeight = getUpcomingSessionWeight(nextSession?.scheduledAt ?? null, now);
        const isNew = now.getTime() - community.createdAt.getTime() <= 14 * 24 * 60 * 60 * 1000;

        const rankingScore =
          upcomingSessionWeight * 5 +
          nextSessionAttending * 3 +
          sessionsThisWeekList.length * 2 +
          postsLast7d * 1.5 +
          newMembersLast7d * 2 +
          (isNew ? 1 : 0) +
          getBoostScore(community.settings);

        return {
          id: community.id,
          slug: community.slug,
          name: community.name,
          description: community.description,
          isPaid: community.isPaid,
          owner: community.owner,
          membersCount: community._count.members,
          category: computedCategory,
          language: computedLanguage,
          nextSession,
          nextSessionAttending,
          sessionsThisWeek: sessionsThisWeekList.length,
          postsLast7d,
          newMembersLast7d,
          isNew,
          rankingScore,
        };
      })
      .filter((community) => {
        const categoryMatch = category === "all" || community.category.toLowerCase() === category.toLowerCase();
        const languageMatch = language === "all" || community.language.toLowerCase() === language.toLowerCase();
        const sessionsWeekMatch = sessionsWeek === "all" || community.sessionsThisWeek > 0;
        return categoryMatch && languageMatch && sessionsWeekMatch;
      })
      .sort((a, b) => {
        if (sort === "members") return b.membersCount - a.membersCount;
        if (sort === "newest") return b.isNew === a.isNew ? 0 : b.isNew ? 1 : -1;
        return b.rankingScore - a.rankingScore;
      });

    const items = normalized.slice(cursor, cursor + limit);
    const nextCursor = cursor + items.length;

    return NextResponse.json({
      success: true,
      items,
      nextCursor: nextCursor < normalized.length ? nextCursor : null,
      hasMore: nextCursor < normalized.length,
    });
  } catch (error) {
    console.error("Explore feed error", error);
    return NextResponse.json({ success: false, error: "Failed to load explore feed" }, { status: 500 });
  }
}
