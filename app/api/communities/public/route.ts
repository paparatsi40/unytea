import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    // Get all public communities
    const communities = await prisma.community.findMany({
      where: {
        isPrivate: false,
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
        memberCount: "desc",
      },
      take: 50, // Limit to 50 most popular communities
    });

    // If user is logged in, check which communities they're already in
    let userMembershipIds = new Set<string>();
    if (userId) {
      const memberships = await prisma.member.findMany({
        where: {
          userId: userId,
          status: "ACTIVE",
        },
        select: {
          communityId: true,
        },
      });
      userMembershipIds = new Set(memberships.map((m) => m.communityId));
    }

    // Transform data to include isMember flag
    const transformedCommunities = communities.map((community) => ({
      id: community.id,
      name: community.name,
      slug: community.slug,
      description: community.description,
      imageUrl: community.imageUrl,
      coverImageUrl: community.coverImageUrl,
      isPaid: community.isPaid || false,
      memberCount: community.memberCount || community._count.members,
      postCount: community.postCount || community._count.posts,
      isMember: userMembershipIds.has(community.id),
      owner: {
        firstName: community.owner.firstName,
        lastName: community.owner.lastName,
        image: community.owner.image,
      },
    }));

    return NextResponse.json({
      success: true,
      communities: transformedCommunities,
    });
  } catch (error) {
    console.error("Error fetching public communities:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch public communities",
      },
      { status: 500 }
    );
  }
}