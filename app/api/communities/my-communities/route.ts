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

    // Get all communities where user is the owner
    const communities = await prisma.community.findMany({
      where: {
        ownerId: userId,
      },
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
      orderBy: {
        createdAt: "desc",
      },
    });

    // Format the response
    const formattedCommunities = communities.map((community) => ({
      id: community.id,
      name: community.name,
      slug: community.slug,
      description: community.description,
      imageUrl: community.imageUrl,
      coverImageUrl: community.coverImageUrl,
      memberCount: community._count.members,
      postCount: community._count.posts,
      createdAt: community.createdAt,
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