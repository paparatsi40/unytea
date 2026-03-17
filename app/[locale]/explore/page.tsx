import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { ArrowRight, Clock, Flame } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExploreFilters } from "@/components/explore/ExploreFilters";
import { ExploreInfiniteFeed } from "@/components/explore/ExploreInfiniteFeed";

const DEFAULT_CATEGORIES = ["AI", "Startups", "Fitness", "Marketing"];

function hostName(owner: {
  name: string | null;
  firstName: string | null;
  lastName: string | null;
}) {
  const fullName = [owner.firstName, owner.lastName].filter(Boolean).join(" ").trim();
  return fullName || owner.name || "Unytea Host";
}

function communityCategory(settings: unknown): string {
  if (!settings || typeof settings !== "object") return "General";
  const candidate = (settings as Record<string, unknown>).category;
  if (typeof candidate === "string" && candidate.trim().length > 0) {
    return candidate.trim();
  }
  return "General";
}

function communityLanguage(settings: unknown): string {
  if (!settings || typeof settings !== "object") return "Any";
  const candidate = (settings as Record<string, unknown>).language;
  if (typeof candidate === "string" && candidate.trim().length > 0) {
    return candidate.trim();
  }
  return "Any";
}

function formatSessionSlot(date: Date) {
  return date.toLocaleString("en-US", {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

function truncate(text: string, max = 90) {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

function cleanPreviewText(text: string) {
  const raw = text.trim();
  if (!raw) return "Start meaningful conversations and learn together.";

  if (/session recap|testing|debug|lorem ipsum/i.test(raw)) {
    return "Members ask focused questions, share wins, and help each other execute.";
  }

  return raw;
}

function getUpcomingSessionWeight(nextSessionAt: Date | null, now: Date): number {
  if (!nextSessionAt) return 0;

  const hoursUntil = (nextSessionAt.getTime() - now.getTime()) / (1000 * 60 * 60);
  if (hoursUntil <= 24) return 5;
  if (hoursUntil <= 72) return 3;
  if (hoursUntil <= 7 * 24) return 2;
  return 0;
}

function getSessionUrgencyLabel(date: Date): string {
  const now = new Date();
  const hoursUntil = (date.getTime() - now.getTime()) / (1000 * 60 * 60);

  if (hoursUntil <= 2) return "🟢 Starting soon";
  if (hoursUntil <= 24) return "🟢 Today";
  if (hoursUntil <= 72) return "🟢 This week";
  return "🟢 Upcoming";
}

function dayNameFromIndex(dayOfWeek: number | null | undefined) {
  if (dayOfWeek === null || dayOfWeek === undefined) return null;
  const names = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return names[dayOfWeek] || null;
}

function everySeriesLabel(series: {
  frequency?: string | null;
  dayOfWeek?: number | null;
  startTime?: string | null;
} | null | undefined) {
  if (!series || series.frequency !== "WEEKLY") return null;
  const day = dayNameFromIndex(series.dayOfWeek);
  if (!day) return null;
  if (!series.startTime) return `Every ${day}`;

  const [h, m] = series.startTime.split(":");
  const hour = Number(h);
  const minute = Number(m || "0");
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return `Every ${day}`;

  const sample = new Date();
  sample.setHours(hour, minute, 0, 0);
  return `Every ${day} · ${sample.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
}

function getBoostScore(settings: unknown): number {
  if (!settings || typeof settings !== "object") return 0;
  const value = (settings as Record<string, unknown>).boostScore;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return 0;
}

export async function generateMetadata({
  params,
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const canonical = `https://www.unytea.com/${params.locale}/explore`;
  const title = "Explore Communities | Unytea";
  const description =
    "Discover live communities, trending topics, and sessions happening this week on Unytea.";

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      type: "website",
      url: canonical,
      images: [{ url: "https://www.unytea.com/og-image.png", width: 1200, height: 630 }],
      siteName: "Unytea",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["https://www.unytea.com/og-image.png"],
    },
    robots: { index: true, follow: true },
  };
}

export default async function ExploreCommunitiesPage({
  params,
  searchParams,
}: {
  params: { locale: string };
  searchParams?: {
    q?: string;
    category?: string;
    monetization?: "all" | "free" | "paid";
    language?: string;
    sessionsWeek?: "all" | "yes";
    sort?: "trending" | "members" | "newest";
  };
}) {
  const query = searchParams?.q?.trim() || "";
  const selectedCategory = searchParams?.category?.trim() || "all";
  const selectedMonetization = searchParams?.monetization?.trim() || "all";
  const selectedLanguage = searchParams?.language?.trim() || "all";
  const selectedSessionsWeek = searchParams?.sessionsWeek?.trim() || "all";
  const selectedSort = searchParams?.sort?.trim() || "trending";
  const locale = params.locale || "en";

  const now = new Date();
  const weekAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const communities = await prisma.community.findMany({
    where: {
      isPrivate: false,
      ...(query
        ? {
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { description: { contains: query, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(selectedMonetization === "paid" ? { isPaid: true } : {}),
      ...(selectedMonetization === "free" ? { isPaid: false } : {}),
    },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      settings: true,
      isPaid: true,
      createdAt: true,
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
        },
      },
      sessions: {
        where: {
          status: "SCHEDULED",
          scheduledAt: { gt: now },
        },
        orderBy: { scheduledAt: "asc" },
        take: 4,
        select: {
          id: true,
          title: true,
          scheduledAt: true,
          series: {
            select: {
              frequency: true,
              dayOfWeek: true,
              startTime: true,
            },
          },
        },
      },
      posts: {
        where: {
          isPublished: true,
        },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          title: true,
          content: true,
        },
      },
    },
    take: 80,
  });

  const communityIds = communities.map((community) => community.id);

  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const recentPosts = communityIds.length
    ? await prisma.post.groupBy({
        by: ["communityId"],
        where: {
          communityId: { in: communityIds },
          createdAt: { gte: sevenDaysAgo },
        },
        _count: {
          communityId: true,
        },
      })
    : [];

  const recentMembers = communityIds.length
    ? await prisma.member.findMany({
        where: {
          communityId: { in: communityIds },
          joinedAt: { gte: sevenDaysAgo },
        },
        select: {
          communityId: true,
        },
      })
    : [];

  const sessionIds = communities.flatMap((community) => community.sessions.map((session) => session.id));

  const attendingRows = sessionIds.length
    ? await prisma.sessionParticipation.findMany({
        where: {
          sessionId: { in: sessionIds },
        },
        select: {
          sessionId: true,
        },
      })
    : [];

  const attendingBySession = new Map<string, number>();
  for (const row of attendingRows) {
    attendingBySession.set(row.sessionId, (attendingBySession.get(row.sessionId) || 0) + 1);
  }

  const postsByCommunity = new Map(
    recentPosts.map((row) => [row.communityId, row._count.communityId])
  );
  const newMembersByCommunity = new Map<string, number>();
  for (const row of recentMembers) {
    newMembersByCommunity.set(
      row.communityId,
      (newMembersByCommunity.get(row.communityId) || 0) + 1
    );
  }

  const normalized = communities.map((community) => {
    const category = communityCategory(community.settings);
    const language = communityLanguage(community.settings);
    const sessionsThisWeekList = community.sessions.filter(
      (session) => session.scheduledAt >= now && session.scheduledAt <= weekAhead
    );
    const nextSession = community.sessions[0] ?? null;
    const nextSessionAttending = nextSession
      ? attendingBySession.get(nextSession.id) || 0
      : 0;

    const recentPostCount = postsByCommunity.get(community.id) || 0;
    const newMembersLast7d = newMembersByCommunity.get(community.id) || 0;

    const upcomingSessionWeight = getUpcomingSessionWeight(
      nextSession?.scheduledAt ?? null,
      now
    );

    const isNew =
      now.getTime() - community.createdAt.getTime() <= 14 * 24 * 60 * 60 * 1000;

    const boostScore = getBoostScore(community.settings);

    const rankingScore =
      upcomingSessionWeight * 5 +
      nextSessionAttending * 3 +
      sessionsThisWeekList.length * 2 +
      recentPostCount * 1.5 +
      newMembersLast7d * 2 +
      (isNew ? 1 : 0) +
      boostScore;

    const previewPost =
      community.posts[0]?.title ||
      community.posts[0]?.content ||
      "Start meaningful conversations and learn together.";

    return {
      ...community,
      category,
      language,
      sessionsThisWeekList,
      sessionsThisWeek: sessionsThisWeekList.length,
      nextSession,
      nextSessionAttending,
      recentPostCount,
      newMembersLast7d,
      upcomingSessionWeight,
      boostScore,
      rankingScore,
      isNew,
      previewPost: truncate(cleanPreviewText(previewPost), 78),
};
  });

  const filtered = normalized.filter((community) => {
    const categoryMatch =
      selectedCategory === "all" ||
      community.category.toLowerCase() === selectedCategory.toLowerCase();

    const languageMatch =
      selectedLanguage === "all" ||
      community.language.toLowerCase() === selectedLanguage.toLowerCase();

    const sessionsWeekMatch =
      selectedSessionsWeek === "all" || community.sessionsThisWeek > 0;

    return categoryMatch && languageMatch && sessionsWeekMatch;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (selectedSort === "members") {
      return b._count.members - a._count.members;
    }
    if (selectedSort === "newest") {
      return b.createdAt.getTime() - a.createdAt.getTime();
    }
    return b.rankingScore - a.rankingScore;
  });

  const trendingCommunities = sorted.slice(0, 3).map((community, index) => ({
    ...community,
    isTrending: index < 3,
  }));

  const liveThisWeek = sorted
    .flatMap((community) =>
      community.sessionsThisWeekList.map((session) => ({
        id: session.id,
        title: session.title,
        scheduledAt: session.scheduledAt,
        communityName: community.name,
        communitySlug: community.slug,
        attendingCount: attendingBySession.get(session.id) || 0,
      }))
    )
    .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime())
    .slice(0, 6);

  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const startOfTomorrow = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);
  const startOfDayAfterTomorrow = new Date(startOfTomorrow.getTime() + 24 * 60 * 60 * 1000);

  const todaySessions = liveThisWeek.filter(
    (session) => session.scheduledAt >= startOfToday && session.scheduledAt < startOfTomorrow
  );
  const tomorrowSessions = liveThisWeek.filter(
    (session) => session.scheduledAt >= startOfTomorrow && session.scheduledAt < startOfDayAfterTomorrow
  );
  const thisWeekSessions = liveThisWeek.filter(
    (session) => session.scheduledAt >= startOfDayAfterTomorrow && session.scheduledAt <= weekAhead
  );

  const suggestedWhenEmpty = sorted.slice(0, 3);
  const hasHappening = liveThisWeek.length > 0;
  const newCommunities = [...sorted]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 3);

  const categories = Array.from(
    new Set([...DEFAULT_CATEGORIES, ...normalized.map((c) => c.category)])
  );
  const languages = Array.from(new Set(normalized.map((c) => c.language))).filter(Boolean);

  const initialFeedItems = sorted.slice(0, 12).map((community) => ({
    id: community.id,
    slug: community.slug,
    name: community.name,
    description: community.description,
    isPaid: community.isPaid,
    owner: community.owner,
    membersCount: community._count.members,
    nextSession: community.nextSession
      ? {
          id: community.nextSession.id,
          title: community.nextSession.title,
          scheduledAt: community.nextSession.scheduledAt.toISOString(),
        }
      : null,
    nextSessionAttending: community.nextSessionAttending,
    sessionsThisWeek: community.sessionsThisWeek,
    postsLast7d: community.recentPostCount,
    newMembersLast7d: community.newMembersLast7d,
    isNew: community.isNew,
    rankingScore: community.rankingScore,
  }));

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-6xl space-y-8 px-4 py-10 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Explore communities</h1>
            <p className="mt-2 text-muted-foreground">
              Join live sessions. Learn with others. Grow faster.
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Find communities with live sessions happening this week.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href={`/${locale}/library?src=explore`}>Open Library</Link>
          </Button>
        </div>

        <ExploreFilters
          categories={categories}
          languages={languages}
          initial={{
            q: query,
            category: selectedCategory,
            monetization: selectedMonetization,
            language: selectedLanguage,
            sessionsWeek: selectedSessionsWeek,
            sort: selectedSort,
          }}
        />

        {hasHappening && (
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-green-600" />
              <h2 className="text-xl font-semibold">🟢 Happening this week</h2>
            </div>

            <div className="space-y-4">
              {todaySessions.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-foreground">Today</p>
                  <div className="grid gap-3 md:grid-cols-2">
                    {todaySessions.map((session) => (
                      <Link
                        key={session.id}
                        href={`/${locale}/community/${session.communitySlug}?src=explore_happening_today`}
                        className="rounded-xl border border-border bg-card p-4 transition hover:border-primary/50"
                      >
                        <p className="text-sm font-semibold text-foreground">{session.title}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {getSessionUrgencyLabel(session.scheduledAt)} · {session.scheduledAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                        </p>
                        <p className="mt-2 text-sm text-muted-foreground">🔥 {session.attendingCount} attending</p>
                        <p className="mt-2 text-xs font-medium text-primary">View community →</p>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {tomorrowSessions.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-foreground">Tomorrow</p>
                  <div className="grid gap-3 md:grid-cols-2">
                    {tomorrowSessions.map((session) => (
                      <Link
                        key={session.id}
                        href={`/${locale}/community/${session.communitySlug}?src=explore_happening_tomorrow`}
                        className="rounded-xl border border-border bg-card p-4 transition hover:border-primary/50"
                      >
                        <p className="text-sm font-semibold text-foreground">{session.title}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {getSessionUrgencyLabel(session.scheduledAt)} · {session.scheduledAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                        </p>
                        <p className="mt-2 text-sm text-muted-foreground">🔥 {session.attendingCount} attending</p>
                        <p className="mt-2 text-xs font-medium text-primary">View community →</p>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {thisWeekSessions.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-foreground">This week</p>
                  <div className="grid gap-3 md:grid-cols-2">
                    {thisWeekSessions.map((session) => (
                      <Link
                        key={session.id}
                        href={`/${locale}/community/${session.communitySlug}?src=explore_happening_week`}
                        className="rounded-xl border border-border bg-card p-4 transition hover:border-primary/50"
                      >
                        <p className="text-sm font-semibold text-foreground">{session.title}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {getSessionUrgencyLabel(session.scheduledAt)} · {session.scheduledAt.toLocaleDateString("en-US", { weekday: "long" })} · {session.scheduledAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                        </p>
                        <p className="mt-2 text-sm text-muted-foreground">🔥 {session.attendingCount} attending</p>
                        <p className="mt-2 text-xs font-medium text-primary">View community →</p>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        <section className="space-y-3">
<div className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-amber-500" />
            <h2 className="text-xl font-semibold">Growing communities this week</h2>
            <p className="text-xs text-amber-600">Ranked by member growth, activity, and upcoming sessions</p>
          </div>

          {trendingCommunities.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
              No communities match your filters yet.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              {trendingCommunities.map((community, index) => {
                const nextSessionText = community.nextSession
                  ? `Next: ${formatSessionSlot(community.nextSession.scheduledAt)}`
                  : "Weekly live sessions";
                const seriesIdentity = everySeriesLabel(community.nextSession?.series);

                const socialProof = community.nextSessionAttending > 0
                  ? `${community.nextSessionAttending} attending`
                  : community.sessionsThisWeek > 0
                    ? "Weekly sessions"
                    : community.isNew
                      ? "Be one of the first members"
                      : "Growing community";

                const badge = community.isNew ? "🆕 New" : "🔥 Trending";

                return (
                  <Link
                    key={community.id}
                    href={`/${locale}/community/${community.slug}?src=explore_trending&rank=${index + 1}&sort=trending`}
                    className="group rounded-xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-lg"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <Badge>{badge}</Badge>
                      <Badge variant="outline">{community.isPaid ? "Paid access" : "Free access"}</Badge>
                    </div>

                    <h3 className="text-lg font-semibold text-foreground">{community.name}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {community.description?.trim() || "Learn with live sessions and community."}
                    </p>

                    <p className="mt-3 text-sm text-muted-foreground">👤 {hostName(community.owner)} (Host)</p>
                    <p className="text-sm text-muted-foreground">👥 {community._count.members} members</p>

                    <p className="mt-3 text-sm font-medium text-foreground">🟢 {nextSessionText}</p>
                    {seriesIdentity && <p className="text-xs text-muted-foreground">{seriesIdentity}</p>}
                    <p className="text-sm text-muted-foreground">🔥 {socialProof}</p>
                    <p className="mt-2 text-xs text-muted-foreground">💬 “{community.previewPost}”</p>

                    <div className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
                      View community <ArrowRight className="h-4 w-4" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {!hasHappening && (
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-green-600" />
              <h2 className="text-xl font-semibold">🟢 Live sessions every week</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Join a community to attend the next live session.
            </p>
            <div className="grid gap-3 md:grid-cols-3">
              {suggestedWhenEmpty.map((community, index) => (
                <Link
                  key={community.id}
                  href={`/${locale}/community/${community.slug}?src=explore_happening_empty&rank=${index + 1}`}
                  className="rounded-lg border border-border bg-background p-3 transition hover:border-primary/50"
                >
                  <p className="text-sm font-semibold text-foreground">{community.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{community._count.members} members</p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {!hasHappening && newCommunities.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-xl font-semibold">New communities</h2>
            <div className="grid gap-3 md:grid-cols-3">
              {newCommunities.map((community, index) => (
                <Link
                  key={community.id}
                  href={`/${locale}/community/${community.slug}?src=explore_new_communities&rank=${index + 1}`}
                  className="rounded-lg border border-border bg-card p-4 transition hover:border-primary/50"
                >
                  <p className="text-sm font-semibold text-foreground">{community.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{community.description?.trim() || "New community with live sessions."}</p>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">All communities</h2>
            <p className="text-sm text-muted-foreground">{sorted.length} communities</p>
          </div>

          <ExploreInfiniteFeed
            locale={locale}
            initialItems={initialFeedItems}
            initialCursor={sorted.length > 12 ? 12 : null}
            filters={{
              q: query,
              category: selectedCategory,
              monetization: selectedMonetization,
              language: selectedLanguage,
              sessionsWeek: selectedSessionsWeek,
              sort: selectedSort,
            }}
          />
</section>
      </main>
    </div>
  );
}
