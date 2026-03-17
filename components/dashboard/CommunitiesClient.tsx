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
type HeroState = "critical" | "upcoming" | "live" | "healthy";

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
  primaryIcon: "calendar" | "radio" | "arrow";
  tone: string;
} {
  const weeklySessions = community.weeklySessions || 0;
  const nextSession = community.nextSession;

  if (weeklySessions >= 2) {
    return {
      state: "healthy",
      title: "🔥 Active this week",
      subtitle: `${weeklySessions} sessions · ${community.avgAttendanceThisWeek || 0} avg attendees`,
      primaryLabel: "View sessions",
      primaryHref: "/dashboard/sessions",
      primaryIcon: "arrow",
      tone: "border-emerald-200 bg-emerald-50 text-emerald-900",
    };
  }

  if (!nextSession) {
    return {
      state: "empty",
      title: "🚨 No sessions scheduled",
      subtitle: "Your community is inactive",
      nextStep: "Next step: schedule your first session",
      primaryLabel: "Schedule your first session",
      primaryHref: "/dashboard/sessions/create",
      primaryIcon: "calendar",
      tone: "border-rose-200 bg-rose-50 text-rose-900",
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
          ? "🟢 Live now"
          : `🟢 Live in ${hoursUntil(nextSession.scheduledAt)} hours`,
      subtitle: `${nextSession.attendeeCount || 0} attending`,
      primaryLabel: "Start session",
      primaryHref:
        nextSession.status === "IN_PROGRESS"
          ? `/dashboard/sessions/${nextSession.id}/room`
          : `/dashboard/sessions/${nextSession.id}`,
      primaryIcon: "radio",
      tone: "border-emerald-200 bg-emerald-50 text-emerald-900",
    };
  }

  return {
    state: "upcoming",
    title: "🟡 Next session",
    subtitle: formatSessionDayTime(nextSession.scheduledAt),
    detail: `${nextSession.attendeeCount || 0} attending`,
    primaryLabel: "View session",
    primaryHref: `/dashboard/sessions/${nextSession.id}`,
    primaryIcon: "arrow",
    tone: "border-amber-200 bg-amber-50 text-amber-900",
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

  const hasLiveToday = communities.some((c) => {
    if (!c.nextSession) return false;
    if (c.nextSession.status === "IN_PROGRESS") return true;
    const d = new Date(c.nextSession.scheduledAt);
    return d.toDateString() === new Date().toDateString();
  });

  const hasUpcoming = communities.some((c) => c.nextSession);
  const healthy = communities.some((c) => (c.weeklySessions || 0) >= 2);

  const heroState: HeroState = !hasUpcoming
    ? "critical"
    : hasLiveToday
      ? "live"
      : healthy
        ? "healthy"
        : "upcoming";

  const hero =
    heroState === "critical"
      ? {
          title: "🚨 Your community needs momentum",
          description:
            "You don’t have any upcoming live sessions. Start your first session to activate engagement.",
        }
      : heroState === "live"
        ? {
            title: "🟢 You have a live moment today",
            description: "Your community has a session today. Show up on time and drive attendance.",
          }
        : heroState === "upcoming"
          ? {
              title: "🟡 Your next live moment is scheduled",
              description: "Keep momentum by pushing RSVPs and reminders before start.",
            }
          : {
              title: "🔥 Your community engine is running",
              description: "You’re running consistent sessions. Keep quality and attendance high.",
            };

  const nextUp = useMemo(() => {
    const sessions = communities
      .map((c) => ({ community: c, session: c.nextSession }))
      .filter((x) => x.session)
      .sort(
        (a, b) =>
          new Date(a.session!.scheduledAt).getTime() - new Date(b.session!.scheduledAt).getTime()
      );

    if (!sessions.length) {
      return {
        title: "Your next milestone: Host your first live session",
        subtitle: "No session scheduled",
        unlocks: ["Member engagement", "Recaps", "Growth loops"],
        cta: "Schedule session",
        href: "/dashboard/sessions/create",
      };
    }

    const next = sessions[0];
    return {
      title: next.session!.title,
      subtitle: `${formatSessionDayTime(next.session!.scheduledAt)} · ${next.session!.attendeeCount || 0} attending`,
      unlocks: [] as string[],
      cta: "View session",
      href: `/dashboard/sessions/${next.session!.id}`,
    };
  }, [communities]);

  const progressItems = [
    { label: "Create community", done: communities.length > 0 },
    {
      label: "Host first session",
      done: communities.some(
        (c) => (c.weeklySessions || 0) > 0 || Boolean(c.lastSessionAt)
      ),
    },
    { label: "Get 10 attendees", done: momentum.attendees >= 10 },
    {
      label: "Build weekly habit",
      done: communities.some((c) => (c.weeklySessions || 0) >= 2),
    },
  ];

  const nextBestAction = useMemo(() => {
    if (!hasUpcoming) {
      return {
        title: "Schedule your first session",
        cta: "Schedule session",
        href: "/dashboard/sessions/create",
      };
    }

    if (momentum.members < 5) {
      return {
        title: "Invite 5 members",
        cta: "Invite members",
        href: "/dashboard/communities",
      };
    }

    return {
      title: "Ask your first question",
      cta: "Create post",
      href: "/dashboard/feed",
    };
  }, [hasUpcoming, momentum.members]);

  const quickActions = !hasUpcoming
    ? [
        { label: "Schedule session", href: "/dashboard/sessions/create", primary: true },
        { label: "Invite members", href: "/dashboard/communities", primary: false },
        { label: "Create post", href: "/dashboard/feed", primary: false },
      ]
    : [
        { label: "View session", href: "/dashboard/sessions", primary: true },
        { label: "Create post", href: "/dashboard/feed", primary: false },
        { label: "Invite members", href: "/dashboard/communities", primary: false },
      ];

  const primaryCommunity = communities[0] || null;
  const primaryCard = primaryCommunity ? getCardState(primaryCommunity) : null;
  const primaryLastPost = formatRelative(primaryCommunity?.lastPostAt);
  const primaryLastSession = formatRelative(primaryCommunity?.lastSessionAt);

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
      <div className="rounded-2xl border border-border bg-card p-6">
        <h1 className="text-2xl font-bold text-foreground">{hero.title}</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{hero.description}</p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Your progress</p>
        <div className="mt-2 space-y-1">
          {progressItems.map((item) => (
            <p key={item.label} className={`text-sm ${item.done ? "text-emerald-700" : "text-zinc-700"}`}>
              {item.done ? "☑" : "☐"} {item.label}
            </p>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Next up</p>
        <p className="mt-1 text-base font-semibold text-foreground">{nextUp.title}</p>
        <p className="text-sm text-muted-foreground">{nextUp.subtitle}</p>
        {nextUp.unlocks.length > 0 && (
          <>
            <p className="mt-2 text-sm font-medium text-foreground">This unlocks:</p>
            <ul className="mt-1 space-y-1 text-sm text-muted-foreground">
              {nextUp.unlocks.map((u) => (
                <li key={u}>- {u}</li>
              ))}
            </ul>
          </>
        )}
        <Link href={nextUp.href} className="mt-3 inline-flex">
          <Button size="sm">{nextUp.cta}</Button>
        </Link>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">This week</p>
        <div className="mt-2 space-y-1 text-sm text-foreground">
          <p><span className="font-semibold">{momentum.sessions}</span> session{momentum.sessions !== 1 ? "s" : ""} scheduled</p>
          <p>
            {momentum.attendees === 0
              ? "No one attended yet → improve attendance"
              : <><span className="font-semibold">{momentum.attendees}</span> attendees</>}
          </p>
          <p><span className="font-semibold">{momentum.members}</span> members</p>
          <p><span className="font-semibold">{momentum.posts}</span> posts</p>
        </div>
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <p className="flex items-center gap-2 text-sm font-semibold text-amber-900"><Flame className="h-4 w-4" />Next best action</p>
        <p className="mt-1 text-base font-semibold text-amber-950">{nextBestAction.title}</p>
        <Link href={nextBestAction.href} className="mt-3 inline-flex">
          <Button size="sm" className="bg-amber-500 text-zinc-900 hover:bg-amber-400">{nextBestAction.cta}</Button>
        </Link>
      </div>

      {primaryCommunity && primaryCard && (
        <>
          <div className="overflow-hidden rounded-3xl border border-border bg-card">
            <div className="h-32 bg-gradient-to-r from-violet-600 via-fuchsia-600 to-orange-500" />
            <div className="-mt-8 p-6">
              <p className="text-2xl font-bold text-white drop-shadow-sm">{primaryCommunity.name}</p>
              <p className="text-sm text-zinc-100">{primaryCommunity.description || "Mentoring & Community"}</p>
              <p className="mt-3 text-xs text-zinc-200">
                {primaryCommunity._count.members} members · {primaryCommunity._count.posts} posts
              </p>

              <div className={`mt-4 rounded-lg border p-3 ${primaryCard.tone}`}>
                <p className="text-sm font-semibold">{primaryCard.title}</p>
                <p className="mt-1 text-sm">{primaryCard.subtitle}</p>
                {primaryCard.detail && <p className="mt-1 text-sm">{primaryCard.detail}</p>}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Link href={primaryCard.state === "empty" ? "/dashboard/sessions/create" : primaryCard.primaryHref}>
                  <Button>
                    {primaryCard.state === "empty" ? "Start your first live session" : primaryCard.primaryLabel}
                  </Button>
                </Link>
                <Link href={`/dashboard/c/${primaryCommunity.slug}`}>
                  <Button variant="outline">Enter community</Button>
                </Link>
              </div>

              <p className="mt-3 text-xs text-zinc-200">
                Last activity: {primaryLastPost ? `post ${primaryLastPost}` : "no posts yet"}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-sm font-semibold text-foreground">Community status</p>
            <p className="mt-3 text-sm text-zinc-700">Next step: {primaryCard.nextStep || "Keep weekly consistency"}</p>
            <p className="mt-2 text-sm text-zinc-700">
              Health: {primaryCard.state === "empty" ? "🔴 At risk" : primaryCard.state === "healthy" ? "🟢 Healthy" : "🟡 Building momentum"}
            </p>
            <p className="mt-2 text-sm text-zinc-700">Last session: {primaryLastSession || "Never hosted"}</p>
          </div>
        </>
      )}

      {communities.length > 1 && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {communities.slice(1).map((community) => {
            const card = getCardState(community);
            return (
              <div key={community.id} className="rounded-2xl border border-border bg-card p-5">
                <p className="truncate text-lg font-semibold text-foreground">{community.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">{community._count.members} members · {community._count.posts} posts</p>
                <div className={`mt-3 rounded-lg border p-3 ${card.tone}`}>
                  <p className="text-sm font-semibold">{card.title}</p>
                  <p className="mt-1 text-sm">{card.subtitle}</p>
                </div>
                <div className="mt-3 flex gap-2">
                  <Link href={card.primaryHref} className="flex-1"><Button className="w-full" size="sm">{card.primaryLabel}</Button></Link>
                  <Link href={`/dashboard/c/${community.slug}`}><Button size="sm" variant="outline">Enter</Button></Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!communities.length && (
        <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-card p-10 text-center">
          <Users className="h-10 w-10 text-primary" />
          <h2 className="mt-4 text-xl font-bold text-foreground">No communities yet</h2>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">Create your first community to start your community engine.</p>
          <div className="mt-5 flex items-center gap-2">
            <Link href="/dashboard/communities/new"><Button><Plus className="mr-2 h-4 w-4" />Create community</Button></Link>
            <Link href="/dashboard/communities/explore"><Button variant="outline">Explore communities</Button></Link>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {quickActions.map((action) => (
          <Link key={action.label} href={action.href}>
            <Button variant={action.primary ? "default" : "outline"}>{action.label}</Button>
          </Link>
        ))}
      </div>
    </div>
  );
}
