import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId, canCreateCommunity } from "@/lib/auth-utils";
import { rateLimiters } from "@/lib/rate-limit";
import { handleApiError } from "@/lib/api-error-handler";
import {
  UnauthorizedError,
  ForbiddenError,
  requireUserId,
} from "@/lib/authorization";
import { z } from "zod";

export const dynamic = "force-dynamic";

const createCommunitySchema = z.object({
  name: z.string().trim().min(3).max(100),
  description: z.string().max(500).optional().nullable(),
  imageUrl: z.string().url().max(2048).optional().nullable(),
  coverImageUrl: z.string().url().max(2048).optional().nullable(),
  isPrivate: z.boolean().optional(),
  requireApproval: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  try {
    // 1. Auth
    const userId = await getCurrentUserId();
    if (!userId) {
      throw new UnauthorizedError();
    }

    // 2. Rate limit (10 creations per minute per user)
    const rateLimit = await rateLimiters.create.check(`create-community:${userId}`);
    if (!rateLimit.success) {
      return NextResponse.json(
        {
          error: "Too many requests. Please try again later.",
          resetTime: rateLimit.resetTime,
        },
        { status: 429 }
      );
    }

    // 3. Validate input
    const body = await req.json();
    const data = createCommunitySchema.parse(body);

    // 4. Plan limit (delegates to auth-utils — single source of truth)
    const allowedByPlan = await canCreateCommunity(userId);
    if (!allowedByPlan) {
      throw new ForbiddenError(
        "Plan limit reached: upgrade to create more communities"
      );
    }

    // 5. Generate unique slug from name (collision-safe)
    let slug = data.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    const existingCommunity = await prisma.community.findUnique({
      where: { slug },
    });
    if (existingCommunity) {
      slug = `${slug}-${Date.now()}`;
    }

    // 6. Create community
    const community = await prisma.community.create({
      data: {
        name: data.name,
        slug,
        description: data.description ?? null,
        ownerId: userId,
        imageUrl: data.imageUrl ?? null,
        coverImageUrl: data.coverImageUrl ?? null,
        isPrivate: data.isPrivate ?? false,
        requireApproval: data.requireApproval ?? false,
      },
    });

    // 7. Add creator as OWNER member
    await prisma.member.create({
      data: {
        userId,
        communityId: community.id,
        role: "OWNER",
        status: "ACTIVE",
      },
    });

    return NextResponse.json({ success: true, community }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.flatten() },
        { status: 400 }
      );
    }
    return handleApiError(error);
  }
}

