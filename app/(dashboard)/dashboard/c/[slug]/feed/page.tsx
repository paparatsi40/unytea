import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth-utils";
import { PremiumPostFeed } from "@/components/community/PremiumPostFeed";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Play, Users } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default async function CommunityFeedPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
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

  const mappedHotTopics = hotTopics
    .filter((post) => post._count.comments > 0)
    .map((post) => ({
      id: post.id,
      title: post.title || post.content.slice(0, 70),
      commentCount: post._count.comments,
    }));

  const canModeratePosts = ["OWNER", "ADMIN", "MODERATOR"].includes(community.members[0]?.role ?? "");

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-4 py-6 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <PremiumPostFeed
            posts={posts as any}
            communityId={community.id}
            upcomingSession={mappedUpcomingSession}
            hotTopics={mappedHotTopics}
            canModeratePosts={canModeratePosts}
          />
        </div>

        <aside className="space-y-4 lg:col-span-4">
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-purple-600">
              Community feed
            </p>
            <h1 className="mt-1 text-lg font-semibold text-gray-900">{community.name}</h1>
            <p className="mt-1 text-sm text-gray-600">Live activity from real posts and member discussions.</p>
          </div>

          {mappedUpcomingSession ? (
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="bg-gradient-to-r from-zinc-900 to-zinc-800 p-4 text-white">
                <Badge className="mb-3 border-none bg-red-500/20 text-red-300">
                  <span className="mr-1.5 h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" />
                  {upcomingSession?.status === "IN_PROGRESS" ? "Live now" : "Upcoming"}
                </Badge>
                <h3 className="text-lg font-semibold">{mappedUpcomingSession.title}</h3>
                <div className="mt-2 space-y-1 text-sm text-zinc-300">
                  <p className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {formatDistanceToNow(new Date(mappedUpcomingSession.scheduledAt), { addSuffix: true })}
                  </p>
                  <p className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    {mappedUpcomingSession.attendeeCount} attending
                  </p>
                </div>
                <div className="mt-4 flex gap-2">
                  {mappedUpcomingSession.roomId ? (
                    <Link href={`/dashboard/sessions/${mappedUpcomingSession.id}/room`} className="flex-1">
                      <Button className="w-full bg-purple-600 hover:bg-purple-700">
                        <Play className="mr-2 h-4 w-4" />
                        {mappedUpcomingSession.status === "IN_PROGRESS" ? "Join now" : "Open room"}
                      </Button>
                    </Link>
                  ) : (
                    <Link href="/dashboard/sessions" className="flex-1">
                      <Button className="w-full bg-purple-600 hover:bg-purple-700">
                        <Calendar className="mr-2 h-4 w-4" />
                        Open sessions
                      </Button>
                    </Link>
                  )}
                  <Link href="/dashboard/sessions" className="flex-1">
                    <Button variant="outline" className="w-full border-zinc-700 bg-zinc-800/50 text-zinc-200 hover:bg-zinc-800">
                      View all
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-sm font-medium text-gray-900">No upcoming live sessions</p>
              <p className="mt-1 text-sm text-gray-600">When a new session is scheduled, it will appear here.</p>
              <Link href="/dashboard/sessions" className="mt-3 inline-block">
                <Button size="sm" variant="outline">Open sessions</Button>
              </Link>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
