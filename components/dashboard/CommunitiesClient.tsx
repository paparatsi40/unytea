"use client";

import { useEffect, useMemo, useState } from "react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  Users,
  Loader2,
  Search,
  Lock,
  Crown,
  Calendar,
  ArrowRight,
  Radio,
  UserPlus,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type Community = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  coverImageUrl: string | null;
  isPrivate: boolean;
  role: string;
  _count: {
    members: number;
    posts: number;
  };
  nextSession?: {
    id: string;
    title: string;
    scheduledAt: string;
    status: string;
  } | null;
};

function formatSessionDate(dateString: string) {
  const date = new Date(dateString);
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === tomorrow.toDateString()) return "Tomorrow";

  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatSessionTime(dateString: string) {
  return new Date(dateString).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function getSessionState(nextSession?: Community["nextSession"]) {
  if (!nextSession) {
    return {
      state: "none" as const,
      label: "No sessions scheduled",
      cta: "Schedule session",
      href: "/dashboard/sessions/create",
      badgeClass: "bg-zinc-100 text-zinc-700",
    };
  }

  if (nextSession.status === "IN_PROGRESS") {
    return {
      state: "live" as const,
      label: "Live now",
      cta: "Start session",
      href: `/dashboard/sessions/${nextSession.id}/room`,
      badgeClass: "bg-red-100 text-red-700",
    };
  }

  const scheduledAt = new Date(nextSession.scheduledAt);
  const now = new Date();

  if (scheduledAt.toDateString() === now.toDateString()) {
    return {
      state: "today" as const,
      label: `Live ${formatSessionTime(nextSession.scheduledAt)}`,
      cta: "Start session",
      href: `/dashboard/sessions/${nextSession.id}`,
      badgeClass: "bg-amber-100 text-amber-700",
    };
  }

  return {
    state: "upcoming" as const,
    label: `${formatSessionDate(nextSession.scheduledAt)} · ${formatSessionTime(nextSession.scheduledAt)}`,
    cta: "View session",
    href: `/dashboard/sessions/${nextSession.id}`,
    badgeClass: "bg-emerald-100 text-emerald-700",
  };
}

export function CommunitiesClient() {
  const { user, isLoading } = useCurrentUser();
  const router = useRouter();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function fetchCommunities() {
      if (isLoading) return;

      if (!user) {
        router.push("/auth/signin");
        return;
      }

      try {
        const response = await fetch("/api/communities");

        if (!response.ok) {
          throw new Error("Failed to fetch communities");
        }

        const data = await response.json();
        const myCommunities = data?.myCommunities || [];
        setCommunities(myCommunities);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load communities");
      } finally {
        setLoading(false);
      }
    }

    fetchCommunities();
  }, [user, isLoading, router]);

  const filteredCommunities = useMemo(() => {
    return communities.filter((community) =>
      community.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [communities, searchQuery]);

  const totalMembers = communities.reduce((sum, c) => sum + c._count.members, 0);
  const totalPosts = communities.reduce((sum, c) => sum + c._count.posts, 0);
  const communitiesWithUpcoming = communities.filter((c) => c.nextSession).length;

  const activationChecklist = [
    {
      label: "Invite 5 members",
      done: totalMembers >= 5,
      href: "/dashboard/communities",
    },
    {
      label: "Schedule first session",
      done: communitiesWithUpcoming > 0,
      href: "/dashboard/sessions/create",
    },
    {
      label: "Create first post",
      done: totalPosts > 0,
      href: "/dashboard/feed",
    },
  ];

  if (isLoading || loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Loading communities...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground">Error loading communities</h2>
          <p className="mt-2 text-muted-foreground">{error}</p>
          <Button onClick={() => window.location.reload()} className="mt-4">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-border bg-card p-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Your communities</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage and grow your community business.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/sessions/create">
            <Button variant="outline">
              <Calendar className="mr-2 h-4 w-4" />
              Schedule session
            </Button>
          </Link>
          <Link href="/dashboard/communities/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create community
            </Button>
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm font-semibold text-amber-900">🚀 Get your community started</p>
        <div className="mt-3 grid gap-2 md:grid-cols-3">
          {activationChecklist.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={`rounded-lg border px-3 py-2 text-sm ${
                item.done
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-amber-200 bg-white text-amber-900"
              }`}
            >
              {item.done ? "☑" : "☐"} {item.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search your communities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm"
          />
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{filteredCommunities.length} communities</span>
          <span>·</span>
          <span>{totalMembers} members</span>
        </div>
      </div>

      {filteredCommunities.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredCommunities.map((community) => {
            const sessionState = getSessionState(community.nextSession);

            return (
              <div key={community.id} className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-lg font-semibold text-foreground">{community.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {community._count.members} members · {community._count.posts} posts
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {community.role === "OWNER" && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                        <Crown className="mr-1 inline h-3 w-3" />
                        Owner
                      </span>
                    )}
                    {community.isPrivate && (
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-700">
                        <Lock className="mr-1 inline h-3 w-3" />
                        Private
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-4 rounded-lg border border-border bg-muted/30 p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Next session</p>
                  {community.nextSession ? (
                    <>
                      <p className="mt-1 line-clamp-1 text-sm font-medium text-foreground">{community.nextSession.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{sessionState.label}</p>
                    </>
                  ) : (
                    <p className="mt-1 text-sm text-muted-foreground">No sessions scheduled</p>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${sessionState.badgeClass}`}>
                    {sessionState.state === "live" ? (
                      <>
                        <Radio className="mr-1 inline h-3 w-3" />
                        Live now
                      </>
                    ) : sessionState.state === "none" ? (
                      "No session"
                    ) : sessionState.state === "today" ? (
                      "Today"
                    ) : (
                      "Upcoming"
                    )}
                  </span>

                  <div className="flex items-center gap-2">
                    <Link href={`/dashboard/c/${community.slug}`}>
                      <Button size="sm" variant="outline">Enter community</Button>
                    </Link>
                    <Link href={sessionState.href}>
                      <Button size="sm">
                        {sessionState.state === "none" ? (
                          <>
                            <Calendar className="mr-1 h-3.5 w-3.5" />
                            {sessionState.cta}
                          </>
                        ) : sessionState.state === "live" || sessionState.state === "today" ? (
                          <>
                            <Radio className="mr-1 h-3.5 w-3.5" />
                            {sessionState.cta}
                          </>
                        ) : (
                          <>
                            {sessionState.cta}
                            <ArrowRight className="ml-1 h-3.5 w-3.5" />
                          </>
                        )}
                      </Button>
                    </Link>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-3 border-t border-border pt-3 text-xs text-muted-foreground">
                  <Link href={`/dashboard/c/${community.slug}/invite`} className="inline-flex items-center hover:text-foreground">
                    <UserPlus className="mr-1 h-3.5 w-3.5" />
                    Invite members
                  </Link>
                  <Link href="/dashboard/feed" className="inline-flex items-center hover:text-foreground">
                    <MessageSquare className="mr-1 h-3.5 w-3.5" />
                    Create post
                  </Link>
                  <span className="inline-flex items-center">
                    <Users className="mr-1 h-3.5 w-3.5" />
                    {community._count.members}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-card p-10 text-center">
          <Users className="h-10 w-10 text-primary" />
          <h2 className="mt-4 text-xl font-bold text-foreground">
            {searchQuery ? "No communities found" : "No communities yet"}
          </h2>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            {searchQuery
              ? "Try another search term."
              : "Create your first community or explore existing communities to get started."}
          </p>
          <div className="mt-5 flex items-center gap-2">
            <Link href="/dashboard/communities/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create community
              </Button>
            </Link>
            <Link href="/dashboard/communities/explore">
              <Button variant="outline">Explore communities</Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
