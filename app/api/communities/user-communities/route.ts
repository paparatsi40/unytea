import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/communities/user-communities
 * Fetches all communities where the user is owner or member
 * Uses Prisma (not Supabase)
 */
export async function GET() {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    console.log("📋 Fetching communities for user:", userId);

    // Fetch owned communities
    const ownedCommunities = await prisma.community.findMany({
      where: {
        ownerId: userId,
      },
      include: {
        _count: {
          select: {
            members: true,
            posts: true,
            courses: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    console.log("✅ Owned communities:", ownedCommunities.length);

    // Fetch joined communities (where user is a member but not owner)
    const membershipRecords = await prisma.member.findMany({
      where: {
        userId,
        status: "ACTIVE",
        community: {
          ownerId: {
            not: userId,
          },
        },
      },
      include: {
        community: {
          include: {
            _count: {
              select: {
                members: true,
                posts: true,
                courses: true,
              },
            },
          },
        },
      },
      orderBy: {
        joinedAt: "desc",
      },
    });

    const joinedCommunities = membershipRecords.map((m) => m.community);

    console.log("✅ Joined communities:", joinedCommunities.length);

    return NextResponse.json({
      success: true,
      ownedCommunities,
      joinedCommunities,
    });
  } catch (error) {
    console.error("❌ Error in user-communities API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
