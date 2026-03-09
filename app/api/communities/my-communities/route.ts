import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";

// Force dynamic rendering - uses headers/cookies via auth()
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get all communities where user is the owner OR a member
    const memberships = await prisma.member.findMany({
      where: {
        userId: userId,
        status: "ACTIVE",
      },
      include: {
        community: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            imageUrl: true,
            coverImageUrl: true,
            createdAt: true,
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

    // Format the response
    const formattedCommunities = memberships.map((membership) => ({
      id: membership.community.id,
      name: membership.community.name,
      slug: membership.community.slug,
      description: membership.community.description,
      imageUrl: membership.community.imageUrl,
      coverImageUrl: membership.community.coverImageUrl,
      memberCount: membership.community._count.members,
      postCount: membership.community._count.posts,
      createdAt: membership.community.createdAt,
      role: membership.role,
    }));

    return NextResponse.json({
      success: true,
      communities: formattedCommunities,
    });
  } catch (error) {
    console.error("Error fetching communities:", error);
    return NextResponse.json(
      { error: "Failed to fetch communities" },
      { status: 500 }
    );
  }
}