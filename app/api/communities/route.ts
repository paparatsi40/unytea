import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId, canCreateCommunity } from "@/lib/auth-utils";
import { rateLimiters } from "@/lib/rate-limit";
import { handleApiError } from "@/lib/api-error-handler";
import {
  UnauthorizedError,
  ForbiddenError,
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
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

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

    const myCommunities = await Promise.all(
      memberships.map(async (m) => {
        const nextSession = await prisma.mentorSession.findFirst({
          where: {
            communityId: m.community.id,
            status: {
              in: ["SCHEDULED", "IN_PROGRESS"],
            },
          },
          orderBy: {
            scheduledAt: "asc",
          },
          select: {
            id: true,
            title: true,
            scheduledAt: true,
            status: true,
            attendeeCount: true,
          },
        });

        const weeklySessions = await prisma.mentorSession.count({
          where: {
            communityId: m.community.id,
            scheduledAt: { gte: startOfWeek },
            status: { in: ["SCHEDULED", "IN_PROGRESS", "COMPLETED"] },
          },
        });

        const weeklyAttendance = await prisma.mentorSession.aggregate({
          where: {
            communityId: m.community.id,
            scheduledAt: { gte: startOfWeek },
            status: { in: ["IN_PROGRESS", "COMPLETED"] },
          },
          _avg: {
            attendeeCount: true,
          },
          _sum: {
            attendeeCount: true,
          },
        });

        const postsThisWeek = await prisma.post.count({
          where: {
            communityId: m.community.id,
            createdAt: { gte: startOfWeek },
          },
        });

        const lastPost = await prisma.post.findFirst({
          where: {
            communityId: m.community.id,
          },
          orderBy: {
            createdAt: "desc",
          },
          select: {
            createdAt: true,
          },
        });

        const lastSession = await prisma.mentorSession.findFirst({
          where: {
            communityId: m.community.id,
            status: {
              in: ["COMPLETED", "IN_PROGRESS", "CANCELLED"],
            },
          },
          orderBy: {
            scheduledAt: "desc",
          },
          select: {
            scheduledAt: true,
          },
        });

        return {
          ...m.community,
          role: m.role,
          nextSession,
          weeklySessions,
          postsThisWeek,
          lastPostAt: lastPost?.createdAt || null,
          lastSessionAt: lastSession?.scheduledAt || null,
          avgAttendanceThisWeek: Math.round(weeklyAttendance._avg.attendeeCount || 0),
          attendeesThisWeek: weeklyAttendance._sum.attendeeCount || 0,
        };
      })
    );

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
    console.error("Error fetching communities:", error);
    return NextResponse.json(
      { error: "Failed to fetch communities" },
      { status: 500 }
    );
  }
}
