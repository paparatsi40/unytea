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
  imageUrl?: string | null;
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
  const day = date.toLocaleDateString("en-US", { weekday: "short" });
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
  primaryLabel: string;
  primaryHref: string;
  tone: string;
  shortStatus: string;
} {
  const weeklySessions = community.weeklySessions || 0;
  const nextSession = community.nextSession;

  if (weeklySessions >= 2) {
    return {
      state: "healthy",
      title: "Keep weekly rhythm",
      subtitle: `${weeklySessions} sessions this week`,
      primaryLabel: "View sessions",
      primaryHref: "/dashboard/sessions",
      tone: "border-emerald-200 bg-emerald-50 text-emerald-900",
      shortStatus: "🟢 Healthy",
    };
  }

  if (!nextSession) {
    return {
      state: "empty",
      title: "Start your first session",
      subtitle: "Communities with weekly sessions grow 3x faster",
      primaryLabel: "Start session",
      primaryHref: "/dashboard/sessions/create",
      tone: "border-amber-200 bg-amber-50 text-amber-900",
      shortStatus: "⚠️ No upcoming session",
    };
  }

  const sessionDate = new Date(nextSession.scheduledAt);
  const today = new Date();
  const isToday = sessionDate.toDateString() === today.toDateString();

  if (isToday || nextSession.status === "IN_PROGRESS") {
    return {
      state: "today",
      title: nextSession.status === "IN_PROGRESS" ? "Go live now" : `Live in ${hoursUntil(nextSession.scheduledAt)}h`,
      subtitle: `${nextSession.attendeeCount || 0} attending`,
      primaryLabel: "Start session",
      primaryHref:
        nextSession.status === "IN_PROGRESS"
          ? `/dashboard/sessions/${nextSession.id}/room`
          : `/dashboard/sessions/${nextSession.id}`,
      tone: "border-emerald-200 bg-emerald-50 text-emerald-900",
      shortStatus: "🟡 Session today",
    };
  }

  return {
    state: "upcoming",
    title: "Next session is scheduled",
    subtitle: formatSessionDayTime(nextSession.scheduledAt),
    primaryLabel: "View session",
    primaryHref: `/dashboard/sessions/${nextSession.id}`,
    tone: "border-sky-200 bg-sky-50 text-sky-900",
    shortStatus: "🟡 Growing",
  };
}

function getPriority(cardState: CommunityCardState) {
  if (cardState === "empty") {
    return {
      label: "Needs attention",
      level: "High",
      tone: "bg-rose-100 text-rose-800",
      rank: 0,
      short: "🔥 Needs attention",
    };
  }

  if (cardState === "healthy") {
    return {
      label: "Healthy",
      level: "Low",
      tone: "bg-emerald-100 text-emerald-800",
      rank: 2,
      short: "🟢 Healthy",
    };
  }

  return {
    label: "Growing",
    level: "Medium",
    tone: "bg-amber-100 text-amber-800",
    rank: 1,
    short: "🟡 Growing",
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

  const prioritizedCommunities = useMemo(() => {
    return communities
      .map((community) => {
        const card = getCardState(community);
        const priority = getPriority(card.state);
        return { community, card, priority };
      })
      .sort((a, b) => {
        if (a.priority.rank !== b.priority.rank) {
          return a.priority.rank - b.priority.rank;
        }
        return b.community._count.members - a.community._count.members;
      });
  }, [communities]);

  const primaryEntry = prioritizedCommunities[0] || null;
  const primaryCommunity = primaryEntry?.community || null;
  const primaryCard = primaryEntry?.card || null;
  const primaryPriority = primaryEntry?.priority || null;
  const primaryLastPost = formatRelative(primaryCommunity?.lastPostAt);

  const heroBackgroundStyle = primaryCommunity?.coverImageUrl
    ? {
        backgroundImage: `linear-gradient(135deg, rgba(17, 24, 39, 0.72), rgba(88, 28, 135, 0.65)), url(${primaryCommunity.coverImageUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : {
        backgroundImage:
          "linear-gradient(130deg, rgb(88, 28, 135) 0%, rgb(168, 85, 247) 45%, rgb(249, 115, 22) 100%)",
      };

  const milestones = [
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
    <div className="space-y-5">
      {primaryCommunity && primaryCard && primaryPriority && (
        <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-md">
          <div className="relative min-h-[320px] border-b border-white/20" style={heroBackgroundStyle}>
            <div className="absolute inset-0 bg-black/15 backdrop-blur-[1px]" />
            <div className="absolute inset-0 shadow-[inset_0_-120px_120px_-60px_rgba(0,0,0,0.55)]" />
            <div className="relative z-10 flex min-h-[320px] flex-col justify-end gap-4 px-6 pb-8 pt-24 text-white">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-3xl font-bold tracking-tight">{primaryCommunity.name}</p>
                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${primaryPriority.tone}`}>
                  Priority: {primaryPriority.level} · {primaryPriority.label}
                </span>
              </div>

              <div>
                <p className="text-2xl font-semibold">⚡ {primaryCard.title}</p>
                <p className="mt-1 max-w-xl text-sm text-white/90">{primaryCard.subtitle}</p>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <Link href={primaryCard.primaryHref}>
                  <Button size="lg" className="h-11 bg-white text-zinc-900 hover:bg-zinc-100">
                    {primaryCard.primaryLabel}
                  </Button>
                </Link>
                <Link href={`/dashboard/c/${primaryCommunity.slug}`}>
                  <Button size="lg" variant="outline" className="h-11 border-white/60 bg-white/10 text-white hover:bg-white/20">
                    Enter community
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          <div className="space-y-3 p-5">
            <div className="rounded-xl border border-border/80 bg-muted/20 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Your progress</p>
              <div className="mt-2 grid grid-cols-2 gap-1 text-sm">
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

      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">This week</p>
        <div className="mt-2 space-y-1 text-sm text-foreground">
          {momentum.attendees === 0 ? (
            <>
              <p>⚠️ Attendance is low (0%)</p>
              <p>👉 Fix: Ask a question post before your session</p>
            </>
          ) : (
            <p>✅ {momentum.attendees} attendees this week</p>
          )}
          <p>📅 {momentum.sessions} session{momentum.sessions !== 1 ? "s" : ""} scheduled</p>
          <p>👥 {momentum.members} members</p>
          <p>💬 {momentum.posts} posts</p>
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-semibold text-foreground">Your communities</p>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {prioritizedCommunities.map(({ community, card, priority }) => (
            <div key={community.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="truncate text-base font-semibold text-foreground">{community.name}</p>
                <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${priority.tone}`}>{priority.short}</span>
              </div>
              <p className="mt-1 text-sm text-foreground">{card.shortStatus}</p>
              <p className="text-xs text-muted-foreground">{community._count.members} members</p>
              <div className="mt-3 flex gap-2">
                <Link href={card.primaryHref} className="flex-1">
                  <Button className="h-9 w-full" size="sm">
                    {card.primaryLabel}
                  </Button>
                </Link>
                <Link href={`/dashboard/c/${community.slug}`}>
                  <Button size="sm" variant="outline" className="h-9">
                    Enter
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
