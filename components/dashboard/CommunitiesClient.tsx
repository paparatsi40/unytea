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
  Flame,
  AlertTriangle,
} from "lucide-react";
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
      title: "🟢 Live today",
      subtitle:
        nextSession.status === "IN_PROGRESS"
          ? `${nextSession.attendeeCount || 0} attending now`
          : `Starts in ${hoursUntil(nextSession.scheduledAt)}h · ${nextSession.attendeeCount || 0} attending`,
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
    subtitle: `${formatSessionDayTime(nextSession.scheduledAt)} · ${nextSession.attendeeCount || 0} attending`,
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

  const filteredCommunities = useMemo(
    () => communities.filter((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase())),
    [communities, searchQuery]
  );

  const momentum = useMemo(() => {
    const sessions = communities.reduce((sum, c) => sum + (c.weeklySessions || 0), 0);
    const attendees = communities.reduce((sum, c) => sum + (c.attendeesThisWeek || 0), 0);
    const members = communities.reduce((sum, c) => sum + c._count.members, 0);
    const postsThisWeek = communities.reduce((sum, c) => sum + (c.postsThisWeek || 0), 0);
    return { sessions, attendees, members, postsThisWeek };
  }, [communities]);

  const communitiesWithoutSession = communities.filter((c) => !c.nextSession).length;

  const hero = useMemo(() => {
    if (communities.length === 0) {
      return {
        title: "🚀 You don’t have a community yet",
        description: "Create your first community and run your first live session.",
        cta: "Create community",
        href: "/dashboard/communities/new",
      };
    }

    if (communitiesWithoutSession > 0) {
      return {
        title: "⚠️ Your community needs momentum",
        description: "You have communities without upcoming live sessions scheduled.",
        cta: "Schedule session",
        href: "/dashboard/sessions/create",
      };
    }

    return {
      title: "🔥 Your community engine is running",
      description: "You have upcoming live moments. Keep attendance momentum alive.",
      cta: "View sessions",
      href: "/dashboard/sessions",
    };
  }, [communities.length, communitiesWithoutSession]);

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
        title: "No session scheduled",
        subtitle: "Schedule your next live session to keep your community active.",
        cta: "Schedule session",
        href: "/dashboard/sessions/create",
      };
    }

    const next = sessions[0];
    return {
      title: next.session!.title,
      subtitle: `${formatSessionDayTime(next.session!.scheduledAt)} · ${next.session!.attendeeCount || 0} attending · ${next.community.name}`,
      cta: "View session",
      href: `/dashboard/sessions/${next.session!.id}`,
    };
  }, [communities]);

  const nextBestAction = useMemo(() => {
    if (momentum.sessions === 0) {
      return {
        title: "Schedule your first session",
        description: "This is the #1 driver of community growth.",
        cta: "Schedule session",
        href: "/dashboard/sessions/create",
      };
    }

    if (momentum.members < 5) {
      return {
        title: "Invite 5 members",
        description: "More members create stronger session momentum.",
        cta: "Invite members",
        href: "/dashboard/communities",
      };
    }

    return {
      title: "Ask your first question",
      description: "Prime engagement before your next live session.",
      cta: "Create post",
      href: "/dashboard/feed",
    };
  }, [momentum.sessions, momentum.members]);

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
          <Button onClick={() => window.location.reload()} className="mt-4">Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{hero.title}</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{hero.description}</p>
          </div>
          <Link href={hero.href}>
            <Button>
              {hero.cta}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Next up</p>
        <p className="mt-1 text-base font-semibold text-foreground">{nextUp.title}</p>
        <p className="text-sm text-muted-foreground">{nextUp.subtitle}</p>
        <Link href={nextUp.href} className="mt-3 inline-flex"><Button size="sm">{nextUp.cta}</Button></Link>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">This week</p>
        <div className="mt-2 grid gap-3 md:grid-cols-4">
          <div className="rounded-lg bg-muted/40 p-3 text-sm"><p className="text-muted-foreground">Sessions</p><p className="text-xl font-semibold text-foreground">{momentum.sessions}</p></div>
          <div className="rounded-lg bg-muted/40 p-3 text-sm"><p className="text-muted-foreground">Attendees</p><p className="text-xl font-semibold text-foreground">{momentum.attendees}</p></div>
          <div className="rounded-lg bg-muted/40 p-3 text-sm"><p className="text-muted-foreground">Members</p><p className="text-xl font-semibold text-foreground">{momentum.members}</p></div>
          <div className="rounded-lg bg-muted/40 p-3 text-sm"><p className="text-muted-foreground">Posts this week</p><p className="text-xl font-semibold text-foreground">{momentum.postsThisWeek}</p></div>
        </div>
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <p className="flex items-center gap-2 text-sm font-semibold text-amber-900"><Flame className="h-4 w-4" />Next best action</p>
        <p className="mt-1 text-base font-semibold text-amber-950">{nextBestAction.title}</p>
        <p className="text-sm text-amber-800">{nextBestAction.description}</p>
        <Link href={nextBestAction.href} className="mt-3 inline-flex"><Button size="sm" className="bg-amber-500 text-zinc-900 hover:bg-amber-400">{nextBestAction.cta}</Button></Link>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href="/dashboard/sessions/create"><Button><Calendar className="mr-2 h-4 w-4" />Schedule session</Button></Link>
        <Link href="/dashboard/communities"><Button variant="outline"><UserPlus className="mr-2 h-4 w-4" />Invite members</Button></Link>
        <Link href="/dashboard/feed"><Button variant="outline"><MessageSquare className="mr-2 h-4 w-4" />Create post</Button></Link>
        {communities.length === 0 && <Link href="/dashboard/communities/new"><Button variant="outline"><Plus className="mr-2 h-4 w-4" />Create community</Button></Link>}
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input type="text" placeholder="Search your communities..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm" />
        </div>
        <div className="text-sm text-muted-foreground">{filteredCommunities.length} communities</div>
      </div>

      {filteredCommunities.length > 0 ? (
        <div className={filteredCommunities.length === 1 ? "grid gap-4 max-w-2xl" : "grid gap-4 sm:grid-cols-2 xl:grid-cols-3"}>
          {filteredCommunities.map((community) => {
            const card = getCardState(community);
            const lastPost = formatRelative(community.lastPostAt);
            const lastSession = formatRelative(community.lastSessionAt);

            return (
              <div key={community.id} className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-lg font-semibold text-foreground">{community.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{community._count.members} members · {community._count.posts} posts</p>
                  </div>
                  <div className="flex items-center gap-1">
                    {community.role === "OWNER" && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700"><Crown className="mr-1 inline h-3 w-3" />Owner</span>}
                    {community.isPrivate && <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-700"><Lock className="mr-1 inline h-3 w-3" />Private</span>}
                  </div>
                </div>

                <div className={`mt-4 rounded-lg border p-3 ${card.tone}`}>
                  <p className="text-sm font-semibold">{card.title}</p>
                  <p className="mt-1 text-sm">{card.subtitle}</p>
                </div>

                <div className="mt-3 text-xs text-muted-foreground">
                  {lastPost ? <p>Last activity: post {lastPost}</p> : <p>Last activity: none yet</p>}
                  {lastSession ? <p>Last session: {lastSession}</p> : <p>Last session: never hosted</p>}
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <Link href={card.primaryHref} className="flex-1">
                    <Button className="w-full">
                      {card.primaryIcon === "calendar" ? <Calendar className="mr-1.5 h-4 w-4" /> : null}
                      {card.primaryIcon === "radio" ? <Radio className="mr-1.5 h-4 w-4" /> : null}
                      {card.primaryLabel}
                      {card.primaryIcon === "arrow" ? <ArrowRight className="ml-1.5 h-4 w-4" /> : null}
                    </Button>
                  </Link>
                  <Link href={`/dashboard/c/${community.slug}`}><Button variant="outline">Enter community</Button></Link>
                </div>

                <div className="mt-3 flex items-center gap-3 border-t border-border pt-3 text-xs text-muted-foreground">
                  <Link href={`/dashboard/c/${community.slug}/invite`} className="inline-flex items-center hover:text-foreground"><UserPlus className="mr-1 h-3.5 w-3.5" />Invite members</Link>
                  <Link href="/dashboard/feed" className="inline-flex items-center hover:text-foreground"><MessageSquare className="mr-1 h-3.5 w-3.5" />Create post</Link>
                  {(community.weeklySessions || 0) === 0 && <span className="inline-flex items-center text-amber-700"><AlertTriangle className="mr-1 h-3.5 w-3.5" />At risk</span>}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-card p-10 text-center">
          <Users className="h-10 w-10 text-primary" />
          <h2 className="mt-4 text-xl font-bold text-foreground">{searchQuery ? "No communities found" : "No communities yet"}</h2>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">{searchQuery ? "Try another search term." : "Create your first community to start your community engine."}</p>
          <div className="mt-5 flex items-center gap-2">
            <Link href="/dashboard/communities/new"><Button><Plus className="mr-2 h-4 w-4" />Create community</Button></Link>
            <Link href="/dashboard/communities/explore"><Button variant="outline">Explore communities</Button></Link>
          </div>
        </div>
      )}
    </div>
  );
}
