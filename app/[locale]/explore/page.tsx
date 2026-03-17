import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { ArrowRight, Calendar, Clock, Flame, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExploreFilters } from "@/components/explore/ExploreFilters";

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

  const recentPosts = communityIds.length
    ? await prisma.post.groupBy({
        by: ["communityId"],
        where: {
          communityId: { in: communityIds },
          createdAt: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) },
        },
        _count: {
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

    const trendingScore =
      community._count.members * 1 +
      sessionsThisWeekList.length * 10 +
      recentPostCount * 2 +
      nextSessionAttending * 1.5;

    const isNew =
      now.getTime() - community.createdAt.getTime() <= 14 * 24 * 60 * 60 * 1000;

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
      trendingScore,
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
    return b.trendingScore - a.trendingScore;
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
    .slice(0, 8);

  const categories = Array.from(
    new Set([...DEFAULT_CATEGORIES, ...normalized.map((c) => c.category)])
  );
  const languages = Array.from(new Set(normalized.map((c) => c.language))).filter(Boolean);

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

        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-green-600" />
            <h2 className="text-xl font-semibold">Live this week</h2>
          </div>

          {liveThisWeek.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
              New sessions every week. Explore communities and join the next live event.
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {liveThisWeek.map((session) => (
                <Link
                  key={session.id}
                  href={`/${locale}/community/${session.communitySlug}?src=explore_live_week`}
                  className="rounded-xl border border-border bg-card p-4 transition hover:border-primary/50"
                >
                  <p className="text-sm font-semibold text-foreground">{session.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{session.communityName}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {formatSessionSlot(session.scheduledAt)}</span>
                    <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {session.attendingCount} attending</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>


        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">All communities</h2>
            <p className="text-sm text-muted-foreground">{sorted.length} communities</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sorted.map((community, index) => {
              const nextSessionText = community.nextSession
                ? `Next: ${formatSessionSlot(community.nextSession.scheduledAt)}`
                : "New sessions every week";

              const socialProof = community.nextSessionAttending > 0
                ? `${community.nextSessionAttending} attending`
                : community.sessionsThisWeek > 0
                  ? "Weekly sessions"
                  : community.isNew
                    ? "Be one of the first members"
                    : "Growing community";

              const tagBadges = [
                community.isNew ? "🆕 New" : null,
                community.sessionsThisWeek > 0 ? "📅 Weekly sessions" : null,
                community.recentPostCount >= 3 ? "💬 Active" : null,
              ].filter(Boolean) as string[];

              return (
                <Link
                  key={community.id}
                  href={`/${locale}/community/${community.slug}?src=explore_card&rank=${index + 1}&sort=${selectedSort}`}
                  className="group rounded-xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
                >
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{community.isPaid ? "Paid access" : "Free access"}</Badge>
                    {tagBadges.slice(0, 2).map((tag) => (
                      <Badge key={tag} variant="secondary">{tag}</Badge>
                    ))}
                  </div>

                  <h3 className="text-lg font-semibold text-foreground">{community.name}</h3>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                    {community.description?.trim() || "Learn with live sessions and community."}
                  </p>

                  <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                    <p>👤 {hostName(community.owner)} (Host)</p>
                    <p>👥 {community._count.members} members</p>
                    <p>🟢 {nextSessionText}</p>
                    <p>🔥 {socialProof}</p>
                    <p className="line-clamp-1">💬 “{community.previewPost}”</p>
                  </div>

                  <div className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
                    View community <ArrowRight className="h-4 w-4" />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
