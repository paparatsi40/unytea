import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth-utils";
import { PremiumPostFeed } from "@/components/community/PremiumPostFeed";
import { CommunityFeedSidebar } from "./CommunityFeedSidebar";

export default async function CommunityFeedPage({ params }: { params: Promise<{ slug: string }> }) {
  const userId = await getCurrentUserId();

  if (!userId) {
    redirect("/login");
  }

  const { slug } = await params;

  const community = await prisma.community.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      members: {
        where: {
          userId,
          status: "ACTIVE",
        },
        select: { id: true, role: true },
      },
    },
  });

  if (!community) {
    notFound();
  }

  if (community.members.length === 0) {
    redirect(`/dashboard/communities`);
  }

  const [posts, upcomingSession, hotTopics] = await Promise.all([
    prisma.post.findMany({
      where: {
        communityId: community.id,
        isPublished: true,
      },
      include: {
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
      orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
      take: 50,
    }),
    prisma.mentorSession.findFirst({
      where: {
        communityId: community.id,
        scheduledAt: {
          gte: new Date(),
        },
        status: {
          in: ["SCHEDULED", "IN_PROGRESS"],
        },
      },
      include: {
        mentor: {
          select: {
            name: true,
          },
        },
        _count: {
          select: {
            participations: true,
          },
        },
      },
      orderBy: {
        scheduledAt: "asc",
      },
    }),
    prisma.post.findMany({
      where: {
        communityId: community.id,
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      },
      include: {
        _count: {
          select: {
            comments: true,
          },
        },
      },
      orderBy: [{ comments: { _count: "desc" } }, { createdAt: "desc" }],
      take: 5,
    }),
  ]);

  const mappedUpcomingSession = upcomingSession
    ? {
        id: upcomingSession.id,
        title: upcomingSession.title,
        scheduledAt: upcomingSession.scheduledAt,
        duration: upcomingSession.duration,
        mentorName: upcomingSession.mentor?.name || null,
        attendeeCount: upcomingSession._count.participations,
        roomId: upcomingSession.roomId,
        status: upcomingSession.status,
      }
    : null;

  // Serialized shape for the client sidebar (localizes its own strings/dates).
  const sidebarSession = mappedUpcomingSession
    ? {
        id: mappedUpcomingSession.id,
        title: mappedUpcomingSession.title,
        scheduledAt: mappedUpcomingSession.scheduledAt.toISOString(),
        attendeeCount: mappedUpcomingSession.attendeeCount,
        roomId: mappedUpcomingSession.roomId,
        status: mappedUpcomingSession.status,
      }
    : null;

  const mappedHotTopics = hotTopics
    .filter((post) => post._count.comments > 0)
    .map((post) => ({
      id: post.id,
      title: post.title || post.content.slice(0, 70),
      commentCount: post._count.comments,
    }));

  const canModeratePosts = ["OWNER", "ADMIN", "MODERATOR"].includes(
    community.members[0]?.role ?? ""
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-4 py-6 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <PremiumPostFeed
            posts={posts as unknown as React.ComponentProps<typeof PremiumPostFeed>["posts"]}
            communityId={community.id}
            upcomingSession={mappedUpcomingSession}
            hotTopics={mappedHotTopics}
            canModeratePosts={canModeratePosts}
          />
        </div>

        <CommunityFeedSidebar communityName={community.name} upcomingSession={sidebarSession} />
      </div>
    </div>
  );
}
