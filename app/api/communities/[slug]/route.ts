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
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        _count: {
          select: {
            members: true,
            posts: true,
            courses: true,
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
      image: community.imageUrl,
      coverImage: community.coverImageUrl,
      _count: {
        members: community._count.members,
        posts: community._count.posts,
        courses: community._count.courses,
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
