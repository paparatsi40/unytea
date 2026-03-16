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
import {
  getDashboardMetrics,
  getNextLiveSession,
  getUpcomingSessions,
  getCommunityActivity,
  getRecentMembers,
  getPerformanceSnapshot,
  getHostAnalyticsV1,
  getNextRecommendedAction,
} from "@/app/actions/dashboard";
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
  const [isLoading, setIsLoading] = useState(true);

  // Load dashboard data
  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);

      const [
        metricsRes,
        nextSessionRes,
        upcomingRes,
        activityRes,
        membersRes,
        performanceRes,
        hostAnalyticsRes,
        nextActionRes,
      ] = await Promise.all([
        getDashboardMetrics(),
        getNextLiveSession(),
        getUpcomingSessions(5),
        getCommunityActivity(6),
        getRecentMembers(4),
        getPerformanceSnapshot(),
        getHostAnalyticsV1(),
        getNextRecommendedAction(),
      ]);

      if (metricsRes.success) setMetrics(metricsRes.metrics || null);
      if (nextSessionRes.success) setNextSession(nextSessionRes.session ?? null);
      if (upcomingRes.success) setUpcomingSessions(upcomingRes.sessions || []);
      if (activityRes.success) setActivities(activityRes.activities || []);
      if (membersRes.success) setRecentMembers(membersRes.members || []);
      if (performanceRes.success) setPerformance(performanceRes.snapshot || null);
      if (hostAnalyticsRes.success) setHostAnalytics(hostAnalyticsRes.analytics || null);
      if (nextActionRes.success) setNextAction(nextActionRes.recommendation || null);
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-200 border-t-purple-600" />
          <p className="text-zinc-500">Loading your dashboard...</p>
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
                    <div className="p-4 rounded-lg bg-zinc-50">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-zinc-600">
                          Growth rate
                        </span>
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
    </div>
  );
}
