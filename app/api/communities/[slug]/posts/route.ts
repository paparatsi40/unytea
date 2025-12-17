import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    const { slug } = await params;

    console.log("🔍 API: Fetching posts for community:", slug);

    // Get community
    const community = await prisma.community.findUnique({
      where: { slug: slug },
      select: { id: true, isPrivate: true },
    });

    if (!community) {
      return NextResponse.json(
        { error: "Community not found" },
        { status: 404 }
      );
    }

    // Get user from DB
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Check membership if private
    if (community.isPrivate) {
      const membership = await prisma.member.findUnique({
        where: {
          userId_communityId: {
            userId: user.id,
            communityId: community.id,
          },
        },
        select: { status: true },
      });

      if (!membership || membership.status !== "ACTIVE") {
        return NextResponse.json(
          { error: "Access denied" },
          { status: 403 }
        );
      }
    }

    // Fetch posts
    const posts = await prisma.post.findMany({
      where: {
        communityId: community.id,
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            image: true,
          },
        },
        _count: {
          select: {
            comments: true,
            reactions: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    console.log(`✓ API: Found ${posts.length} posts`);

    return NextResponse.json(posts);
  } catch (error) {
    console.error("❌ API Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch posts" },
      { status: 500 }
    );
  }
}
