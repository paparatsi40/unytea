import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { joinCommunity } from "@/app/actions/communities";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Calendar } from "lucide-react";
import { headers } from "next/headers";

function formatHostName(owner: {
  name: string | null;
  firstName: string | null;
  lastName: string | null;
}) {
  const fullName = [owner.firstName, owner.lastName].filter(Boolean).join(" ").trim();
  return fullName || owner.name || "Unytea Host";
}

function formatSchedule(date: Date | null) {
  if (!date) return "No upcoming session announced";
  return date.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function trackPublicCommunityEvent(params: {
  eventName: "community_preview_view" | "join_cta_click" | "join_success";
  communityId: string;
  communitySlug: string;
  source: string;
  locale: string;
  userId?: string | null;
  extra?: Record<string, unknown>;
}) {
  console.info("[PublicDiscoveryEvent]", {
    at: new Date().toISOString(),
    ...params,
  });
}

export async function generateMetadata({
  params,
}: {
  params: { locale: string; slug: string };
}): Promise<Metadata> {
  const community = await prisma.community.findUnique({
    where: { slug: params.slug },
    select: {
      name: true,
      description: true,
      imageUrl: true,
      owner: { select: { name: true, firstName: true, lastName: true } },
    },
  });

  if (!community) {
    return {
      title: "Community Not Found | Unytea",
      description: "This community preview is not available.",
      robots: { index: false, follow: false },
    };
  }

  const title = `${community.name} Community | Unytea`;
  const host = formatHostName(community.owner);
  const description =
    community.description?.slice(0, 160) ||
    `Join ${community.name} hosted by ${host} on Unytea.`;
  const canonical = `https://www.unytea.com/${params.locale}/community/${params.slug}`;
  const image = community.imageUrl || "https://www.unytea.com/og-image.png";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      url: canonical,
      images: [{ url: image, width: 1200, height: 630 }],
      siteName: "Unytea",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
    alternates: { canonical },
    robots: { index: true, follow: true },
  };
}