export async function GET() {
  try {
    // requireUserId throws UnauthorizedError (mapped to 401 by handleApiError)
    // when there's no session. Phase 2c.6 corrected the previous behavior which
    // returned 400 "userId is required" — semantically wrong HTTP status.
    const userId = await requireUserId();

    // Get all communities where user is a member
    const memberships = await prisma.member.findMany({
      where: {
        userId: userId,
        status: "ACTIVE",
      },
      include: {
        community: {
          include: {
            owner: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                image: true,
              },
            },
            _count: {
              select: {
                members: true,
                posts: true,
              },
            },
          },
        },
      },
      orderBy: {
        joinedAt: "desc",
      },
    });

    const startOfWeek = new Date();
    const day = startOfWeek.getDay();
    const diffToMonday = (day + 6) % 7;
    startOfWeek.setDate(startOfWeek.getDate() - diffToMonday);
    startOfWeek.setHours(0, 0, 0, 0);

    // ── N+1 fix (Phase 2c.7) ───────────────────────────────────────────
    // Previously: 6 prisma calls × N communities = 6N queries.
    // Now: 6 batched queries, independent of N. Uses Postgres DISTINCT ON
    // (via Prisma's `distinct`) for per-community first-row lookups, and
    // groupBy for windowed counts/aggregates. Per-community values are
    // resolved via in-memory lookup maps below.
    const communityIds = memberships.map((m) => m.community.id);

    const [
      nextSessionRows,
      lastSessionRows,
      lastPostRows,
      weeklySessionStats,
      weeklyAttendanceStats,
      postsThisWeekStats,
    ] = communityIds.length === 0
      ? [[], [], [], [], [], []]
      : await Promise.all([
          // 1. Next upcoming session per community
          prisma.mentorSession.findMany({
            where: {
              communityId: { in: communityIds },
              status: { in: ["SCHEDULED", "IN_PROGRESS"] },
            },
            orderBy: [{ communityId: "asc" }, { scheduledAt: "asc" }],
            distinct: ["communityId"],
            select: {
              id: true,
              title: true,
              scheduledAt: true,
              status: true,
              attendeeCount: true,
              communityId: true,
            },
          }),
          // 2. Last past/ongoing session per community
          prisma.mentorSession.findMany({
            where: {
              communityId: { in: communityIds },
              status: { in: ["COMPLETED", "IN_PROGRESS", "CANCELLED"] },
            },
            orderBy: [{ communityId: "asc" }, { scheduledAt: "desc" }],
            distinct: ["communityId"],
            select: { communityId: true, scheduledAt: true },
          }),
          // 3. Last post per community
          prisma.post.findMany({
            where: { communityId: { in: communityIds } },
            orderBy: [{ communityId: "asc" }, { createdAt: "desc" }],
            distinct: ["communityId"],
            select: { communityId: true, createdAt: true },
          }),
          // 4. Weekly session count per community
          prisma.mentorSession.groupBy({
            by: ["communityId"],
            where: {
              communityId: { in: communityIds },
              scheduledAt: { gte: startOfWeek },
              status: { in: ["SCHEDULED", "IN_PROGRESS", "COMPLETED"] },
            },
            _count: { _all: true },
          }),
          // 5. Weekly attendance avg/sum per community
          prisma.mentorSession.groupBy({
            by: ["communityId"],
            where: {
              communityId: { in: communityIds },
              scheduledAt: { gte: startOfWeek },
              status: { in: ["IN_PROGRESS", "COMPLETED"] },
            },
            _avg: { attendeeCount: true },
            _sum: { attendeeCount: true },
          }),
          // 6. Weekly post count per community
          prisma.post.groupBy({
            by: ["communityId"],
            where: {
              communityId: { in: communityIds },
              createdAt: { gte: startOfWeek },
            },
            _count: { _all: true },
          }),
        ]);

    // Build in-memory lookup maps keyed by communityId
    const nextSessionByCommunity = new Map(
      nextSessionRows.map((s) => [
        s.communityId,
        {
          id: s.id,
          title: s.title,
          scheduledAt: s.scheduledAt,
          status: s.status,
          attendeeCount: s.attendeeCount,
        },
      ])
    );
    const lastSessionAtByCommunity = new Map(
      lastSessionRows.map((s) => [s.communityId, s.scheduledAt])
    );
    const lastPostAtByCommunity = new Map(
      lastPostRows.map((p) => [p.communityId, p.createdAt])
    );
    const weeklySessionsByCommunity = new Map(
      weeklySessionStats.map((s) => [s.communityId, s._count._all])
    );
    const weeklyAttendanceByCommunity = new Map(
      weeklyAttendanceStats.map((s) => [
        s.communityId,
        {
          avg: Math.round(s._avg.attendeeCount || 0),
          sum: s._sum.attendeeCount || 0,
        },
      ])
    );
    const postsThisWeekByCommunity = new Map(
      postsThisWeekStats.map((p) => [p.communityId, p._count._all])
    );

    const myCommunities = memberships.map((m) => {
      const id = m.community.id;
      const attendance = weeklyAttendanceByCommunity.get(id);
      return {
        ...m.community,
        role: m.role,
        nextSession: nextSessionByCommunity.get(id) ?? null,
        weeklySessions: weeklySessionsByCommunity.get(id) ?? 0,
        postsThisWeek: postsThisWeekByCommunity.get(id) ?? 0,
        lastPostAt: lastPostAtByCommunity.get(id) ?? null,
        lastSessionAt: lastSessionAtByCommunity.get(id) ?? null,
        avgAttendanceThisWeek: attendance?.avg ?? 0,
        attendeesThisWeek: attendance?.sum ?? 0,
      };
    });

    // Get IDs of communities user is already a member of
    const myCommunityIds = myCommunities.map((c) => c.id);

    // Get public communities where user is NOT a member (for exploration)
    const exploreCommunities = await prisma.community.findMany({
      where: {
        isPrivate: false,
        id: {
          notIn: myCommunityIds.length > 0 ? myCommunityIds : [""],
        },
      },
      include: {
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            image: true,
          },
        },
        _count: {
          select: {
            members: true,
            posts: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 20,
    });

    return NextResponse.json({
      myCommunities,
      exploreCommunities,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
