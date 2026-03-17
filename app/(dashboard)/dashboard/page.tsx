"use client";

import { useState, useEffect } from "react";
import { useCurrentUser } from "@/hooks/use-current-user";
import {
  Users,
  Video,
  Calendar,
  Plus,
  MessageSquare,
  Play,
  ArrowRight,
  Building2,
  TrendingUp,
  Activity,
  Crown,
  Zap,
  BarChart3,
  UserPlus,
  BookOpen,
  ChevronRight,
  Radio,
  Sparkles,
  AlertTriangle,
  Flame,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import Link from "next/link";
import { getDashboardSnapshot } from "@/app/actions/dashboard";
import { toast } from "sonner";

// Types
interface DashboardMetrics {
  communities: number;
  members: number;
  newMembersThisWeek: number;
  sessionsThisWeek: number;
  avgAttendanceRate: number;
}

interface LiveSession {
  id: string;
  title: string;
  slug: string | null;
  description: string | null;
  scheduledAt: Date;
  duration: number;
  status: string;
  mode: string;
  mentor: { id: string; name: string | null; image: string | null } | null;
  community: { id: string; name: string; slug: string } | null;
  series: { id: string; title: string } | null;
  attendeeCount: number;
  roomId: string | null;
}

interface UpcomingSession {
  id: string;
  title: string;
  scheduledAt: Date;
  duration: number;
  status: string;
  mentorName: string | null;
  communityName: string | null;
  attendeeCount: number;
}

interface Activity {
  id: string;
  type: "member_joined" | "post_created" | "recording_ready";
  userName: string;
  communityName: string | null;
  message: string;
  time: Date;
}

interface RecentMember {
  id: string;
  name: string;
  image: string | null;
  communityName: string;
  joinedAt: Date;
}

interface PerformanceSnapshot {
  sessionsHosted: number;
  postsThisWeek: number;
  newMembersThisWeek: number;
  growthRate: number;
}

interface HostAnalyticsV1 {
  sessionsHosted: number;
  avgAttendance: number;
  rsvpToAttendanceRate: number;
  recordingViews: number;
  activeMembers: number;
  recordingsReady: number;
}

interface NextRecommendedAction {
  title: string;
  description: string;
  href: string;
  cta: string;
  priority: string;
}

interface HostAlert {
  type: "warning" | "info";
  title: string;
  description: string;
  href: string;
  cta: string;
  priority: "high" | "medium" | "low";
  communityName?: string;
}

interface LeaderboardMember {
  userId: string;
  name: string;
  image: string | null;
  score: number;
}

interface CommunityOSSnapshot {
  weeklyProgram: Array<{
    id: string;
    title: string;
    scheduledAt: Date;
    seriesTitle: string | null;
    seriesFrequency: string | null;
    seriesDayOfWeek: number | null;
    seriesStartTime: string | null;
  }>;
  stats: {
    sessionsScheduled: number;
    questionsSubmitted: number;
    recapPosts: number;
    recordingViews: number;
  };
  checklist: {
    plan: boolean;
    promote: boolean;
    host: boolean;
    capture: boolean;
    reuse: boolean;
  };
  playbook?: {
    title: string;
    completedSteps: number;
    totalSteps: number;
    dynamicBanner: {
      icon: string;
      title: string;
      description: string;
      cta: string;
      href: string;
    };
    steps: Array<{
      id: string;
      day: string;
      action: string;
      description: string;
      cta: string;
      href: string;
      completed: boolean;
    }>;
  };
}

interface HostScoreSystem {
  hostScore: number;
  level: "Elite" | "Strong" | "Growing" | "At risk";
  summary: {
    completedSessions: number;
    rsvpToAttendanceRate: number;
    engagementEvents: number;
    upcomingSessions: number;
    contentUnits: number;
  };
  components: Array<{
    key: string;
    label: string;
    score: number;
    href: string;
  }>;
  actions: Array<{
    title: string;
    description: string;
    href: string;
    cta: string;
  }>;
}

interface HostGamificationSnapshot {
  streak: {
    weeks: number;
    isActiveThisWeek: boolean;
  };
  milestones: Array<{
    key: string;
    label: string;
    target: number;
    current: number;
    completed: boolean;
    progress: number;
  }>;
  nextMilestone: {
    key: string;
    label: string;
    target: number;
    current: number;
    completed: boolean;
    progress: number;
  };
  weeklyGoals: Array<{
    key: string;
    label: string;
    target: number;
    current: number;
    completed: boolean;
  }>;
}

interface AIPlaybookRecommendation {
  id: string;
  priority: "critical" | "high" | "medium" | "low";
  title: string;
  problem: string;
  action: string;
  cta: string;
  href: string;
  explainability: string;
}

interface AIPlaybookSystem {
  signals: {
    attendanceRate: number;
    sessionsPerWeek: number;
    upcomingSessions: number;
    postsLast7d: number;
    newMembersLast7d: number;
    recordingViews: number;
    streak: number;
    activeMembers: number;
    lastSessionAttended: number;
  };
  recommendations: AIPlaybookRecommendation[];
}

interface AutopilotDashboard {
  health: {
    completionRate: number;
    totalJobs: number;
    queued: number;
    failed: number;
  };
  queue: Array<{
    id: string;
    status: "queued" | "running" | "done" | "failed";
    jobType: string;
    runAt: string | null;
    retries: number;
    error?: string;
    sessionTitle: string;
    communityName: string;
  }>;
}

interface UserIdentitySnapshot {
  user: {
    id: string;
    name: string | null;
    username: string | null;
    email: string;
    image: string | null;
    bio: string | null;
    tagline: string | null;
    interests: string[];
    skills: string[];
    location: string | null;
    createdAt: Date;
  };
  stats: {
    communitiesJoined: number;
    sessionsAttended: number;
    sessionsHosted: number;
    contributions: number;
  };
  communities: Array<{
    membershipId: string;
    role: string;
    joinedAt: Date;
    community: {
      id: string;
      name: string;
      slug: string;
      imageUrl: string | null;
      isPaid: boolean;
      membersCount: number;
      nextSession: {
        id: string;
        title: string;
        scheduledAt: Date;
      } | null;
    };
  }>;
}

interface ActivationSnapshot {
  hasAttendedFirstSession: boolean;
  timeToFirstSessionHours: number | null;
  target24h: boolean;
  rsvpStatus: "attending" | "interested" | null;
  nextSession: {
    id: string;
    title: string;
    scheduledAt: Date;
    communityName: string;
    communitySlug: string;
    attendingCount: number;
  } | null;
  missedSession: {
    id: string;
    title: string;
    slug: string | null;
    community: { slug: string } | null;
  } | null;
}

export default function DashboardPage() {
  const { user } = useCurrentUser();

  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [nextSession, setNextSession] = useState<LiveSession | null>(null);
  const [upcomingSessions, setUpcomingSessions] = useState<UpcomingSession[]>(
    []
  );
  const [activities, setActivities] = useState<Activity[]>([]);
  const [recentMembers, setRecentMembers] = useState<RecentMember[]>([]);
  const [performance, setPerformance] = useState<PerformanceSnapshot | null>(
    null
  );
  const [hostAnalytics, setHostAnalytics] = useState<HostAnalyticsV1 | null>(null);
  const [nextAction, setNextAction] = useState<NextRecommendedAction | null>(null);
  const [hostAlerts, setHostAlerts] = useState<HostAlert[]>([]);
  const [topContributors, setTopContributors] = useState<LeaderboardMember[]>([]);
  const [topAttendees, setTopAttendees] = useState<LeaderboardMember[]>([]);
  const [communityOS, setCommunityOS] = useState<CommunityOSSnapshot | null>(null);
  const [hostScoreSystem, setHostScoreSystem] = useState<HostScoreSystem | null>(null);
  const [gamification, setGamification] = useState<HostGamificationSnapshot | null>(null);
  const [aiPlaybook, setAiPlaybook] = useState<AIPlaybookSystem | null>(null);
  const [autopilot, setAutopilot] = useState<AutopilotDashboard | null>(null);
  const [identity, setIdentity] = useState<UserIdentitySnapshot | null>(null);
  const [activation, setActivation] = useState<ActivationSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load dashboard data
  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);

      const snapshot = await getDashboardSnapshot();
      if (!snapshot.success || !snapshot.payload) {
        throw new Error("Failed to load dashboard snapshot");
      }

      const {
        metricsRes,
        nextSessionRes,
        upcomingRes,
        activityRes,
        membersRes,
        performanceRes,
        hostAnalyticsRes,
        nextActionRes,
        hostAlertsRes,
        leaderboardRes,
        communityOSRes,
        hostScoreRes,
        gamificationRes,
        aiPlaybookRes,
        autopilotRes,
        identityRes,
        activationRes,
      } = snapshot.payload;

      if (metricsRes.success) setMetrics(metricsRes.metrics || null);
      if (nextSessionRes.success) setNextSession(nextSessionRes.session ?? null);
      if (upcomingRes.success) setUpcomingSessions(upcomingRes.sessions || []);
      if (activityRes.success) setActivities(activityRes.activities || []);
      if (membersRes.success) setRecentMembers(membersRes.members || []);
      if (performanceRes.success) setPerformance(performanceRes.snapshot || null);
      if (hostAnalyticsRes.success) setHostAnalytics(hostAnalyticsRes.analytics || null);
      if (nextActionRes.success) setNextAction(nextActionRes.recommendation || null);
      if (hostAlertsRes.success) setHostAlerts(hostAlertsRes.alerts || []);
      if (leaderboardRes.success) {
        setTopContributors(leaderboardRes.contributors || []);
        setTopAttendees(leaderboardRes.attendees || []);
      }
      if (communityOSRes.success) setCommunityOS(communityOSRes.snapshot || null);
      if (
        gamificationRes.success &&
        gamificationRes.streak &&
        gamificationRes.nextMilestone
      ) {
        setGamification({
          streak: gamificationRes.streak,
          milestones: gamificationRes.milestones || [],
          nextMilestone: gamificationRes.nextMilestone,
          weeklyGoals: gamificationRes.weeklyGoals || [],
        });
      }
      if (
        hostScoreRes.success &&
        typeof hostScoreRes.hostScore === "number" &&
        hostScoreRes.level &&
        hostScoreRes.summary
      ) {
        const allowedLevels = ["Elite", "Strong", "Growing", "At risk"] as const;
        const normalizedLevel = allowedLevels.includes(hostScoreRes.level as any)
          ? (hostScoreRes.level as HostScoreSystem["level"])
          : "Growing";

        setHostScoreSystem({
          hostScore: hostScoreRes.hostScore,
          level: normalizedLevel,
          summary: hostScoreRes.summary,
          components: hostScoreRes.components || [],
          actions: hostScoreRes.actions || [],
        });
      }

      if (aiPlaybookRes.success && aiPlaybookRes.signals) {
        setAiPlaybook({
          signals: aiPlaybookRes.signals,
          recommendations: aiPlaybookRes.recommendations || [],
        });
      }

      if (autopilotRes.success && autopilotRes.health) {
        setAutopilot({
          health: autopilotRes.health,
          queue: autopilotRes.queue || [],
        });
      }

      if (identityRes.success && identityRes.identity) {
        setIdentity(identityRes.identity as UserIdentitySnapshot);
      }

      if (activationRes.success && activationRes.activation) {
        setActivation(activationRes.activation as ActivationSnapshot);
      }
    } catch (error) {
      console.error("Error loading dashboard:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const formatDate = (date: Date) => {
    const d = new Date(date);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (d.toDateString() === today.toDateString()) return "Today";
    if (d.toDateString() === tomorrow.toDateString()) return "Tomorrow";

    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const getTimeAgo = (date: Date) => {
    const now = new Date();
    const past = new Date(date);
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return "Yesterday";
    return `${diffDays} days ago`;
  };

  const hasCommunity = metrics && metrics.communities > 0;
  const hasSessions = upcomingSessions.length > 0;

  const sessionToday = nextSession
    ? (() => {
        const d = new Date(nextSession.scheduledAt);
        const now = new Date();
        return d.toDateString() === now.toDateString();
      })()
    : false;

  const sessionSoon = nextSession
    ? (() => {
        const diff = new Date(nextSession.scheduledAt).getTime() - Date.now();
        return diff > 0 && diff <= 24 * 60 * 60 * 1000;
      })()
    : false;

  const heroState: "no_sessions" | "today" | "upcoming" | "healthy" =
    !hasSessions ? "no_sessions" : sessionToday ? "today" : sessionSoon ? "upcoming" : "healthy";

  const heroContent =
    heroState === "no_sessions"
      ? {
          title: "🚨 You have no sessions this week",
          description: "Your community is at risk of losing momentum.",
          cta: "Schedule your first session",
          href: "/dashboard/sessions/create",
        }
      : heroState === "today"
        ? {
            title: "🟢 Your session starts soon",
            description: `${nextSession?.title || "Next session"} · ${nextSession?.attendeeCount || 0} attending`,
            cta: "Join session",
            href: nextSession ? `/dashboard/sessions/${nextSession.id}` : "/dashboard/sessions",
          }
        : heroState === "upcoming"
          ? {
              title: "🟡 Your next session is coming up",
              description: `${nextSession?.title || "Next session"} · ${formatDate(nextSession?.scheduledAt || new Date())} ${formatTime(nextSession?.scheduledAt || new Date())}`,
              cta: "View session",
              href: nextSession ? `/dashboard/sessions/${nextSession.id}` : "/dashboard/sessions",
            }
          : {
              title: "🔥 Your community is on track",
              description: `${metrics?.sessionsThisWeek || 0} sessions this week · ${hostAnalytics?.avgAttendance || 0} avg attendees`,
              cta: "View sessions",
              href: "/dashboard/sessions",
            };

  const weeklyProgress = communityOS?.playbook
    ? Math.round((communityOS.playbook.completedSteps / Math.max(1, communityOS.playbook.totalSteps)) * 100)
    : 0;

  const journeyItems = [
    { label: "Create community", done: (metrics?.communities || 0) > 0 },
    { label: "Host first session", done: (hostAnalytics?.sessionsHosted || 0) >= 1 },
    { label: "Get 10 attendees", done: (hostAnalytics?.avgAttendance || 0) >= 10 },
    { label: "Build weekly habit", done: (metrics?.sessionsThisWeek || 0) >= 1 },
  ];

  const quickActions =
    heroState === "no_sessions"
      ? [
          { label: "Schedule session", href: "/dashboard/sessions/create" },
          { label: "Invite members", href: "/dashboard/communities" },
        ]
      : heroState === "today"
        ? [
            { label: "Start session", href: nextSession ? `/dashboard/sessions/${nextSession.id}` : "/dashboard/sessions" },
            { label: "View attendees", href: "/dashboard/analytics" },
          ]
        : [
            { label: "View session", href: nextSession ? `/dashboard/sessions/${nextSession.id}` : "/dashboard/sessions" },
            { label: "Invite members", href: "/dashboard/communities" },
            { label: "Create post", href: "/dashboard/feed" },
          ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-50">
        <div className="mx-auto max-w-7xl p-6 space-y-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-zinc-900">Welcome back 👋</h1>
              <p className="text-zinc-500 mt-1">Preparing your dashboard…</p>
            </div>
            <div className="h-10 w-44 rounded bg-zinc-200 animate-pulse" />
          </div>

          <Card className="border-zinc-200 bg-white">
            <CardContent className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-1 min-h-[64px]">
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Action First</p>
                  <h2 className="text-xl font-semibold text-zinc-900">Schedule your next session</h2>
                  <p className="text-sm text-zinc-700">Communities with weekly sessions grow 3x faster.</p>
                </div>
                <Button className="bg-purple-600 hover:bg-purple-700" disabled>
                  Schedule your first session
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3 animate-pulse">
                <div className="h-24 rounded-lg bg-zinc-100" />
                <div className="h-24 rounded-lg bg-zinc-100" />
                <div className="h-24 rounded-lg bg-zinc-100" />
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2 animate-pulse">
            <div className="h-44 rounded-xl border border-zinc-200 bg-white" />
            <div className="h-44 rounded-xl border border-zinc-200 bg-white" />
          </div>

          <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-4 animate-pulse">
            <div className="h-28 rounded-xl border border-zinc-200 bg-white" />
            <div className="h-28 rounded-xl border border-zinc-200 bg-white" />
            <div className="h-28 rounded-xl border border-zinc-200 bg-white" />
            <div className="h-28 rounded-xl border border-zinc-200 bg-white" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="mx-auto max-w-7xl p-6 space-y-6">
        {/* HEADER */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">
              Welcome back, {user?.name?.split(" ")[0] || "there"} 👋
            </h1>
            <p className="text-zinc-500 mt-1">
              Here's how your community business is performing today.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard/communities/new">
              <Button className="bg-purple-600 hover:bg-purple-700">
                <Plus className="h-4 w-4 mr-2" />
                Create Community
              </Button>
            </Link>
          </div>
        </div>

        <Card className="border-zinc-200 bg-white">
          <CardContent className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Action First</p>
                <h2 className="text-xl font-semibold text-zinc-900">{heroContent.title}</h2>
                <p className="text-sm text-zinc-600 max-w-2xl">{heroContent.description}</p>
              </div>
              <Link href={heroContent.href}>
                <Button className="bg-purple-600 hover:bg-purple-700">
                  {heroContent.cta}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg bg-zinc-50 p-3">
                <p className="text-xs text-zinc-500">Weekly progress</p>
                <p className="mt-1 text-lg font-semibold text-zinc-900">{communityOS?.playbook ? `${communityOS.playbook.completedSteps}/${communityOS.playbook.totalSteps}` : "0/5"}</p>
                <Progress value={weeklyProgress} className="mt-2 h-1.5" />
              </div>
              <div className="rounded-lg bg-zinc-50 p-3">
                <p className="text-xs text-zinc-500">Next live</p>
                <p className="mt-1 text-sm font-medium text-zinc-900">{nextSession ? `${formatDate(nextSession.scheduledAt)} · ${formatTime(nextSession.scheduledAt)}` : "No session scheduled"}</p>
              </div>
              <div className="rounded-lg bg-zinc-50 p-3">
                <p className="text-xs text-zinc-500">WAA proxy</p>
                <p className="mt-1 text-lg font-semibold text-zinc-900">{hostAnalytics?.avgAttendance ?? 0}</p>
                <p className="text-xs text-zinc-500">avg live attendance</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="border-zinc-200 bg-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Your progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {journeyItems.map((item) => (
                <p key={item.label} className={`text-sm ${item.done ? "text-emerald-700" : "text-zinc-700"}`}>
                  {item.done ? "☑" : "☐"} {item.label}
                </p>
              ))}
            </CardContent>
          </Card>

          <Card className="border-zinc-200 bg-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">This week plan</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              <Link href="/dashboard/sessions/create"><Button variant="outline" className="justify-between">Schedule 1 session <ArrowRight className="h-4 w-4"/></Button></Link>
              <Link href="/dashboard/feed"><Button variant="outline" className="justify-between">Ask 1 question in feed <ArrowRight className="h-4 w-4"/></Button></Link>
              <Link href="/dashboard/sessions"><Button variant="outline" className="justify-between">Host your session <ArrowRight className="h-4 w-4"/></Button></Link>
              <Link href="/dashboard/recordings"><Button variant="outline" className="justify-between">Share recap <ArrowRight className="h-4 w-4"/></Button></Link>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="border-amber-200 bg-amber-50/40 lg:col-span-1">
            <CardContent className="p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Highest impact action</p>
              <p className="mt-2 text-sm font-semibold text-zinc-900">{heroState === "no_sessions" ? "Schedule your next session" : heroState === "today" ? "Go live on time" : "Increase RSVPs before session"}</p>
              <p className="mt-1 text-sm text-zinc-700">{heroState === "no_sessions" ? "Communities with weekly sessions grow 3x faster." : "One focused action now drives this week's attendance."}</p>
              <Link href={heroContent.href} className="mt-3 inline-flex"><Button size="sm">{heroContent.cta}</Button></Link>
            </CardContent>
          </Card>

          <Card className="border-zinc-200 bg-white lg:col-span-1">
            <CardHeader className="pb-2"><CardTitle className="text-base">This week</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm text-zinc-700">
              <p>Sessions: <span className="font-semibold text-zinc-900">{metrics?.sessionsThisWeek || 0}</span></p>
              <p>Avg attendance: <span className="font-semibold text-zinc-900">{hostAnalytics?.avgAttendance || 0}</span></p>
              <p>Active members: <span className="font-semibold text-zinc-900">{hostAnalytics?.activeMembers || 0}</span></p>
            </CardContent>
          </Card>

          <Card className="border-zinc-200 bg-white lg:col-span-1">
            <CardHeader className="pb-2"><CardTitle className="text-base">Next session</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {nextSession ? (
                <>
                  <p className="font-semibold text-zinc-900">{nextSession.title}</p>
                  <p className="text-sm text-zinc-600">{formatDate(nextSession.scheduledAt)} {formatTime(nextSession.scheduledAt)} · {nextSession.attendeeCount} attending</p>
                  <Link href={`/dashboard/sessions/${nextSession.id}`}><Button size="sm" variant="outline">View session</Button></Link>
                </>
              ) : (
                <>
                  <p className="text-sm text-zinc-600">No session scheduled</p>
                  <Link href="/dashboard/sessions/create"><Button size="sm">Schedule session</Button></Link>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="border-zinc-200 bg-white">
          <CardHeader className="pb-2"><CardTitle className="text-base">Quick actions</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {quickActions.map((a) => (
              <Link key={a.label} href={a.href}><Button variant="outline">{a.label}</Button></Link>
            ))}
          </CardContent>
        </Card>

        <details className="rounded-lg border border-zinc-200 bg-white">
          <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-zinc-700">
            Advanced
          </summary>
          <div className="space-y-6 p-4 pt-0">

        {activation && (
          <Card className="border-emerald-200 bg-emerald-50/40">
            <CardContent className="p-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Activation Engine</p>
                  <h3 className="text-lg font-semibold text-zinc-900">
                    {activation.hasAttendedFirstSession
                      ? "✅ First session completed"
                      : "You’re in 🎉 Let’s get you to your first session"}
                  </h3>
                  {!activation.hasAttendedFirstSession && (
                    <p className="text-sm text-zinc-700">
                      Goal: first live session in under 24h.
                    </p>
                  )}
                </div>
                {activation.hasAttendedFirstSession && activation.timeToFirstSessionHours !== null ? (
                  <Badge className={`${activation.target24h ? "bg-emerald-600" : "bg-amber-500"} text-white`}>
                    TTFS: {activation.timeToFirstSessionHours}h
                  </Badge>
                ) : (
                  <Badge variant="outline">TTFS target: &lt;24h</Badge>
                )}
              </div>

              {activation.nextSession ? (
                <div className="rounded-lg border border-emerald-200 bg-white p-4">
                  <p className="text-xs uppercase tracking-wide text-zinc-500">Next session</p>
                  <p className="mt-1 text-base font-semibold text-zinc-900">{activation.nextSession.title}</p>
                  <p className="mt-1 text-sm text-zinc-600">
                    {formatDate(activation.nextSession.scheduledAt)} · {formatTime(activation.nextSession.scheduledAt)} · {activation.nextSession.communityName}
                  </p>
                  <p className="mt-1 text-sm text-zinc-600">🔥 {activation.nextSession.attendingCount} attending</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link
                      href={`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
                        activation.nextSession.title
                      )}&dates=${new Date(activation.nextSession.scheduledAt)
                        .toISOString()
                        .replace(/[-:]/g, "")
                        .split(".")[0]}Z/${new Date(new Date(activation.nextSession.scheduledAt).getTime() + 60 * 60 * 1000)
                        .toISOString()
                        .replace(/[-:]/g, "")
                        .split(".")[0]}Z`}
                      target="_blank"
                    >
                      <Button size="sm" variant="outline">Add to calendar</Button>
                    </Link>
                    <Link href={`/dashboard/sessions/${activation.nextSession.id}`}>
                      <Button size="sm">Join when it starts</Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-zinc-200 bg-white p-4">
                  <p className="text-sm text-zinc-700">No upcoming sessions in your communities yet.</p>
                  <Link href="/en/explore" className="mt-2 inline-flex">
                    <Button size="sm">Find a live session this week</Button>
                  </Link>
                </div>
              )}

              {activation.missedSession && !activation.hasAttendedFirstSession && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <p className="text-sm font-medium text-amber-900">Missed your first live?</p>
                  <p className="text-sm text-amber-800">Watch the recording and jump into the next session.</p>
                  <Link href={activation.missedSession.slug ? `/en/s/${activation.missedSession.slug}?src=missed_first_session` : `/dashboard/sessions/${activation.missedSession.id}`} className="mt-2 inline-flex">
                    <Button size="sm" variant="outline">Watch recording</Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {identity && (
          <Card className="border-zinc-200 bg-white">
            <CardContent className="p-5 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={identity.user.image || ""} />
                    <AvatarFallback>
                      {(identity.user.name || "U").slice(0, 1).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Identity Layer</p>
                    <h3 className="text-lg font-semibold text-zinc-900">
                      {identity.user.name || "Creator"}
                      {identity.user.username ? ` · @${identity.user.username}` : ""}
                    </h3>
                    <p className="text-sm text-zinc-600">{identity.user.tagline || identity.user.bio || "Build your cross-community reputation."}</p>
                  </div>
                </div>
                <Link href="/dashboard/settings/profile">
                  <Button variant="outline">Edit profile</Button>
                </Link>
              </div>

              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <div className="rounded-lg bg-zinc-50 p-3">
                  <p className="text-xs text-zinc-500">Communities</p>
                  <p className="mt-1 text-xl font-bold text-zinc-900">{identity.stats.communitiesJoined}</p>
                </div>
                <div className="rounded-lg bg-zinc-50 p-3">
                  <p className="text-xs text-zinc-500">Sessions attended</p>
                  <p className="mt-1 text-xl font-bold text-zinc-900">{identity.stats.sessionsAttended}</p>
                </div>
                <div className="rounded-lg bg-zinc-50 p-3">
                  <p className="text-xs text-zinc-500">Sessions hosted</p>
                  <p className="mt-1 text-xl font-bold text-zinc-900">{identity.stats.sessionsHosted}</p>
                </div>
                <div className="rounded-lg bg-zinc-50 p-3">
                  <p className="text-xs text-zinc-500">Contributions</p>
                  <p className="mt-1 text-xl font-bold text-zinc-900">{identity.stats.contributions}</p>
                </div>
              </div>

              {identity.communities.length > 0 && (
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-semibold text-zinc-900">Your communities</p>
                    <Link href="/dashboard/communities">
                      <Button variant="ghost" size="sm">View all</Button>
                    </Link>
                  </div>
                  <div className="grid gap-2 md:grid-cols-2">
                    {identity.communities.slice(0, 6).map((membership) => (
                      <Link
                        key={membership.membershipId}
                        href={`/dashboard/c/${membership.community.slug}`}
                        className="rounded-lg border border-zinc-200 p-3 hover:bg-zinc-50"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium text-zinc-900">{membership.community.name}</p>
                          <Badge variant="outline">{membership.role}</Badge>
                        </div>
                        <p className="mt-1 text-xs text-zinc-500">
                          {membership.community.membersCount} members
                          {membership.community.nextSession
                            ? ` · Next: ${formatDate(membership.community.nextSession.scheduledAt)} ${formatTime(membership.community.nextSession.scheduledAt)}`
                            : " · No upcoming session"}
                        </p>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {(hostScoreSystem || gamification) && (
          <Card className="border-zinc-200 bg-white">
            <CardContent className="p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Host OS</p>
                  {hostScoreSystem ? (
                    <h3 className="text-lg font-semibold text-zinc-900">{hostScoreSystem.hostScore}/100 · {hostScoreSystem.level}</h3>
                  ) : (
                    <h3 className="text-lg font-semibold text-zinc-900">Grow your weekly consistency</h3>
                  )}
                </div>
                {gamification?.streak ? (
                  <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">
                    <Flame className="h-3.5 w-3.5 mr-1" />
                    {gamification.streak.weeks} week streak
                  </Badge>
                ) : (
                  <Badge variant="outline">Community OS Brain</Badge>
                )}
              </div>

              {gamification && (
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-lg border border-orange-200 bg-orange-50 p-3">
                    <p className="text-xs text-orange-700">Streak</p>
                    <p className="mt-1 text-2xl font-bold text-orange-900">🔥 {gamification.streak.weeks}</p>
                    <p className="text-xs text-orange-800">
                      {gamification.streak.isActiveThisWeek
                        ? "You hosted this week — streak alive"
                        : "Host this week to keep the streak"}
                    </p>
                  </div>

                  <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 md:col-span-2">
                    <p className="text-xs font-medium text-zinc-500">This week goals</p>
                    <div className="mt-2 space-y-1.5">
                      {gamification.weeklyGoals.map((goal) => (
                        <p key={goal.key} className={`text-sm ${goal.completed ? "text-green-700" : "text-zinc-700"}`}>
                          {goal.completed ? "☑" : "☐"} {goal.label} ({Math.min(goal.current, goal.target)}/{goal.target})
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {gamification?.nextMilestone && (
                <div className="rounded-lg border border-purple-200 bg-purple-50 p-3">
                  <p className="text-xs font-medium text-purple-700">Next milestone</p>
                  <p className="mt-1 text-sm font-semibold text-purple-900">🎯 {gamification.nextMilestone.label}</p>
                  <p className="mt-1 text-xs text-purple-800">
                    Progress: {Math.min(gamification.nextMilestone.current, gamification.nextMilestone.target)} / {gamification.nextMilestone.target}
                  </p>
                  <Progress value={gamification.nextMilestone.progress} className="mt-2 h-1.5" />
                </div>
              )}

              {hostScoreSystem && (
                <>
                  <div className="grid gap-3 md:grid-cols-5">
                    {hostScoreSystem.components.map((component) => (
                      <div key={component.key} className="rounded-lg bg-zinc-50 p-3">
                        <p className="text-xs text-zinc-500">{component.label}</p>
                        <p className="mt-1 text-xl font-bold text-zinc-900">{component.score}</p>
                        <Progress value={component.score} className="mt-2 h-1.5" />
                      </div>
                    ))}
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    {hostScoreSystem.actions.slice(0, 2).map((action, idx) => (
                      <div key={`${action.title}-${idx}`} className="rounded-lg border border-zinc-200 p-3">
                        <p className="font-medium text-zinc-900">{action.title}</p>
                        <p className="mt-1 text-sm text-zinc-600">{action.description}</p>
                        <Link href={action.href} className="mt-2 inline-flex">
                          <Button size="sm" variant="outline">{action.cta}</Button>
                        </Link>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {aiPlaybook && aiPlaybook.recommendations.length > 0 && (
          <Card className="border-blue-200 bg-blue-50/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-blue-900">🧠 AI Recommendations</CardTitle>
              <CardDescription>
                Highest-impact actions for this week based on cadence, attendance, engagement and growth.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {aiPlaybook.recommendations.map((rec) => (
                <div key={rec.id} className="rounded-lg border border-blue-100 bg-white p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-zinc-900">{rec.title}</p>
                    <Badge
                      variant="outline"
                      className={`capitalize ${
                        rec.priority === "critical"
                          ? "border-red-300 text-red-700"
                          : rec.priority === "high"
                            ? "border-amber-300 text-amber-700"
                            : rec.priority === "medium"
                              ? "border-blue-300 text-blue-700"
                              : "border-zinc-300 text-zinc-700"
                      }`}
                    >
                      {rec.priority}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-zinc-700">{rec.problem}</p>
                  <p className="mt-1 text-sm text-zinc-600">→ {rec.action}</p>
                  <p className="mt-2 text-xs text-zinc-500">{rec.explainability}</p>
                  <Link href={rec.href} className="mt-2 inline-flex">
                    <Button size="sm" variant="outline">{rec.cta}</Button>
                  </Link>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {autopilot && (
          <Card className="border-emerald-200 bg-emerald-50/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-emerald-900">🤖 Autopilot Health</CardTitle>
              <CardDescription>
                End-to-end automation status for session loops.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <div className="rounded-lg border border-emerald-100 bg-white p-3">
                  <p className="text-xs text-zinc-500">Completion</p>
                  <p className="text-xl font-bold text-emerald-700">{autopilot.health.completionRate}%</p>
                </div>
                <div className="rounded-lg border border-emerald-100 bg-white p-3">
                  <p className="text-xs text-zinc-500">Queued</p>
                  <p className="text-xl font-bold text-zinc-900">{autopilot.health.queued}</p>
                </div>
                <div className="rounded-lg border border-emerald-100 bg-white p-3">
                  <p className="text-xs text-zinc-500">Failed</p>
                  <p className="text-xl font-bold text-zinc-900">{autopilot.health.failed}</p>
                </div>
                <div className="rounded-lg border border-emerald-100 bg-white p-3">
                  <p className="text-xs text-zinc-500">Total Jobs</p>
                  <p className="text-xl font-bold text-zinc-900">{autopilot.health.totalJobs}</p>
                </div>
              </div>

              {autopilot.queue.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Queue</p>
                  {autopilot.queue.slice(0, 5).map((job) => (
                    <div key={job.id} className="rounded-lg border border-emerald-100 bg-white p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-zinc-900">{job.sessionTitle}</p>
                        <Badge variant="outline" className="capitalize">{job.status}</Badge>
                      </div>
                      <p className="mt-1 text-xs text-zinc-600">{job.communityName} · {job.jobType.replaceAll("_", " ")}</p>
                      {job.runAt && <p className="mt-1 text-xs text-zinc-500">Run at: {new Date(job.runAt).toLocaleString()}</p>}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* MOTIVATION BAR */}
        {metrics && metrics.sessionsThisWeek >= 3 && (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-4 flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-amber-500" />
            <span className="text-amber-800 font-medium">
              🔥 {metrics.sessionsThisWeek} sessions happening this week. Your
              community engagement is on fire!
            </span>
          </div>
        )}

        {/* METRICS ROW */}
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-500">Communities</p>
                  <p className="text-3xl font-bold text-zinc-900">
                    {metrics?.communities || 0}
                  </p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-500">Members</p>
                  <p className="text-3xl font-bold text-zinc-900">
                    {metrics?.members || 0}
                  </p>
                  {metrics && metrics.newMembersThisWeek > 0 && (
                    <p className="text-xs text-green-600 mt-1">
                      +{metrics.newMembersThisWeek} this week
                    </p>
                  )}
                </div>
                <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-500">Sessions This Week</p>
                  <p className="text-3xl font-bold text-zinc-900">
                    {metrics?.sessionsThisWeek || 0}
                  </p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
                  <Video className="h-5 w-5 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-500">Revenue</p>
                  <p className="text-3xl font-bold text-zinc-900">$0</p>
                  <p className="text-xs text-zinc-400 mt-1">Coming soon</p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {communityOS && (
          <Card className="border-zinc-200 bg-white">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Community OS</p>
                  <h3 className="text-lg font-semibold text-zinc-900">Plan → Promote → Host → Capture → Reuse</h3>
                </div>
                <Badge variant="outline">This week</Badge>
              </div>

              <div className="grid gap-3 md:grid-cols-4">
                <div className="rounded-lg bg-zinc-50 p-3">
                  <p className="text-xs text-zinc-500">Sessions scheduled</p>
                  <p className="mt-1 text-2xl font-bold text-zinc-900">{communityOS.stats.sessionsScheduled}</p>
                </div>
                <div className="rounded-lg bg-zinc-50 p-3">
                  <p className="text-xs text-zinc-500">Questions submitted</p>
                  <p className="mt-1 text-2xl font-bold text-zinc-900">{communityOS.stats.questionsSubmitted}</p>
                </div>
                <div className="rounded-lg bg-zinc-50 p-3">
                  <p className="text-xs text-zinc-500">Recap posts</p>
                  <p className="mt-1 text-2xl font-bold text-zinc-900">{communityOS.stats.recapPosts}</p>
                </div>
                <div className="rounded-lg bg-zinc-50 p-3">
                  <p className="text-xs text-zinc-500">Recording views</p>
                  <p className="mt-1 text-2xl font-bold text-zinc-900">{communityOS.stats.recordingViews}</p>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div>
                  <p className="text-sm font-semibold text-zinc-900">Your weekly program</p>
                  <div className="mt-2 space-y-2">
                    {communityOS.weeklyProgram.length > 0 ? (
                      communityOS.weeklyProgram.slice(0, 3).map((session) => (
                        <div key={session.id} className="rounded-lg border border-zinc-200 p-3">
                          <p className="text-xs uppercase tracking-wide text-zinc-500">
                            {formatDate(session.scheduledAt)} · {formatTime(session.scheduledAt)}
                          </p>
                          <p className="mt-1 font-medium text-zinc-900">{session.title}</p>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-lg border border-dashed border-zinc-300 p-3 text-sm text-zinc-500">
                        No sessions this week yet.
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-zinc-900">{communityOS.playbook?.title || "This week plan"}</p>
                    {communityOS.playbook && (
                      <Badge variant="outline">
                        {communityOS.playbook.completedSteps}/{communityOS.playbook.totalSteps} completed
                      </Badge>
                    )}
                  </div>

                  {communityOS.playbook?.dynamicBanner && (
                    <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
                      <p className="text-sm font-semibold text-amber-900">
                        {communityOS.playbook.dynamicBanner.icon} {communityOS.playbook.dynamicBanner.title}
                      </p>
                      <p className="mt-1 text-xs text-amber-800">{communityOS.playbook.dynamicBanner.description}</p>
                      <Link href={communityOS.playbook.dynamicBanner.href} className="mt-2 inline-flex">
                        <Button size="sm" className="bg-amber-400 text-zinc-900 hover:bg-amber-300">
                          {communityOS.playbook.dynamicBanner.cta}
                        </Button>
                      </Link>
                    </div>
                  )}

                  <div className="mt-2 space-y-2 text-sm">
                    {(communityOS.playbook?.steps || []).map((step) => (
                      <div key={step.id} className="rounded-lg border border-zinc-200 p-2.5">
                        <p className={step.completed ? "text-green-700" : "text-zinc-700"}>
                          {step.completed ? "☑" : "☐"} <span className="font-medium">{step.day}</span> · {step.action}
                        </p>
                        <p className="mt-1 text-xs text-zinc-500">{step.description}</p>
                        {!step.completed && (
                          <Link href={step.href} className="mt-1 inline-flex">
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">{step.cta}</Button>
                          </Link>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {nextAction && (
          <Card className="border-purple-200 bg-purple-50/70">
            <CardContent className="p-5 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-purple-700">
                  Next recommended action
                </p>
                <h3 className="mt-1 text-lg font-semibold text-purple-950">{nextAction.title}</h3>
                <p className="mt-1 text-sm text-purple-800">{nextAction.description}</p>
              </div>
              <Link href={nextAction.href}>
                <Button className="bg-purple-600 hover:bg-purple-700">
                  {nextAction.cta}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {hostAlerts.length > 0 && (
          <div className="grid gap-3">
            {hostAlerts.map((alert, idx) => (
              <Card
                key={`${alert.title}-${idx}`}
                className={alert.type === "warning" ? "border-amber-300 bg-amber-50" : "border-blue-200 bg-blue-50"}
              >
                <CardContent className="p-4 flex items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className={alert.type === "warning" ? "h-5 w-5 text-amber-600 mt-0.5" : "h-5 w-5 text-blue-600 mt-0.5"} />
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-zinc-900">{alert.title}</p>
                        <Badge variant="outline" className="bg-white">
                          {alert.priority}
                        </Badge>
                        {alert.communityName && (
                          <Badge variant="secondary">{alert.communityName}</Badge>
                        )}
                      </div>
                      <p className="text-sm text-zinc-600">{alert.description}</p>
                    </div>
                  </div>
                  <Link href={alert.href}>
                    <Button variant="outline">{alert.cta}</Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {(topContributors.length > 0 || topAttendees.length > 0) && (
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Top Contributors</CardTitle>
                <CardDescription>By contribution points</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {topContributors.slice(0, 5).map((member, idx) => (
                  <div key={member.userId} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-semibold text-zinc-500 w-5">#{idx + 1}</span>
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={member.image || ""} />
                        <AvatarFallback>{member.name.slice(0, 1).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium text-zinc-900">{member.name}</span>
                    </div>
                    <span className="text-sm font-semibold text-purple-700">{member.score} pts</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Top Attendees</CardTitle>
                <CardDescription>By session participations</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {topAttendees.slice(0, 5).map((member, idx) => (
                  <div key={member.userId} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-semibold text-zinc-500 w-5">#{idx + 1}</span>
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={member.image || ""} />
                        <AvatarFallback>{member.name.slice(0, 1).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium text-zinc-900">{member.name}</span>
                    </div>
                    <span className="text-sm font-semibold text-blue-700">{member.score}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}

        {/* HERO SECTION - ONBOARDING OR GROWTH */}
        {!hasCommunity ? (
          <Card className="bg-gradient-to-br from-purple-600 to-purple-700 text-white border-none">
            <CardContent className="p-8">
              <div className="max-w-2xl">
                <div className="flex items-center gap-2 mb-4">
                  <Crown className="h-6 w-6" />
                  <span className="font-semibold">
                    Launch your community business 🚀
                  </span>
                </div>
                <h2 className="text-3xl font-bold mb-4">
                  Create your first community in under 2 minutes
                </h2>
                <p className="text-purple-100 mb-6">
                  Start with sessions. Build with content. Grow with community.
                </p>

                {/* Progress Bar */}
                <div className="space-y-4 mb-8">
                  <div className="flex items-center gap-4">
                    <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold">
                      1
                    </div>
                    <span className="text-purple-100">Create Community</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold">
                      2
                    </div>
                    <span className="text-purple-100">Invite Members</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold">
                      3
                    </div>
                    <span className="text-purple-100">Host First Session</span>
                  </div>
                </div>

                <Link href="/dashboard/communities/new">
                  <Button
                    size="lg"
                    className="bg-white text-purple-600 hover:bg-purple-50"
                  >
                    Create Your First Community
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>

                <div className="flex items-center gap-4 mt-4 text-sm text-purple-200">
                  <span>✓ Free to start</span>
                  <span>✓ No credit card</span>
                  <span>✓ Cancel anytime</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : performance && performance.growthRate > 0 ? (
          <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
            <CardContent className="p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="font-semibold text-green-900">
                    Your community grew {performance.growthRate}% this week!
                  </p>
                  <p className="text-green-600 text-sm">
                    Keep scheduling sessions to maintain momentum.
                  </p>
                </div>
              </div>
              <Link href="/dashboard/sessions/create">
                <Button className="bg-green-600 hover:bg-green-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Schedule Session
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : null}

        {/* ROW 1: QUICK ACTIONS + NEXT LIVE SESSION */}
        <div className="grid grid-cols-12 gap-6">
          {/* QUICK ACTIONS */}
          <div className="col-span-4">
            <Card className="h-full">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Quick Actions</CardTitle>
                <CardDescription>Drive your community growth</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Link href="/dashboard/sessions/create">
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-3 border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                  >
                    <Radio className="h-4 w-4" />
                    <span className="font-medium">Start Live Session</span>
                  </Button>
                </Link>

                <Link href="/dashboard/sessions/create">
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-3"
                  >
                    <Calendar className="h-4 w-4" />
                    Schedule Session
                  </Button>
                </Link>

                <Link href="/dashboard/communities">
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-3"
                  >
                    <UserPlus className="h-4 w-4" />
                    Invite Members
                  </Button>
                </Link>

                <Link href="/dashboard/courses/new">
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-3"
                  >
                    <BookOpen className="h-4 w-4" />
                    Create Course
                  </Button>
                </Link>

                <Link href="/dashboard/analytics">
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-3"
                  >
                    <BarChart3 className="h-4 w-4" />
                    View Analytics
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>

          {/* NEXT LIVE SESSION */}
          <div className="col-span-8">
            <Card className="h-full">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Next Live Session</CardTitle>
                    <CardDescription>
                      {nextSession
                        ? "Join your upcoming session"
                        : "Schedule your next session"}
                    </CardDescription>
                  </div>
                  {nextSession && (
                    <Badge
                      variant="secondary"
                      className="bg-amber-100 text-amber-700"
                    >
                      <Radio className="h-3 w-3 mr-1 animate-pulse" />
                      {nextSession.status === "LIVE" ? "LIVE NOW" : "UPCOMING"}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {nextSession ? (
                  <div className="flex items-start gap-4">
                    <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center">
                      <Video className="h-8 w-8 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">
                        {nextSession.title}
                      </h3>
                      <p className="text-zinc-500 text-sm mt-1">
                        {formatDate(nextSession.scheduledAt)} •{" "}
                        {formatTime(nextSession.scheduledAt)} •{" "}
                        {nextSession.duration} min
                      </p>
                      <div className="flex items-center gap-4 mt-3">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={nextSession.mentor?.image || ""} />
                            <AvatarFallback>
                              {nextSession.mentor?.name?.[0] || "H"}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm text-zinc-600">
                            {nextSession.mentor?.name}
                          </span>
                        </div>
                        <span className="text-sm text-zinc-500">
                          {nextSession.attendeeCount} members attending
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mt-4">
                        <Link
                          href={`/dashboard/sessions/${nextSession.id}/room`}
                        >
                          <Button className="bg-purple-600 hover:bg-purple-700">
                            <Play className="h-4 w-4 mr-2" />
                            {nextSession.status === "LIVE"
                              ? "Join Room"
                              : "Enter Room"}
                          </Button>
                        </Link>
                        <Link href={`/dashboard/sessions/${nextSession.id}`}>
                          <Button variant="outline">View Details</Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="h-16 w-16 rounded-full bg-zinc-100 flex items-center justify-center mx-auto mb-4">
                      <Calendar className="h-8 w-8 text-zinc-400" />
                    </div>
                    <p className="text-zinc-600 font-medium">
                      No sessions scheduled
                    </p>
                    <p className="text-zinc-400 text-sm mt-1">
                      Schedule your next session to keep your community engaged.
                    </p>
                    <Link href="/dashboard/sessions/create" className="mt-4">
                      <Button className="bg-purple-600 hover:bg-purple-700">
                        <Plus className="h-4 w-4 mr-2" />
                        Schedule Session
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ROW 2: UPCOMING SESSIONS + COMMUNITY ACTIVITY */}
        <div className="grid grid-cols-12 gap-6">
          {/* UPCOMING SESSIONS */}
          <div className="col-span-6">
            <Card className="h-full">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Upcoming Sessions</CardTitle>
                  <Link href="/dashboard/sessions">
                    <Button variant="ghost" size="sm">
                      View all
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {hasSessions ? (
                  <div className="space-y-4">
                    {upcomingSessions.slice(0, 4).map((session) => (
                      <div
                        key={session.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-zinc-50 hover:bg-zinc-100 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                            <Video className="h-5 w-5 text-purple-600" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">
                              {session.title}
                            </p>
                            <p className="text-xs text-zinc-500">
                              {formatDate(session.scheduledAt)} •{" "}
                              {formatTime(session.scheduledAt)} •{" "}
                              {session.communityName}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-zinc-500">
                            {session.attendeeCount} attending
                          </span>
                          <Link
                            href={`/dashboard/sessions/${session.id}/room`}
                          >
                            <Button size="sm" variant="ghost">
                              Join
                            </Button>
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-zinc-500">
                      No upcoming sessions scheduled.
                    </p>
                    <Link href="/dashboard/sessions/create">
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3"
                      >
                        Schedule your first session
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* COMMUNITY ACTIVITY */}
          <div className="col-span-6">
            <Card className="h-full">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Community Activity</CardTitle>
                  <Activity className="h-4 w-4 text-zinc-400" />
                </div>
              </CardHeader>
              <CardContent>
                {activities.length > 0 ? (
                  <div className="space-y-3">
                    {activities.map((activity) => (
                      <div
                        key={activity.id}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-50"
                      >
                        <div
                          className={`h-8 w-8 rounded-full flex items-center justify-center ${
                            activity.type === "member_joined"
                              ? "bg-blue-100"
                              : activity.type === "post_created"
                              ? "bg-green-100"
                              : "bg-purple-100"
                          }`}
                        >
                          {activity.type === "member_joined" ? (
                            <UserPlus className="h-4 w-4 text-blue-600" />
                          ) : activity.type === "post_created" ? (
                            <MessageSquare className="h-4 w-4 text-green-600" />
                          ) : (
                            <Play className="h-4 w-4 text-purple-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate">{activity.message}</p>
                          <p className="text-xs text-zinc-400">
                            {getTimeAgo(activity.time)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-zinc-400">
                    <Activity className="h-8 w-8 mx-auto mb-2" />
                    <p>No recent activity</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ROW 3: RECENT MEMBERS + PERFORMANCE SNAPSHOT */}
        <div className="grid grid-cols-12 gap-6">
          {/* RECENT MEMBERS */}
          <div className="col-span-6">
            <Card className="h-full">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Recent Members</CardTitle>
                  <Link href="/dashboard/communities">
                    <Button variant="ghost" size="sm">
                      Invite more
                      <UserPlus className="h-4 w-4 ml-1" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {recentMembers.length > 0 ? (
                  <div className="space-y-3">
                    {recentMembers.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-50"
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={member.image || ""} />
                          <AvatarFallback className="bg-purple-100 text-purple-600">
                            {member.name[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{member.name}</p>
                          <p className="text-xs text-zinc-500">
                            Joined {member.communityName} •{" "}
                            {getTimeAgo(member.joinedAt)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-zinc-400">
                    <Users className="h-8 w-8 mx-auto mb-2" />
                    <p>No new members yet</p>
                    <p className="text-sm">
                      Invite people to your community to get started.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* PERFORMANCE SNAPSHOT */}
          <div className="col-span-6">
            <Card className="h-full">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Community Performance</CardTitle>
                  <Zap className="h-4 w-4 text-amber-500" />
                </div>
              </CardHeader>
              <CardContent>
                {performance ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 rounded-lg bg-zinc-50">
                        <p className="text-2xl font-bold text-zinc-900">
                          {hostAnalytics?.sessionsHosted ?? performance.sessionsHosted}
                        </p>
                        <p className="text-sm text-zinc-500">Sessions hosted</p>
                      </div>
                      <div className="p-4 rounded-lg bg-zinc-50">
                        <p className="text-2xl font-bold text-zinc-900">
                          {hostAnalytics?.avgAttendance ?? 0}
                        </p>
                        <p className="text-sm text-zinc-500">Avg attendance</p>
                      </div>
                      <div className="p-4 rounded-lg bg-zinc-50">
                        <p className="text-2xl font-bold text-zinc-900">
                          {hostAnalytics?.recordingViews ?? 0}
                        </p>
                        <p className="text-sm text-zinc-500">Recording views</p>
                      </div>
                      <div className="p-4 rounded-lg bg-zinc-50">
                        <p className="text-2xl font-bold text-zinc-900">
                          {hostAnalytics?.activeMembers ?? performance.newMembersThisWeek}
                        </p>
                        <p className="text-sm text-zinc-500">Active members (30d)</p>
                      </div>
                    </div>
                    <div className="p-4 rounded-lg bg-zinc-50 space-y-3">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-zinc-600">Growth rate</span>
                          <span
                            className={`font-semibold ${
                              performance.growthRate >= 0
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            {performance.growthRate >= 0 ? "+" : ""}
                            {performance.growthRate}%
                          </span>
                        </div>
                        <Progress
                          value={Math.max(0, Math.min(100, performance.growthRate))}
                          className="h-2"
                        />
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-zinc-600">RSVP → Attendance</span>
                        <span className="font-semibold text-zinc-900">
                          {hostAnalytics?.rsvpToAttendanceRate ?? 0}%
                        </span>
                      </div>
                    </div>
                    <Link href="/dashboard/analytics">
                      <Button variant="outline" className="w-full">
                        <BarChart3 className="h-4 w-4 mr-2" />
                        View full analytics
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="text-center py-8 text-zinc-400">
                    <BarChart3 className="h-8 w-8 mx-auto mb-2" />
                    <p>Performance data loading...</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
          </div>
        </details>
      </div>
    </div>
  );
}
