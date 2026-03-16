import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { Users, Calendar, Sparkles, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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

function formatNextSession(date: Date | null, title: string | null) {
  if (!date) return "No upcoming live session";
  const time = date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  return title ? `${title} · ${time}` : `Next live · ${time}`;
}

export async function generateMetadata({
  params,
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const canonical = `https://www.unytea.com/${params.locale}/explore`;
  const title = "Explore Communities | Unytea";
  const description =
    "Discover active communities, trending topics, and upcoming live sessions on Unytea.";

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
        take: 3,
        select: {
          id: true,
          title: true,
          scheduledAt: true,
        },
      },
    },
    take: 80,
  });

  const communityIds = communities.map((community) => community.id);

  const recentPosts = await prisma.post.groupBy({
    by: ["communityId"],
    where: {
      communityId: { in: communityIds },
      createdAt: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) },
    },
    _count: {
      communityId: true,
    },
  });

  const postsByCommunity = new Map(
    recentPosts.map((row) => [row.communityId, row._count.communityId])
  );

  const normalized = communities.map((community) => {
    const nextSession = community.sessions[0] ?? null;
    const sessionsThisWeek = community.sessions.filter(
      (session) => session.scheduledAt >= now && session.scheduledAt <= weekAhead
    ).length;
    const category = communityCategory(community.settings);
    const language = communityLanguage(community.settings);
    const recentPostCount = postsByCommunity.get(community.id) || 0;

    const trendingScore =
      community._count.members * 1 +
      sessionsThisWeek * 8 +
      recentPostCount * 2;

    return {
      ...community,
      category,
      language,
      nextSessionLabel: formatNextSession(
        nextSession?.scheduledAt ?? null,
        nextSession?.title ?? null
      ),
      sessionsThisWeek,
      trendingScore,
      recentPostCount,
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

  const categories = Array.from(
    new Set([...DEFAULT_CATEGORIES, ...normalized.map((c) => c.category)])
  );
  const languages = Array.from(new Set(normalized.map((c) => c.language))).filter(Boolean);

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Explore Communities</h1>
          <p className="mt-2 text-muted-foreground">
            Discover communities, preview what is next, and join your people.
          </p>
        </div>

        <form className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-6" method="GET">
          <input
            name="q"
            defaultValue={query}
            placeholder="Search communities"
            className="h-11 rounded-lg border border-border bg-card px-4 text-sm lg:col-span-2"
          />

          <select
            name="monetization"
            defaultValue={selectedMonetization}
            className="h-11 rounded-lg border border-border bg-card px-3 text-sm"
          >
            <option value="all">Free + Paid</option>
            <option value="free">Free</option>
            <option value="paid">Paid</option>
          </select>

          <select
            name="language"
            defaultValue={selectedLanguage}
            className="h-11 rounded-lg border border-border bg-card px-3 text-sm"
          >
            <option value="all">All languages</option>
            {languages.map((language) => (
              <option key={language} value={language}>
                {language}
              </option>
            ))}
          </select>

          <select
            name="sessionsWeek"
            defaultValue={selectedSessionsWeek}
            className="h-11 rounded-lg border border-border bg-card px-3 text-sm"
          >
            <option value="all">Any schedule</option>
            <option value="yes">Sessions this week</option>
          </select>

          <select
            name="sort"
            defaultValue={selectedSort}
            className="h-11 rounded-lg border border-border bg-card px-3 text-sm"
          >
            <option value="trending">Trending</option>
            <option value="members">Most members</option>
            <option value="newest">Newest</option>
          </select>

          <input type="hidden" name="category" value={selectedCategory} />
          <Button type="submit" className="h-11 lg:col-span-1">Apply</Button>
        </form>

        <div className="mb-8 flex flex-wrap gap-2">
          <Link
            href={`/${locale}/explore?${new URLSearchParams({
              ...(query ? { q: query } : {}),
              ...(selectedMonetization !== "all" ? { monetization: selectedMonetization } : {}),
              ...(selectedLanguage !== "all" ? { language: selectedLanguage } : {}),
              ...(selectedSessionsWeek !== "all" ? { sessionsWeek: selectedSessionsWeek } : {}),
              ...(selectedSort !== "trending" ? { sort: selectedSort } : {}),
            }).toString()}`}
          >
            <Badge variant={selectedCategory === "all" ? "default" : "secondary"} className="px-3 py-1">
              All Categories
            </Badge>
          </Link>
          {categories.map((category) => {
            const href = `/${locale}/explore?${new URLSearchParams({
              ...(query ? { q: query } : {}),
              category,
              ...(selectedMonetization !== "all" ? { monetization: selectedMonetization } : {}),
              ...(selectedLanguage !== "all" ? { language: selectedLanguage } : {}),
              ...(selectedSessionsWeek !== "all" ? { sessionsWeek: selectedSessionsWeek } : {}),
              ...(selectedSort !== "trending" ? { sort: selectedSort } : {}),
            }).toString()}`;

            return (
              <Link key={category} href={href}>
                <Badge
                  variant={
                    selectedCategory.toLowerCase() === category.toLowerCase()
                      ? "default"
                      : "secondary"
                  }
                  className="px-3 py-1"
                >
                  {category}
                </Badge>
              </Link>
            );
          })}
        </div>

        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {sorted.length} communities
          </p>
          {selectedSort === "trending" && (
            <p className="flex items-center gap-1 text-xs text-amber-600">
              <TrendingUp className="h-4 w-4" />
              Ranked by activity + members + sessions this week
            </p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((community, index) => (
            <Link
              key={community.id}
              href={`/${locale}/community/${community.slug}?src=explore_card&rank=${index + 1}&sort=${selectedSort}`}
              className="rounded-xl border border-border bg-card p-5 transition hover:border-primary/40"
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <h3 className="text-lg font-semibold text-foreground">{community.name}</h3>
                <Badge variant="outline">{community.isPaid ? "Paid" : "Free"}</Badge>
              </div>

              <p className="mb-4 line-clamp-2 text-sm text-muted-foreground">
                {community.description || "No description yet."}
              </p>

              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  <span>{community.category} · {community.language}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span>{community._count.members} members · Host: {hostName(community.owner)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>{community.nextSessionLabel}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {community.sessionsThisWeek} sessions this week · {community.recentPostCount} posts (7d)
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
