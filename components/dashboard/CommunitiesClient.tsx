"use client";

import { useEffect, useMemo, useState } from "react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Users, Loader2, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";

type Community = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
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

function formatRelative(dateString?: string | null) {
  if (!dateString) return null;
  const diffMs = Date.now() - new Date(dateString).getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days <= 0) return "today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

function hoursUntil(dateString: string) {
  const diffMs = new Date(dateString).getTime() - Date.now();
  return Math.max(0, Math.round(diffMs / (1000 * 60 * 60)));
}

function getCardState(community: Community): {
  state: CommunityCardState;
  title: string;
  subtitle: string;
  detail?: string;
  nextStep?: string;
  primaryLabel: string;
  primaryHref: string;
  tone: string;
} {
  const weeklySessions = community.weeklySessions || 0;
  const nextSession = community.nextSession;

  if (weeklySessions >= 2) {
    return {
      state: "healthy",
      title: "Weekly rhythm is active",
      subtitle: `${weeklySessions} sessions this week · ${community.avgAttendanceThisWeek || 0} avg attendees`,
      primaryLabel: "View sessions",
      primaryHref: "/dashboard/sessions",
      tone: "border-emerald-200 bg-emerald-50 text-emerald-900",
    };
  }

  if (!nextSession) {
    return {
      state: "empty",
      title: "Start your first session",
      subtitle: "Communities with weekly sessions grow 3x faster",
      nextStep: "Schedule your first live session",
      primaryLabel: "Schedule first session",
      primaryHref: "/dashboard/sessions/create",
      tone: "border-amber-200 bg-amber-50 text-amber-900",
    };
  }

  const sessionDate = new Date(nextSession.scheduledAt);
  const today = new Date();
  const isToday = sessionDate.toDateString() === today.toDateString();

  if (isToday || nextSession.status === "IN_PROGRESS") {
    return {
      state: "today",
      title:
        nextSession.status === "IN_PROGRESS"
          ? "Live now"
          : `Live in ${hoursUntil(nextSession.scheduledAt)} hours`,
      subtitle: `${nextSession.attendeeCount || 0} attending`,
      nextStep: "Show up on time and drive attendance",
      primaryLabel: "Start session",
      primaryHref:
        nextSession.status === "IN_PROGRESS"
          ? `/dashboard/sessions/${nextSession.id}/room`
          : `/dashboard/sessions/${nextSession.id}`,
      tone: "border-emerald-200 bg-emerald-50 text-emerald-900",
    };
  }

  return {
    state: "upcoming",
    title: "Next session scheduled",
    subtitle: formatSessionDayTime(nextSession.scheduledAt),
    detail: `${nextSession.attendeeCount || 0} attending`,
    nextStep: "Push reminders to increase attendance",
    primaryLabel: "View session",
    primaryHref: `/dashboard/sessions/${nextSession.id}`,
    tone: "border-sky-200 bg-sky-50 text-sky-900",
  };
}

