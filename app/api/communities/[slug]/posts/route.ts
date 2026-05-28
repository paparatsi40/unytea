import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth-utils";

// Hard cap to prevent DoS via unbounded post fetches.
// Phase 2c.7: not cursor-based pagination because the in-memory
// SESSION_ANNOUNCEMENT priority sort (LIVE > Upcoming > Recent) is
// incompatible with cross-page cursors. Clients may pass ?limit=N
// to fetch fewer rows; the cap protects communities with many posts.
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

function parseLimit(value: string | null): number {
  if (!value) return DEFAULT_LIMIT;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_LIMIT;
  return Math.min(parsed, MAX_LIMIT);
}

export async function GET(request: NextRequest, props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  try {
    // Get userId from session (not from query params for security)
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized - Please sign in" }, { status: 401 });
    }

    const limit = parseLimit(request.nextUrl.searchParams.get("limit"));

    // Get community
    const community = await prisma.community.findUnique({
      where: { slug: params.slug },
      select: { id: true, isPrivate: true },
    });

    if (!community) {
      return NextResponse.json({ error: "Community not found" }, { status: 404 });
    }

    // Check membership if private
    if (community.isPrivate) {
      const membership = await prisma.member.findUnique({
        where: {
          userId_communityId: {
            userId,
            communityId: community.id,
          },
        },
        select: { status: true },
      });

      if (!membership || membership.status !== "ACTIVE") {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }
    }

    // Fetch posts (hard-capped)
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
      take: limit,
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
    return NextResponse.json(prioritizedPosts);
  } catch (error) {
    console.error("❌ API Error:", error);
    return NextResponse.json({ error: "Failed to fetch posts" }, { status: 500 });
  }
}
