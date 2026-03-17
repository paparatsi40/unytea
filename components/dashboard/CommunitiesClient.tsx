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
type CommunityPriorityReason =
  | "in_progress"
  | "today"
  | "no_upcoming"
  | "low_attendance"
  | "build_habit"
  | "healthy";

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

function getCommunityPriority(community: Community): {
  score: number;
  reason: CommunityPriorityReason;
} {
  const nextSession = community.nextSession;
  const weeklySessions = community.weeklySessions || 0;
  const attendeesThisWeek = community.attendeesThisWeek || 0;
  const postsThisWeek = community.postsThisWeek || 0;
  const members = community._count.members || 0;
  const hasRunASession =
    Boolean(community.lastSessionAt) || weeklySessions > 0;

  let score = 0;
  let reason: CommunityPriorityReason = "healthy";

  if (nextSession) {
    const now = new Date();
    const sessionDate = new Date(nextSession.scheduledAt);
    const isToday = sessionDate.toDateString() === now.toDateString();
    const daysAway = Math.max(
      0,
      Math.ceil((sessionDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    );

    if (nextSession.status === "IN_PROGRESS") {
      score += 100;
      reason = "in_progress";
    } else if (isToday) {
      score += 95;
      reason = "today";
    } else if (daysAway <= 3 && (nextSession.attendeeCount || 0) === 0) {
      score += 80;
      reason = "low_attendance";
    } else if (daysAway <= 3 && (nextSession.attendeeCount || 0) < 3) {
      score += 70;
      reason = "low_attendance";
    } else if (weeklySessions < 2) {
      score += 55;
      reason = "build_habit";
    } else {
      score += 30;
      reason = "healthy";
    }

    if (daysAway === 1) score += 6;
    if ((nextSession.attendeeCount || 0) === 0) score += 10;
  } else {
    score += 90;
    reason = "no_upcoming";

    if (!hasRunASession) score += 5;
    if (members >= 20) score += 8;
    if (members >= 50) score += 12;
    if (postsThisWeek >= 3) score += 6;
    if (members <= 3 && postsThisWeek === 0) score -= 5;
  }

  if (weeklySessions >= 2 && attendeesThisWeek >= 10) {
    score -= 15;
  }

  return { score, reason };
}

function getCommunityState(community: Community): {
  state: CommunityCardState;
  eyebrow: string;
  detail: string;
  primaryLabel: string;
  primaryHref: string;
  tone: string;
} {
  const weeklySessions = community.weeklySessions || 0;
  const nextSession = community.nextSession;

  if (!nextSession) {
    return {
      state: "empty",
      eyebrow: "Needs attention",
      detail: "No upcoming session",
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
      eyebrow: "Happening now",
      detail: `${formatSessionDayTime(nextSession.scheduledAt)} · ${nextSession.attendeeCount || 0} attending`,
      primaryLabel: nextSession.status === "IN_PROGRESS" ? "Start" : "View",
      primaryHref:
        nextSession.status === "IN_PROGRESS"
          ? `/dashboard/sessions/${nextSession.id}/room`
          : `/dashboard/sessions/${nextSession.id}`,
      tone: "text-sky-700",
    };
  }

  if ((nextSession.attendeeCount || 0) === 0) {
    return {
      state: "upcoming",
      eyebrow: "Needs attention",
      detail: `Next session · ${formatSessionDayTime(nextSession.scheduledAt)} · 0 attending`,
      primaryLabel: "View",
      primaryHref: `/dashboard/sessions/${nextSession.id}`,
      tone: "text-amber-700",
    };
  }

  if (weeklySessions >= 2) {
    return {
      state: "healthy",
      eyebrow: "Healthy",
      detail: `${weeklySessions} sessions · ${community.avgAttendanceThisWeek || 0} avg attendees`,
      primaryLabel: "View sessions",
      primaryHref: "/dashboard/sessions",
      tone: "text-emerald-700",
    };
  }

  return {
    state: "upcoming",
    eyebrow: "Growing",
    detail: `Next session · ${formatSessionDayTime(nextSession.scheduledAt)} · ${nextSession.attendeeCount || 0} attending`,
    primaryLabel: "View",
    primaryHref: `/dashboard/sessions/${nextSession.id}`,
    tone: "text-sky-700",
  };
}

function getHeroContent(community: Community) {
  const nextSession = community.nextSession;
  const hasRunASession =
    Boolean(community.lastSessionAt) || (community.weeklySessions || 0) > 0;
  const priority = getCommunityPriority(community);

  if (priority.reason === "in_progress" && nextSession) {
    return {
      title: "🔥 Session in progress",
      subtitle: `${nextSession.title} · ${nextSession.attendeeCount || 0} attending`,
      primaryLabel: "Start session",
      primaryHref: `/dashboard/sessions/${nextSession.id}/room`,
    };
  }

  if (priority.reason === "today" && nextSession) {
    return {
      title: "🔥 Next session today",
      subtitle: `${formatSessionDayTime(nextSession.scheduledAt)} · ${nextSession.attendeeCount || 0} attending`,
      primaryLabel: "View session",
      primaryHref: `/dashboard/sessions/${nextSession.id}`,
    };
  }

  if (priority.reason === "no_upcoming") {
    if (!hasRunASession) {
      return {
        title: "⚡ Start your first session",
        subtitle: "Communities with weekly sessions grow 3x faster",
        primaryLabel: "Schedule first session",
        primaryHref: "/dashboard/sessions/create",
      };
    }

    return {
      title: "⚡ Schedule your next session",
      subtitle: "Communities grow faster with a consistent weekly rhythm",
      primaryLabel: "Schedule next session",
      primaryHref: "/dashboard/sessions/create",
    };
  }

  if (priority.reason === "low_attendance" && nextSession) {
    return {
      title: "⚡ Boost your next session",
      subtitle: `Low attendance so far · ${formatSessionDayTime(nextSession.scheduledAt)}`,
      primaryLabel: "View session",
      primaryHref: `/dashboard/sessions/${nextSession.id}`,
    };
  }

  if (nextSession) {
    const d = daysUntil(nextSession.scheduledAt);

    if (d === 1) {
      return {
        title: "🔥 Next session in 1 day",
        subtitle: `${formatSessionDayTime(nextSession.scheduledAt)} · ${nextSession.attendeeCount || 0} attending`,
        primaryLabel: "View session",
        primaryHref: `/dashboard/sessions/${nextSession.id}`,
      };
    }

    return {
      title: `🔥 Next session in ${d} days`,
      subtitle: `${formatSessionDayTime(nextSession.scheduledAt)} · ${nextSession.attendeeCount || 0} attending`,
      primaryLabel: "View session",
      primaryHref: `/dashboard/sessions/${nextSession.id}`,
    };
  }

  return {
    title: "⚡ Schedule your next session",
    subtitle: "Communities grow faster with a consistent weekly rhythm",
    primaryLabel: "Schedule next session",
    primaryHref: "/dashboard/sessions/create",
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

  const sortedCommunities = useMemo(() => {
    return [...communities].sort((a, b) => {
      const aPriority = getCommunityPriority(a);
      const bPriority = getCommunityPriority(b);

      if (bPriority.score !== aPriority.score) {
        return bPriority.score - aPriority.score;
      }

      return a.name.localeCompare(b.name);
    });
  }, [communities]);

  const primaryCommunity = sortedCommunities[0] || null;
  const hero = primaryCommunity ? getHeroContent(primaryCommunity) : null;

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

  const thisWeekSummary = useMemo(() => {
    if (!primaryCommunity) {
      return {
        title: "No communities yet",
        hint: "Create your first community to get started",
      };
    }

    const priority = getCommunityPriority(primaryCommunity);

    if (priority.reason === "no_upcoming") {
      return {
        title: "No upcoming session",
        hint: "Keep momentum going with your next session",
      };
    }

    if (priority.reason === "in_progress" || priority.reason === "today") {
      return {
        title: "Session happening today",
        hint: "Keep momentum high and drive attendance",
      };
    }

    if (priority.reason === "low_attendance") {
      return {
        title: "Attendance needs a push",
        hint: "Ask a question before your next session",
      };
    }

    if (priority.reason === "build_habit") {
      return {
        title: "Build your weekly rhythm",
        hint: "Consistency helps communities grow faster",
      };
    }

    return {
      title: "Good momentum",
      hint: "Keep your weekly rhythm going",
    };
  }, [primaryCommunity]);

  const quickActions = [
    { label: "Invite members", href: "/dashboard/communities" },
    { label: "Create post", href: "/dashboard/feed" },
  ];

  if (isLoading || loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
          <p className="mt-4 text-sm text-muted-foreground">Loading communities...</p>
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
      <div className="rounded-3xl border border-dashed border-border bg-card/70 p-10 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
          <Users className="h-6 w-6 text-primary" />
        </div>
        <h2 className="mt-4 text-xl font-semibold text-foreground">No communities yet</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
          Create your first community to start your community engine.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
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
    <div className="mx-auto max-w-6xl space-y-5">
      {primaryCommunity && hero && (
        <section className="rounded-[28px] border border-border/70 bg-card shadow-sm">
          <div className="rounded-[28px] bg-gradient-to-br from-background via-background to-muted/20 p-5 md:p-6">
            <div className="max-w-3xl space-y-4">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                    {primaryCommunity.name}
                  </h1>
                  <span className="rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                    In focus
                  </span>
                </div>

                <p className="text-sm text-muted-foreground">
                  {primaryCommunity._count.members} members · {primaryCommunity._count.posts} posts
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-2xl font-semibold tracking-tight text-foreground">
                  {hero.title}
                </p>
                <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                  {hero.subtitle}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link href={hero.primaryHref}>
                  <Button className="h-11 px-5 text-sm font-medium">{hero.primaryLabel}</Button>
                </Link>
                <Link href={`/dashboard/c/${primaryCommunity.slug}`}>
                  <Button variant="outline" className="h-11 px-5 text-sm font-medium">
                    Enter community
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      <div className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
        <section className="rounded-3xl border border-border/70 bg-card p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Your progress
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {milestones.map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-3 rounded-2xl border border-border/60 bg-background/60 px-4 py-3"
              >
                <div
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                    item.done
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {item.done ? "✓" : "○"}
                </div>
                <span
                  className={`text-sm ${
                    item.done ? "font-medium text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-border/70 bg-card p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            This week
          </p>

          <div className="mt-5 space-y-4">
            <div className="space-y-1.5">
              <p className="text-lg font-semibold tracking-tight text-foreground">
                {thisWeekSummary.title}
              </p>
              <p className="text-sm leading-6 text-muted-foreground">{thisWeekSummary.hint}</p>
            </div>

            <div className="space-y-2 rounded-2xl border border-border/60 bg-background/60 p-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Sessions</span>
                <span className="font-medium text-foreground">
                  {momentum.sessions} scheduled
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Members</span>
                <span className="font-medium text-foreground">{momentum.members}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Posts</span>
                <span className="font-medium text-foreground">{momentum.posts}</span>
              </div>
            </div>
          </div>
        </section>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">Your communities</p>
          {sortedCommunities.length > 1 && (
            <p className="text-xs text-muted-foreground">Ordered by priority</p>
          )}
        </div>

        <div className="space-y-3">
          {sortedCommunities.map((community) => {
            const state = getCommunityState(community);

            return (
              <div
                key={community.id}
                className="rounded-3xl border border-border/70 bg-card px-5 py-3.5 shadow-sm transition-colors hover:bg-muted/20"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-base font-semibold text-foreground">
                        {community.name}
                      </p>
                    </div>

                    <p className="mt-1 text-sm text-muted-foreground">
                      {community._count.members} members · {community._count.posts} posts
                    </p>

                    <div className="mt-2.5 flex flex-wrap items-center gap-2 text-sm">
                      <span className={`font-medium ${state.tone}`}>{state.eyebrow}</span>
                      <span className="text-muted-foreground">·</span>
                      <span className="text-foreground">{state.detail}</span>
                    </div>
                  </div>

                  <div className="flex shrink-0 gap-2">
                    <Link href={state.primaryHref}>
                      <Button size="sm" variant="outline" className="h-9 px-4">
                        {state.primaryLabel}
                      </Button>
                    </Link>

                    <Link href={`/dashboard/c/${community.slug}`}>
                      <Button size="sm" variant="outline" className="h-9 px-4">
                        Enter
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-3xl border border-border/70 bg-card px-5 py-4 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Quick actions
        </p>

        <div className="mt-4 flex flex-wrap gap-3">
          {quickActions.map((action) => (
            <Link key={action.label} href={action.href}>
              <Button variant="outline" className="h-10 px-4">
                {action.label}
              </Button>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}