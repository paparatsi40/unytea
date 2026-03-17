"use client";

import { useEffect, useMemo, useState } from "react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Users, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type Community = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  coverImageUrl?: string | null;
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
    attendeeCount: number;
  } | null;
  weeklySessions?: number;
  postsThisWeek?: number;
  avgAttendanceThisWeek?: number;
  attendeesThisWeek?: number;
  lastPostAt?: string | null;
  lastSessionAt?: string | null;
};

type CommunityCardState = "empty" | "upcoming" | "today" | "healthy";

function formatSessionDayTime(dateString: string) {
  const date = new Date(dateString);
  const day = date.toLocaleDateString("en-US", { weekday: "long" });
  const time = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  return `${day} · ${time}`;
}

function daysUntil(dateString: string) {
  const diffMs = new Date(dateString).getTime() - Date.now();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

function getCardState(community: Community): {
  state: CommunityCardState;
  eyebrow: string;
  title: string;
  primaryLabel: string;
  primaryHref: string;
  tone: string;
} {
  const weeklySessions = community.weeklySessions || 0;
  const nextSession = community.nextSession;

  if (weeklySessions >= 2) {
    return {
      state: "healthy",
      eyebrow: "Healthy",
      title: `${weeklySessions} sessions · ${community.avgAttendanceThisWeek || 0} avg attendees`,
      primaryLabel: "View sessions",
      primaryHref: "/dashboard/sessions",
      tone: "text-emerald-700",
    };
  }

  if (!nextSession) {
    return {
      state: "empty",
      eyebrow: "Needs attention",
      title: "No upcoming session",
      primaryLabel: "Schedule",
      primaryHref: "/dashboard/sessions/create",
      tone: "text-amber-700",
    };
  }

  const sessionDate = new Date(nextSession.scheduledAt);
  const today = new Date();
  const isToday = sessionDate.toDateString() === today.toDateString();

  if (isToday || nextSession.status === "IN_PROGRESS") {
    return {
      state: "today",
      eyebrow: "Next session",
      title: `${formatSessionDayTime(nextSession.scheduledAt)} · ${nextSession.attendeeCount || 0} attending`,
      primaryLabel: nextSession.status === "IN_PROGRESS" ? "Start" : "View",
      primaryHref:
        nextSession.status === "IN_PROGRESS"
          ? `/dashboard/sessions/${nextSession.id}/room`
          : `/dashboard/sessions/${nextSession.id}`,
      tone: "text-sky-700",
    };
  }

  return {
    state: "upcoming",
    eyebrow: "Next session",
    title: `${formatSessionDayTime(nextSession.scheduledAt)} · ${nextSession.attendeeCount || 0} attending`,
    primaryLabel: "View",
    primaryHref: `/dashboard/sessions/${nextSession.id}`,
    tone: "text-sky-700",
  };
}

export function CommunitiesClient() {
  const { user, isLoading } = useCurrentUser();
  const router = useRouter();

  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        setCommunities(data?.myCommunities || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load communities");
      } finally {
        setLoading(false);
      }
    }

    fetchCommunities();
  }, [user, isLoading, router]);

  const momentum = useMemo(() => {
    const sessions = communities.reduce((sum, c) => sum + (c.weeklySessions || 0), 0);
    const attendees = communities.reduce((sum, c) => sum + (c.attendeesThisWeek || 0), 0);
    const members = communities.reduce((sum, c) => sum + c._count.members, 0);
    const posts = communities.reduce((sum, c) => sum + (c.postsThisWeek || 0), 0);

    return { sessions, attendees, members, posts };
  }, [communities]);

  const milestones = useMemo(
    () => [
      { label: "Community created", done: communities.length > 0 },
      {
        label: "First session",
        done: communities.some((c) => (c.weeklySessions || 0) > 0 || Boolean(c.lastSessionAt)),
      },
      { label: "10 attendees", done: momentum.attendees >= 10 },
      {
        label: "Weekly habit",
        done: communities.some((c) => (c.weeklySessions || 0) >= 2),
      },
    ],
    [communities, momentum.attendees]
  );

  const primaryCommunity = communities[0] || null;

  const hero = useMemo(() => {
    if (!primaryCommunity) return null;

    if (!primaryCommunity.nextSession) {
      return {
        title: "⚡ Start your first session",
        subtitle: "Communities with weekly sessions grow 3x faster",
        primaryLabel: "Schedule first session",
        primaryHref: "/dashboard/sessions/create",
      };
    }

    const d = daysUntil(primaryCommunity.nextSession.scheduledAt);

    if (d === 0) {
      return {
        title: "🔥 Next session today",
        subtitle: `${formatSessionDayTime(primaryCommunity.nextSession.scheduledAt)} · ${primaryCommunity.nextSession.attendeeCount || 0} attending`,
        primaryLabel:
          primaryCommunity.nextSession.status === "IN_PROGRESS" ? "Start session" : "View session",
        primaryHref:
          primaryCommunity.nextSession.status === "IN_PROGRESS"
            ? `/dashboard/sessions/${primaryCommunity.nextSession.id}/room`
            : `/dashboard/sessions/${primaryCommunity.nextSession.id}`,
      };
    }

    if (d === 1) {
      return {
        title: "🔥 Next session in 1 day",
        subtitle: `${formatSessionDayTime(primaryCommunity.nextSession.scheduledAt)} · ${primaryCommunity.nextSession.attendeeCount || 0} attending`,
        primaryLabel: "View session",
        primaryHref: `/dashboard/sessions/${primaryCommunity.nextSession.id}`,
      };
    }

    return {
      title: `🔥 Next session in ${d} days`,
      subtitle: `${formatSessionDayTime(primaryCommunity.nextSession.scheduledAt)} · ${primaryCommunity.nextSession.attendeeCount || 0} attending`,
      primaryLabel: "View session",
      primaryHref: `/dashboard/sessions/${primaryCommunity.nextSession.id}`,
    };
  }, [primaryCommunity]);

  const showNextBestAction = useMemo(() => {
    if (!primaryCommunity?.nextSession) return false;
    if (momentum.attendees === 0) return true;
    return false;
  }, [primaryCommunity, momentum.attendees]);

  const nextBestAction = useMemo(() => {
    if (momentum.attendees === 0) {
      return {
        title: "Improve attendance",
        subtitle: "Ask a question before your next session and send reminders.",
        cta: "Create question post",
        href: "/dashboard/feed",
      };
    }

    return null;
  }, [momentum.attendees]);

  const quickActions = [
    { label: "Invite members", href: "/dashboard/communities" },
    { label: "Create post", href: "/dashboard/feed" },
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

  if (!communities.length) {
    return (
      <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-card p-10 text-center">
        <Users className="h-10 w-10 text-primary" />
        <h2 className="mt-4 text-xl font-bold text-foreground">No communities yet</h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          Create your first community to start your community engine.
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
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {primaryCommunity && hero && (
        <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
          <div className="space-y-4">
            <div>
              <p className="text-2xl font-bold text-foreground">{primaryCommunity.name}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {primaryCommunity._count.members} members · {primaryCommunity._count.posts} posts
              </p>
            </div>

            <div>
              <p className="text-xl font-semibold text-foreground">{hero.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{hero.subtitle}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link href={hero.primaryHref}>
                <Button>{hero.primaryLabel}</Button>
              </Link>
              <Link href={`/dashboard/c/${primaryCommunity.slug}`}>
                <Button variant="outline">Enter community</Button>
              </Link>
            </div>
          </div>
        </section>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Your progress
          </p>
          <div className="mt-3 space-y-2 text-sm">
            {milestones.map((item) => (
              <p
                key={item.label}
                className={item.done ? "font-medium text-emerald-700" : "text-foreground"}
              >
                {item.done ? "✓" : "○"} {item.label}
              </p>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            This week
          </p>

          <div className="mt-3 space-y-2 text-sm text-foreground">
            {momentum.sessions === 0 ? (
              <>
                <p>No session scheduled yet</p>
                <p className="text-muted-foreground">
                  → Schedule your first session to activate engagement
                </p>
              </>
            ) : momentum.attendees === 0 ? (
              <>
                <p>⚠ Attendance is low</p>
                <p className="text-muted-foreground">
                  → Ask a question before your next session
                </p>
              </>
            ) : (
              <p>🔥 Good momentum</p>
            )}

            <div className="pt-1 space-y-1">
              <p>📅 {momentum.sessions} session{momentum.sessions !== 1 ? "s" : ""} scheduled</p>
              <p>👥 {momentum.members} members</p>
              <p>💬 {momentum.posts} posts</p>
            </div>
          </div>
        </section>
      </div>

      {showNextBestAction && nextBestAction && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-900">
            Next best action
          </p>
          <p className="mt-2 text-xl font-semibold text-amber-950">{nextBestAction.title}</p>
          <p className="mt-1 text-sm text-amber-900">{nextBestAction.subtitle}</p>
          <Link href={nextBestAction.href} className="mt-4 inline-flex">
            <Button className="bg-amber-500 text-zinc-900 hover:bg-amber-400">
              {nextBestAction.cta}
            </Button>
          </Link>
        </section>
      )}

      <section className="space-y-3">
        <p className="text-sm font-semibold text-foreground">Your communities</p>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {communities.map((community) => {
            const card = getCardState(community);

            return (
              <div key={community.id} className="rounded-2xl border border-border bg-card p-5">
                <p className="truncate text-lg font-semibold text-foreground">{community.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {community._count.members} members · {community._count.posts} posts
                </p>

                <div className="mt-4 space-y-1">
                  <p className={`text-xs font-semibold uppercase tracking-wide ${card.tone}`}>
                    {card.eyebrow}
                  </p>
                  <p className="text-sm text-foreground">{card.title}</p>
                </div>

                <div className="mt-4 flex gap-2">
                  <Link href={card.primaryHref} className="flex-1">
                    <Button className="w-full" size="sm">
                      {card.primaryLabel}
                    </Button>
                  </Link>
                  <Link href={`/dashboard/c/${community.slug}`}>
                    <Button size="sm" variant="outline">
                      Enter
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Quick actions
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          {quickActions.map((action) => (
            <Link key={action.label} href={action.href}>
              <Button variant="outline">{action.label}</Button>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}