function getPriority(cardState: CommunityCardState) {
  if (cardState === "empty") {
    return {
      label: "Needs attention",
      level: "High",
      tone: "bg-rose-100 text-rose-800",
    };
  }

  if (cardState === "healthy") {
    return {
      label: "Healthy",
      level: "Low",
      tone: "bg-emerald-100 text-emerald-800",
    };
  }

  return {
    label: "Growing",
    level: "Medium",
    tone: "bg-amber-100 text-amber-800",
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
        if (!response.ok) throw new Error("Failed to fetch communities");
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

  const hasUpcoming = communities.some((c) => c.nextSession);

  const nextBestAction = useMemo(() => {
    if (!hasUpcoming) {
      return {
        title: "Schedule your first session",
        subtitle: "Unlock engagement, recaps, and growth loops",
        cta: "Schedule session",
        href: "/dashboard/sessions/create",
      };
    }

    if (momentum.attendees === 0) {
      return {
        title: "Boost attendance before your next session",
        subtitle: "Post one question in your community to warm up members",
        cta: "Create post",
        href: "/dashboard/feed",
      };
    }

    if (momentum.members < 5) {
      return {
        title: "Invite 5 members this week",
        subtitle: "More members now means stronger session momentum later",
        cta: "Invite members",
        href: "/dashboard/communities",
      };
    }

    return {
      title: "Keep your weekly habit alive",
      subtitle: "Run at least one session this week to keep growth compounding",
      cta: "View sessions",
      href: "/dashboard/sessions",
    };
  }, [hasUpcoming, momentum.attendees, momentum.members]);

  const milestones = [
    { label: "First community created", done: communities.length > 0 },
    {
      label: "First session hosted",
      done: communities.some((c) => (c.weeklySessions || 0) > 0 || Boolean(c.lastSessionAt)),
    },
    { label: "10 attendees reached", done: momentum.attendees >= 10 },
    {
      label: "Weekly habit built",
      done: communities.some((c) => (c.weeklySessions || 0) >= 2),
    },
  ];

  const primaryCommunity = communities[0] || null;
  const primaryCard = primaryCommunity ? getCardState(primaryCommunity) : null;
  const primaryPriority = primaryCard ? getPriority(primaryCard.state) : null;
  const primaryLastPost = formatRelative(primaryCommunity?.lastPostAt);

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
    <div className="space-y-5">
      {primaryCommunity && primaryCard && primaryPriority && (
        <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
          <div className="h-14 bg-gradient-to-r from-violet-600 via-fuchsia-600 to-orange-500" />
          <div className="space-y-4 p-6 pt-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-2xl font-bold text-foreground">{primaryCommunity.name}</p>
                <p className="text-sm text-muted-foreground">
                  {primaryCommunity._count.members} members · {primaryCommunity._count.posts} posts
                </p>
              </div>
              <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${primaryPriority.tone}`}>
                Priority: {primaryPriority.level} · {primaryPriority.label}
              </span>
            </div>

            <div className={`rounded-xl border p-4 ${primaryCard.tone}`}>
              <p className="text-lg font-semibold">⚡ {primaryCard.title}</p>
              <p className="mt-1 text-sm">{primaryCard.subtitle}</p>
              {primaryCard.detail && <p className="mt-1 text-sm">{primaryCard.detail}</p>}
            </div>

            <div className="flex flex-wrap gap-2">
              <Link href={primaryCard.primaryHref}>
                <Button>{primaryCard.primaryLabel}</Button>
              </Link>
              <Link href={`/dashboard/c/${primaryCommunity.slug}`}>
                <Button variant="outline">Enter community</Button>
              </Link>
            </div>

            <div className="rounded-xl border border-border/80 bg-muted/20 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Milestones</p>
              <div className="mt-2 grid gap-1 text-sm">
                {milestones.map((item) => (
                  <p key={item.label} className={item.done ? "text-emerald-700" : "text-foreground"}>
                    {item.done ? "✔" : "⬜"} {item.label}
                  </p>
                ))}
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Last activity: {primaryLastPost ? `post ${primaryLastPost}` : "no posts yet"}
            </p>
          </div>
        </div>
      )}

      <div className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-5">
        <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-amber-900">
          <Flame className="h-4 w-4" />
          Next best action
        </p>
        <p className="mt-2 text-xl font-bold text-amber-950">{nextBestAction.title}</p>
        <p className="mt-1 text-sm text-amber-900">{nextBestAction.subtitle}</p>
        <Link href={nextBestAction.href} className="mt-4 inline-flex">
          <Button className="bg-amber-500 text-zinc-900 hover:bg-amber-400">{nextBestAction.cta}</Button>
        </Link>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">This week</p>
        <div className="mt-2 space-y-1 text-sm text-foreground">
          <p>
            {momentum.attendees === 0
              ? "⚠ Attendance is low (0%) → Ask a question post before your session"
              : `✅ ${momentum.attendees} attendees this week`}
          </p>
          <p>📅 {momentum.sessions} session{momentum.sessions !== 1 ? "s" : ""} scheduled</p>
          <p>👥 {momentum.members} members</p>
          <p>💬 {momentum.posts} posts</p>
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-semibold text-foreground">Your communities</p>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {communities.map((community) => {
            const card = getCardState(community);
            const priority = getPriority(card.state);
            return (
              <div key={community.id} className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-start justify-between gap-2">
                  <p className="truncate text-lg font-semibold text-foreground">{community.name}</p>
                  <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${priority.tone}`}>
                    {priority.label}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {community._count.members} members · {community._count.posts} posts
                </p>
                <div className={`mt-3 rounded-lg border p-3 ${card.tone}`}>
                  <p className="text-sm font-semibold">{card.title}</p>
                  <p className="mt-1 text-sm">{card.subtitle}</p>
                </div>
                <div className="mt-3 flex gap-2">
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
      </div>
    </div>
  );
}
