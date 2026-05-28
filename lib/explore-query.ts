import {
  addDays,
  differenceInCalendarDays,
  differenceInMinutes,
  isSameDay,
  subDays,
  subMinutes,
} from "date-fns";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type {
  ExploreActivityStatus,
  ExploreCommunity,
  ExploreFilters,
  ExploreLiveStatus,
  ExplorePagination,
  ExploreResponse,
  ExploreSampleMember,
} from "@/types/explore";

const DEFAULT_PAGE_SIZE = 24;
const OVERSHOOT_MULTIPLIER = 1.2;
const ACTIVITY_WINDOW_DAYS = 30;
const QUALITY_BAR_LOOKAHEAD_DAYS = 7;
const MIN_COMMUNITY_AGE_DAYS = 14;
const MIN_ACTIVE_MEMBERS = 3;
const LIVE_NOW_BUFFER_MINUTES = 30;
const LIVE_SOON_THRESHOLD_MINUTES = 120;
const SAMPLE_MEMBERS_PER_COMMUNITY = 5;
const MEMBER_FETCH_BUFFER = 50; // per community, to allow owner exclusion + 5 non-owner

function computeInitials(name: string | null | undefined): string {
  const trimmed = (name ?? "").trim();
  if (!trimmed) return "??";
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) {
    return (parts[0].slice(0, 2) || parts[0]).toUpperCase();
  }
  const first = parts[0][0] ?? "";
  const last = parts[parts.length - 1][0] ?? "";
  return (first + last).toUpperCase();
}

function classifyActivity(totalActions: number): ExploreActivityStatus {
  const avgPerWeek = (totalActions / ACTIVITY_WINDOW_DAYS) * 7;
  if (avgPerWeek >= 10) return "very_active";
  if (avgPerWeek >= 5) return "active";
  if (avgPerWeek >= 1) return "moderate";
  return "quiet";
}

function classifyLiveStatus(
  nextSession: { scheduledAt: Date; title: string } | null,
  now: Date
): ExploreLiveStatus {
  if (!nextSession) {
    return { status: "none", nextSessionStartsAt: null, nextSessionTitle: null };
  }
  const delta = differenceInMinutes(nextSession.scheduledAt, now);
  let status: ExploreLiveStatus["status"];
  if (delta < 0 && delta >= -LIVE_NOW_BUFFER_MINUTES) {
    status = "live_now";
  } else if (delta >= 0 && delta < LIVE_SOON_THRESHOLD_MINUTES) {
    status = "live_soon";
  } else if (isSameDay(nextSession.scheduledAt, now)) {
    status = "live_today";
  } else if (delta >= 0 && delta < QUALITY_BAR_LOOKAHEAD_DAYS * 24 * 60) {
    status = "live_this_week";
  } else {
    status = "none";
  }
  return {
    status,
    nextSessionStartsAt: nextSession.scheduledAt,
    nextSessionTitle: nextSession.title,
  };
}

