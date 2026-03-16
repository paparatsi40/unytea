import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
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

    console.log("🔍 API: Fetching posts for community:", params.slug);

    // Get community
    const community = await prisma.community.findUnique({
      where: { slug: params.slug },
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
      select: {
        id: true,
        title: true,
        content: true,
        contentType: true,
        attachments: true,
        createdAt: true,
        communityId: true,
        author: {
          select: {
            id: true,
            name: true,
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

    // Prioritize session announcements (LIVE first, then upcoming) to increase attendance
    const now = new Date();
    const announcementSessionIds = posts
      .filter((p) => p.contentType === "SESSION_ANNOUNCEMENT")
      .map((p) => {
        const attachments = p.attachments as any;
        return attachments?.sessionId as string | undefined;
      })
      .filter((id): id is string => Boolean(id));

    const sessions = announcementSessionIds.length
      ? await prisma.mentorSession.findMany({
          where: { id: { in: announcementSessionIds } },
          select: { id: true, status: true, scheduledAt: true },
        })
      : [];

    const sessionMap = new Map(sessions.map((s) => [s.id, s]));

    const getPriority = (post: (typeof posts)[number]) => {
      if (post.contentType !== "SESSION_ANNOUNCEMENT") return 3;

      const attachments = post.attachments as any;
      const sessionId = attachments?.sessionId as string | undefined;
      if (!sessionId) return 3;

      const session = sessionMap.get(sessionId);
      if (!session) return 3;

      if (session.status === "IN_PROGRESS") return 0; // LIVE now
      if (session.status === "SCHEDULED" && session.scheduledAt > now) return 1; // Upcoming
      if (session.status === "COMPLETED") return 2; // Recent recording/recap context

      return 3;
    };

    const prioritizedPosts = [...posts].sort((a, b) => {
      const priorityDiff = getPriority(a) - getPriority(b);
      if (priorityDiff !== 0) return priorityDiff;

      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    console.log(`✓ API: Found ${posts.length} posts`);

    return NextResponse.json(prioritizedPosts);
  } catch (error) {
    console.error("❌ API Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch posts" },
      { status: 500 }
    );
  }
}