export default async function CommunityPublicPreviewPage({
  params,
  searchParams,
}: {
  params: { locale: string; slug: string };
  searchParams?: { src?: string; rank?: string; sort?: string };
}) {
  const { slug, locale } = params;
  const source = searchParams?.src || "direct";

  const community = await prisma.community.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      isPaid: true,
      owner: {
        select: {
          name: true,
          firstName: true,
          lastName: true,
        },
      },
      _count: {
        select: {
          members: true,
          sessions: true,
        },
      },
      sessions: {
        where: {
          status: "SCHEDULED",
          scheduledAt: { gt: new Date() },
        },
        orderBy: { scheduledAt: "asc" },
        take: 1,
        select: {
          id: true,
          title: true,
          scheduledAt: true,
        },
      },
      posts: {
        orderBy: { createdAt: "desc" },
        take: 3,
        select: {
          id: true,
          title: true,
          content: true,
          createdAt: true,
          author: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  if (!community) {
    notFound();
  }

  const currentCommunity = community;
  const session = await auth();
  const userId = session?.user?.id;
  let membershipStatus: "ACTIVE" | "PENDING" | null = null;

  const headerBag = headers();
  const userAgent = headerBag.get("user-agent") || "unknown";

  trackPublicCommunityEvent({
    eventName: "community_preview_view",
    communityId: currentCommunity.id,
    communitySlug: currentCommunity.slug,
    source,
    locale,
    userId,
    extra: {
      rank: searchParams?.rank || null,
      sort: searchParams?.sort || null,
      userAgent,
    },
  });

  if (userId) {
    const membership = await prisma.member.findUnique({
      where: {
        userId_communityId: {
          userId,
          communityId: currentCommunity.id,
        },
      },
      select: {
        status: true,
      },
    });

    if (membership?.status === "ACTIVE") membershipStatus = "ACTIVE";
    if (membership?.status === "PENDING") membershipStatus = "PENDING";
  }

  async function handleJoin() {
    "use server";

    const joiner = await auth();

    trackPublicCommunityEvent({
      eventName: "join_cta_click",
      communityId: currentCommunity.id,
      communitySlug: currentCommunity.slug,
      source,
      locale,
      userId: joiner?.user?.id,
      extra: {
        rank: searchParams?.rank || null,
        sort: searchParams?.sort || null,
      },
    });

    if (!joiner?.user?.id) {
      redirect(`/auth/signin?callbackUrl=/${locale}/community/${slug}`);
    }

    const result = await joinCommunity(currentCommunity.id);
    if (result.success) {
      trackPublicCommunityEvent({
        eventName: "join_success",
        communityId: currentCommunity.id,
        communitySlug: currentCommunity.slug,
        source,
        locale,
        userId: joiner.user.id,
      });
      redirect(`/dashboard/c/${currentCommunity.slug}`);
    }

    redirect(`/${locale}/community/${currentCommunity.slug}`);
  }

  const nextSession = currentCommunity.sessions[0] ?? null;

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [sessionsThisMonth, upcomingSessionsCount, completedSessions] = await Promise.all([
    prisma.mentorSession.count({
      where: {
        communityId: currentCommunity.id,
        scheduledAt: { gte: monthStart },
      },
    }),
    prisma.mentorSession.count({
      where: {
        communityId: currentCommunity.id,
        status: "SCHEDULED",
        scheduledAt: { gt: new Date() },
      },
    }),
    prisma.mentorSession.findMany({
      where: {
        communityId: currentCommunity.id,
        status: "COMPLETED",
      },
      orderBy: { scheduledAt: "desc" },
      take: 12,
      select: { attendeeCount: true },
    }),
  ]);

  const averageAttendance = completedSessions.length
    ? Math.round(
        completedSessions.reduce((sum, item) => sum + (item.attendeeCount || 0), 0) /
          completedSessions.length
      )
    : 0;

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <section className="mb-8 grid gap-4 lg:grid-cols-[1.7fr_1fr]">
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center gap-3">
              <h1 className="text-3xl font-bold text-foreground">{currentCommunity.name}</h1>
              <Badge variant="outline">{currentCommunity.isPaid ? "Paid" : "Free"}</Badge>
            </div>
            <p className="text-muted-foreground">
              {currentCommunity.description || "Community preview page"}
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Host</p>
                <p className="mt-1 font-medium text-foreground">{formatHostName(currentCommunity.owner)}</p>
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Members</p>
                <p className="mt-1 flex items-center gap-2 font-medium text-foreground">
                  <Users className="h-4 w-4" />
                  {currentCommunity._count.members}
                </p>
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Next session</p>
                <p className="mt-1 flex items-center gap-2 font-medium text-foreground">
                  <Calendar className="h-4 w-4" />
                  {formatSchedule(nextSession?.scheduledAt ?? null)}
                </p>
                {nextSession && <p className="mt-1 text-xs text-muted-foreground">{nextSession.title}</p>}
              </div>
            </div>

            <div className="mt-4 rounded-lg border border-border bg-background p-3">
              <p className="text-sm font-semibold text-foreground">What you get</p>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                <li>• Weekly live sessions and Q&A</li>
                <li>• Full recordings and recap insights</li>
                <li>• Member discussions between sessions</li>
              </ul>
            </div>
          </div>

          <div className="rounded-xl border border-primary/30 bg-primary/5 p-5">
            <h2 className="text-lg font-semibold text-foreground">Join this community</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Attend live sessions, access full feed and recordings, and unlock member-only discussions.
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Most active communities host sessions every week.
            </p>
            <div className="mt-4 flex flex-col gap-2">
              {membershipStatus === "ACTIVE" ? (
                <Link href={`/dashboard/c/${currentCommunity.slug}`}>
                  <Button className="w-full">Go to community</Button>
                </Link>
              ) : membershipStatus === "PENDING" ? (
                <Button className="w-full" disabled>Request pending approval</Button>
              ) : (
                <form action={handleJoin}>
                  <Button className="w-full" type="submit">{userId ? "Join community" : "Sign in to join community"}</Button>
                </form>
              )}
              <Link href={`/${locale}/explore`}>
                <Button className="w-full" variant="outline">Back to explore</Button>
              </Link>
            </div>
          </div>
        </section>

        <section className="mb-8 rounded-xl border border-border bg-card p-5">
          <h2 className="text-lg font-semibold text-foreground">Session momentum</h2>
          <p className="mt-1 text-sm text-muted-foreground">A quick view of how active this community is right now.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Sessions this month</p>
              <p className="mt-1 text-xl font-semibold text-foreground">{sessionsThisMonth}</p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Average attendance</p>
              <p className="mt-1 text-xl font-semibold text-foreground">{averageAttendance}</p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Upcoming sessions</p>
              <p className="mt-1 text-xl font-semibold text-foreground">{upcomingSessionsCount}</p>
            </div>
          </div>
        </section>

        <section className="mb-8 rounded-xl border border-border bg-card p-5">
          <h2 className="text-lg font-semibold text-foreground">Discussion preview</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Public teaser only. Full feed and recordings unlock after joining.
          </p>

          <div className="mt-4 space-y-3">
            {currentCommunity.posts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No public discussion preview yet.</p>
            ) : (
              currentCommunity.posts.map((post) => (
                <div key={post.id} className="rounded-lg border border-border p-3">
                  <p className="font-medium text-foreground">
                    {post.title || post.content.slice(0, 80) || "Untitled discussion"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    by {post.author.name || "Member"}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-lg font-semibold text-foreground">First session checklist</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Quick path to get value in your first week.
          </p>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li>1. Join the community and introduce yourself.</li>
            <li>2. RSVP to the next live session.</li>
            <li>3. Drop one question in the discussion feed.</li>
          </ul>
          <div className="mt-4">
            <Link href={`/${locale}/explore`}>
              <Button variant="outline">Discover more communities</Button>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
