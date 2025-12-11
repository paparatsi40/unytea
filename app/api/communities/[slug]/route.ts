import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("userId");

    // Get community
    const community = await prisma.community.findUnique({
      where: { slug: params.slug },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        imageUrl: true,
        coverImageUrl: true,
        isPrivate: true,
        memberCount: true,
        postCount: true,
        landingLayout: true,
        _count: {
          select: {
            members: true,
            posts: true,
          },
        },
      },
    });

    if (!community) {
      return NextResponse.json(
        { error: "Community not found" },
        { status: 404 }
      );
    }

    // Transform to match expected format
    const communityData = {
      ...community,
      _count: {
        members: community._count.members || community.memberCount,
        posts: community._count.posts || community.postCount,
      },
    };

    // If userId provided, check membership
    let membership = null;
    if (userId) {
      membership = await prisma.member.findUnique({
        where: {
          userId_communityId: {
            userId,
            communityId: community.id,
          },
        },
        select: {
          role: true,
          status: true,
        },
      });
    }

    return NextResponse.json({ 
      community: communityData, 
      membership,
      // Also return just the data for simple queries
      id: community.id,
      name: community.name,
      slug: community.slug,
      landingLayout: community.landingLayout,
    });
  } catch (error) {
    console.error("Error fetching community:", error);
    return NextResponse.json(
      { error: "Failed to fetch community" },
      { status: 500 }
    );
  }
}