export async function getExploreCommunities(
  filters: ExploreFilters = {},
  pagination: ExplorePagination = {}
): Promise<ExploreResponse> {
  const now = new Date();
  const thirtyDaysAgo = subDays(now, ACTIVITY_WINDOW_DAYS);
  const fourteenDaysAgo = subDays(now, MIN_COMMUNITY_AGE_DAYS);
  const sevenDaysFromNow = addDays(now, QUALITY_BAR_LOOKAHEAD_DAYS);
  const liveStatusWindowStart = subMinutes(now, LIVE_NOW_BUFFER_MINUTES);

  const page = pagination.page ?? 1;
  const pageSize = pagination.pageSize ?? DEFAULT_PAGE_SIZE;
  const overshoot = Math.ceil(pageSize * OVERSHOOT_MULTIPLIER);
  const offset = (page - 1) * pageSize;

  const where: Prisma.CommunityWhereInput = {
    deletedAt: null,
    excludeFromExplore: false,
    category: { not: null },
    description: { not: null },
    coverImageUrl: { not: null },
    createdAt: { lt: fourteenDaysAgo },
    sessions: {
      some: {
        scheduledAt: { gte: now, lt: sevenDaysFromNow },
        status: { not: "CANCELLED" },
      },
    },
    NOT: { description: "" },
  };

  if (filters.category) where.category = filters.category;
  if (filters.language) where.language = filters.language;
  if (filters.type === "free") where.isPaid = false;
  if (filters.type === "paid") where.isPaid = true;
  if (filters.size === "small") where.memberCount = { lt: 100 };
  if (filters.size === "medium") where.memberCount = { gte: 100, lt: 1000 };
  if (filters.size === "large") where.memberCount = { gte: 1000 };
  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: "insensitive" } },
      { description: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  // ORDER BY. "most-active" is post-fetch only — see re-sort below.
  // TODO: when /explore grows past ~100 communities per active category,
  // upgrade to cursor-based pagination and consider a materialized view
  // for activity counts so most-active can be expressed in SQL.
  const orderBy: Prisma.CommunityOrderByWithRelationInput =
    filters.sort === "most-members" ? { memberCount: "desc" } : { createdAt: "desc" };

  const [candidates, total] = await Promise.all([
    prisma.community.findMany({
      where,
      orderBy,
      skip: offset,
      take: overshoot,
      include: {
        owner: { select: { id: true, name: true, image: true } },
      },
    }),
    prisma.community.count({ where }),
  ]);

  if (candidates.length === 0) {
    return { communities: [], total, page, pageSize, hasMore: false };
  }

  const communityIds = candidates.map((c) => c.id);
  const ownerIdsByCommunityId = new Map<string, string>();
  for (const c of candidates) ownerIdsByCommunityId.set(c.id, c.ownerId);

  // Batched derivations
  const [posts, comments, members, upcomingSessions] = await Promise.all([
    prisma.post.findMany({
      where: {
        communityId: { in: communityIds },
        createdAt: { gte: thirtyDaysAgo },
        deletedAt: null,
      },
      select: { communityId: true, authorId: true, createdAt: true },
    }),
    prisma.comment.findMany({
      where: {
        post: { communityId: { in: communityIds } },
        createdAt: { gte: thirtyDaysAgo },
      },
      select: {
        authorId: true,
        createdAt: true,
        post: { select: { communityId: true } },
      },
    }),
    prisma.member.findMany({
      where: {
        communityId: { in: communityIds },
        status: "ACTIVE",
      },
      select: {
        communityId: true,
        userId: true,
        user: { select: { id: true, name: true, image: true } },
      },
      orderBy: { joinedAt: "desc" },
      take: communityIds.length * MEMBER_FETCH_BUFFER,
    }),
    prisma.mentorSession.findMany({
      where: {
        communityId: { in: communityIds },
        scheduledAt: { gte: liveStatusWindowStart, lt: sevenDaysFromNow },
        status: { not: "CANCELLED" },
      },
      orderBy: { scheduledAt: "asc" },
      select: { communityId: true, scheduledAt: true, title: true },
    }),
  ]);

  // Group derived data by communityId.
  const activityByCommunity = new Map<string, number[]>();
  const activeAuthorsByCommunity = new Map<string, Set<string>>();

  function bucketAction(communityId: string, authorId: string, createdAt: Date) {
    const dayOffset = differenceInCalendarDays(now, createdAt);
    if (dayOffset < 0 || dayOffset >= ACTIVITY_WINDOW_DAYS) return;
    const idx = ACTIVITY_WINDOW_DAYS - 1 - dayOffset; // 0 = oldest, 29 = today
    const buckets =
      activityByCommunity.get(communityId) ?? new Array<number>(ACTIVITY_WINDOW_DAYS).fill(0);
    buckets[idx] += 1;
    activityByCommunity.set(communityId, buckets);
    const authors = activeAuthorsByCommunity.get(communityId) ?? new Set<string>();
    authors.add(authorId);
    activeAuthorsByCommunity.set(communityId, authors);
  }

  for (const p of posts) {
    bucketAction(p.communityId, p.authorId, p.createdAt);
  }
  for (const c of comments) {
    if (!c.post?.communityId) continue;
    bucketAction(c.post.communityId, c.authorId, c.createdAt);
  }

  const sampleMembersByCommunity = new Map<string, ExploreSampleMember[]>();
  for (const m of members) {
    const ownerId = ownerIdsByCommunityId.get(m.communityId);
    if (m.userId === ownerId) continue;
    const arr = sampleMembersByCommunity.get(m.communityId) ?? [];
    if (arr.length >= SAMPLE_MEMBERS_PER_COMMUNITY) continue;
    const name = m.user.name ?? "Unknown";
    arr.push({
      id: m.user.id,
      name,
      image: m.user.image,
      initials: computeInitials(name),
    });
    sampleMembersByCommunity.set(m.communityId, arr);
  }

  const nextSessionByCommunity = new Map<string, { scheduledAt: Date; title: string }>();
  for (const s of upcomingSessions) {
    if (!s.communityId) continue;
    if (nextSessionByCommunity.has(s.communityId)) continue; // already have earliest
    nextSessionByCommunity.set(s.communityId, {
      scheduledAt: s.scheduledAt,
      title: s.title,
    });
  }

  // Build ExploreCommunity objects + apply ≥3 active members filter
  const built = candidates
    .map((c): ExploreCommunity | null => {
      const activeAuthors = activeAuthorsByCommunity.get(c.id);
      if (!activeAuthors || activeAuthors.size < MIN_ACTIVE_MEMBERS) return null;
      // category cannot be null at this point because the WHERE filter enforces it,
      // but Prisma types still mark it nullable — narrow defensively.
      if (!c.category) return null;
      if (!c.description) return null;
      if (!c.coverImageUrl) return null;

      const activityHistory =
        activityByCommunity.get(c.id) ?? new Array<number>(ACTIVITY_WINDOW_DAYS).fill(0);
      const totalActions = activityHistory.reduce((sum, n) => sum + n, 0);

      return {
        id: c.id,
        slug: c.slug,
        name: c.name,
        description: c.description,
        coverImageUrl: c.coverImageUrl,
        imageUrl: c.imageUrl,
        category: c.category,
        language: c.language,
        isPaid: c.isPaid,
        memberCount: c.memberCount,
        pricing: c.pricing,
        primaryColor: c.primaryColor,
        secondaryColor: c.secondaryColor,
        owner: {
          id: c.owner.id,
          name: c.owner.name ?? "Unknown",
          image: c.owner.image,
          title: c.ownerTitle,
        },
        activityHistory,
        activityStatus: classifyActivity(totalActions),
        sampleMembers: sampleMembersByCommunity.get(c.id) ?? [],
        liveStatus: classifyLiveStatus(nextSessionByCommunity.get(c.id) ?? null, now),
      };
    })
    .filter((c): c is ExploreCommunity => c !== null);

  // Most-active re-sort (post-fetch only).
  if (filters.sort === "most-active") {
    built.sort((a, b) => {
      const sumA = a.activityHistory.reduce((s, n) => s + n, 0);
      const sumB = b.activityHistory.reduce((s, n) => s + n, 0);
      return sumB - sumA;
    });
  }

  const finalCommunities = built.slice(0, pageSize);

  return {
    communities: finalCommunities,
    // Note: `total` is an overestimate. It reflects the WHERE-level quality
    // bar (criteria 1, 3, 4, 5) but NOT the post-fetch active-members filter
    // (criterion 2). Acceptable for v1 pagination UI; flagged for refactor
    // when activity data moves to a materialized view (see TODO above).
    total,
    page,
    pageSize,
    hasMore: candidates.length > pageSize,
  };
}
