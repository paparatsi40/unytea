import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Users, Calendar, Sparkles } from "lucide-react";
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

export default async function ExploreCommunitiesPage({
  params,
  searchParams,
}: {
  params: { locale: string };
  searchParams?: { q?: string; category?: string };
}) {
  const query = searchParams?.q?.trim() || "";
  const selectedCategory = searchParams?.category?.trim() || "all";
  const locale = params.locale || "en";

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
    },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      settings: true,
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
          title: true,
          scheduledAt: true,
        },
      },
    },
    orderBy: [{ memberCount: "desc" }, { createdAt: "desc" }],
    take: 36,
  });

  const normalized = communities.map((community) => {
    const nextSession = community.sessions[0] ?? null;
    return {
      ...community,
      category: communityCategory(community.settings),
      nextSessionLabel: formatNextSession(
        nextSession?.scheduledAt ?? null,
        nextSession?.title ?? null
      ),
    };
  });

  const filtered =
    selectedCategory === "all"
      ? normalized
      : normalized.filter(
          (community) =>
            community.category.toLowerCase() === selectedCategory.toLowerCase()
        );

  const categories = Array.from(
    new Set([...DEFAULT_CATEGORIES, ...normalized.map((c) => c.category)])
  );

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Explore Communities</h1>
          <p className="mt-2 text-muted-foreground">
            Discover communities, preview what is next, and join your people.
          </p>
        </div>

        <form className="mb-6 grid gap-3 sm:grid-cols-[1fr_auto]" method="GET">
          <input
            name="q"
            defaultValue={query}
            placeholder="Search communities"
            className="h-11 rounded-lg border border-border bg-card px-4 text-sm"
          />
          <Button type="submit" className="h-11">Search</Button>
        </form>

        <div className="mb-8 flex flex-wrap gap-2">
          <Link href={`/${locale}/explore${query ? `?q=${encodeURIComponent(query)}` : ""}`}>
<Badge variant={selectedCategory === "all" ? "default" : "secondary"} className="px-3 py-1">
              All
            </Badge>
          </Link>
          {categories.map((category) => {
            const href = `/${locale}/explore?${new URLSearchParams({
              ...(query ? { q: query } : {}),
              category,
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

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((community) => (
            <Link
              key={community.id}
              href={`/${locale}/community/${community.slug}`}
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
                  <span>{community.category}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span>{community._count.members} members · Host: {hostName(community.owner)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>{community.nextSessionLabel}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
