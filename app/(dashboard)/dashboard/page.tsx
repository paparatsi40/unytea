"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useCurrentUser } from "@/hooks/use-current-user";
import {
  Users,
  BookOpen,
  Video,
  Calendar,
  Plus,
  MessageSquare,
  Play,
  CheckCircle2,
  Sparkles,
  Building2,
  DollarSign,
  BarChart3,
  ArrowRight,
  Target,
  Rocket,
  Crown,
  Zap,
  TrendingUp,
  Award,
  Share2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ShareableMetrics } from "@/components/dashboard/ShareableMetrics";
import Link from "next/link";

// Types
interface BusinessMetrics {
  communities: number;
  members: number;
  revenue: number;
  engagement: number;
}

interface RecentActivity {
  id: string;
  type: "member_joined" | "course_completed" | "post_created" | "session_scheduled" | "revenue";
  description: string;
  time: string;
  value?: string;
}

interface UpcomingEvent {
  id: string;
  title: string;
  type: "session" | "live" | "deadline";
  time: string;
  community: string;
  attendees?: number;
}

interface OnboardingStep {
  number: number;
  title: string;
  description: string;
  action: string;
  link: string;
  icon: any;
  completed: boolean;
  active: boolean;
}

export default function DashboardPage() {
  const { user } = useCurrentUser();
  const t = useTranslations("dashboard");
  const [metrics, setMetrics] = useState<BusinessMetrics | null>(null);
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [events, setEvents] = useState<UpcomingEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load dashboard data
  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      
      // Load business metrics
      const metricsRes = await fetch("/api/dashboard/metrics");
      if (metricsRes.ok) {
        const metricsData = await metricsRes.json();
        setMetrics(metricsData);
      }

      // Load recent activity
      const activityRes = await fetch("/api/dashboard/activity");
      if (activityRes.ok) {
        const activityData = await activityRes.json();
        setActivities(activityData.activities || []);
      }

      // Load upcoming events
      const eventsRes = await fetch("/api/dashboard/events");
      if (eventsRes.ok) {
        const eventsData = await eventsRes.json();
        setEvents(eventsData.events || []);
      }
    } catch (error) {
      console.error("Error loading dashboard:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Generate onboarding steps based on user progress
  const getOnboardingSteps = (): OnboardingStep[] => {
    if (!metrics) return [];

    const steps: OnboardingStep[] = [
      {
        number: 1,
        title: "Create your community",
        description: "Set up your community name, description, and branding",
        action: "Create Community",
        link: "/dashboard/communities",
        icon: Building2,
        completed: metrics.communities > 0,
        active: metrics.communities === 0,
      },
      {
        number: 2,
        title: "Invite your first members",
        description: "Share your community link or invite people directly",
        action: "Invite Members",
        link: "/dashboard/communities",
        icon: Users,
        completed: metrics.members > 0,
        active: metrics.communities > 0 && metrics.members === 0,
      },
      {
        number: 3,
        title: "Publish your first content",
        description: "Create a post, course, or schedule a live session",
        action: "Create Content",
        link: "/dashboard/communities",
        icon: Zap,
        completed: metrics.members > 0 && activities.length > 0,
        active: metrics.members > 0,
      },
    ];

    return steps;
  };

  // Get celebration message based on progress
  const getCelebrationMessage = () => {
    if (!metrics) return null;

    if (metrics.communities === 0) return null;
    
    if (metrics.members === 0) {
      return {
        title: "Your community is live! 🎉",
        subtitle: "Now invite your first members",
        icon: Rocket,
        color: "from-green-500 to-emerald-600",
      };
    }
    
    if (metrics.revenue === 0) {
      return {
        title: "Your community is growing! 📈",
        subtitle: "Time to monetize with paid plans",
        icon: TrendingUp,
        color: "from-blue-500 to-indigo-600",
      };
    }

    return {
      title: "Your community business is thriving! 🚀",
      subtitle: "Keep the momentum with live sessions",
      icon: Crown,
      color: "from-purple-500 to-pink-600",
    };
  };

  const steps = getOnboardingSteps();
  const celebration = getCelebrationMessage();
  const activeStep = steps.find(s => s.active);
  const completedSteps = steps.filter(s => s.completed).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">
          {t("welcome")}{user?.name ? `, ${user.name.split(' ')[0]}` : ''}! 👋
        </h1>
        <p className="mt-2 text-muted-foreground">
          Here's how your community business is performing today.
        </p>
      </div>

      {/* Business Metrics - Host Priority #1 */}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Communities</p>
                  <p className="text-2xl font-bold">{metrics.communities}</p>
                </div>
                <Building2 className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Members</p>
                  <p className="text-2xl font-bold">{metrics.members}</p>
                </div>
                <Users className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Revenue</p>
                  <p className="text-2xl font-bold">${metrics.revenue.toLocaleString()}</p>
                </div>
                <DollarSign className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Engagement</p>
                  <p className="text-2xl font-bold">{metrics.engagement}%</p>
                </div>
                <BarChart3 className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* MAIN CONTENT - Stacked layout for better activation */}
      <div className="space-y-6">
        
        {/* ROW 1: Launch Your Community - Full Width Dominant */}
        {metrics?.communities === 0 ? (
          // NO COMMUNITY - Full width dominant CTA
          <Card className="border-2 border-primary/30 shadow-xl shadow-primary/10 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-primary/20 to-purple-500/20 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-amber-400/20 to-orange-500/20 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl"></div>
            
            <CardContent className="p-10 md:p-12 relative">
              <div className="max-w-2xl mx-auto text-center">
                {/* Large Icon */}
                <div className="w-24 h-24 mx-auto mb-8 rounded-2xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-xl shadow-primary/30">
                  <Rocket className="h-12 w-12 text-white" />
                </div>
                
                {/* Main Headline */}
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  Launch your community business
                </h2>
                <p className="text-xl text-muted-foreground mb-3">
                  Create your first community in under 2 minutes
                </p>
                <p className="text-base text-muted-foreground mb-10 max-w-lg mx-auto">
                  Join creators building thriving communities with live sessions, courses, and engaged members.
                </p>
                
                {/* Progress Steps */}
                <div className="bg-muted/30 rounded-2xl p-6 mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-medium text-muted-foreground">Launch Progress</span>
                    <span className="text-sm font-bold text-primary">0%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden mb-6">
                    <div className="h-full bg-gradient-to-r from-primary to-purple-500 rounded-full transition-all duration-500" style={{ width: '0%' }} />
                  </div>
                  
                  {/* Steps */}
                  <div className="grid md:grid-cols-3 gap-4 text-left">
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-primary/10 border border-primary/20">
                      <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                        1
                      </div>
                      <div>
                        <p className="font-semibold text-sm">Create community</p>
                        <p className="text-xs text-muted-foreground">Next step →</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/50 opacity-60">
                      <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-sm font-bold flex-shrink-0">
                        2
                      </div>
                      <div>
                        <p className="font-semibold text-sm">Invite members</p>
                        <p className="text-xs text-muted-foreground">Pending</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/50 opacity-60">
                      <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-sm font-bold flex-shrink-0">
                        3
                      </div>
                      <div>
                        <p className="font-semibold text-sm">Host live session</p>
                        <p className="text-xs text-muted-foreground">Pending</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* CTA Button */}
                <Link href="/dashboard/communities" className="inline-block">
                  <Button size="lg" className="gap-2 px-10 py-7 text-lg shadow-xl shadow-primary/25 hover:shadow-2xl hover:shadow-primary/30 transition-all">
                    <Plus className="h-5 w-5" />
                    Start Your Community
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </Link>
                
                {/* Trust indicators */}
                <div className="flex items-center justify-center gap-8 mt-8 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Free to start
                  </span>
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    No credit card
                  </span>
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Cancel anytime
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          // HAS COMMUNITY - Show progress with completion status
          <Card className="border-primary/20">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Target className="h-5 w-5 text-primary" />
                    {completedSteps === steps.length ? "🎉 All Steps Complete!" : `Launch Progress: ${Math.round((completedSteps / steps.length) * 100)}%`}
                  </CardTitle>
                  <CardDescription>
                    {completedSteps === steps.length 
                      ? "You've successfully launched your community business!" 
                      : `Step ${activeStep?.number || completedSteps + 1} of ${steps.length}: ${activeStep?.title || steps[completedSteps]?.title}`}
                  </CardDescription>
                </div>
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-lg font-bold text-primary">{completedSteps}/{steps.length}</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Progress Bar */}
              <div className="mb-6">
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-primary via-purple-500 to-pink-500 rounded-full transition-all duration-500"
                    style={{ width: `${(completedSteps / steps.length) * 100}%` }}
                  />
                </div>
              </div>

              {/* Steps Grid */}
              <div className="grid md:grid-cols-3 gap-4">
                {steps.map((step) => (
                  <div 
                    key={step.number}
                    className={`flex items-start gap-3 p-4 rounded-xl transition-all ${
                      step.completed 
                        ? "bg-green-50 border border-green-200" 
                        : step.active
                          ? "bg-gradient-to-r from-primary/10 to-purple-50 border-2 border-primary/30 shadow-md"
                          : "bg-muted/30 opacity-70"
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                      step.completed 
                        ? "bg-green-500 text-white" 
                        : step.active
                          ? "bg-primary text-white shadow-lg shadow-primary/25"
                          : "bg-muted text-muted-foreground"
                    }`}>
                      {step.completed ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : (
                        <span className="font-bold">{step.number}</span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className={`font-semibold ${
                        step.completed ? "text-green-700" : 
                        step.active ? "text-primary" : "text-muted-foreground"
                      }`}>
                        {step.title}
                      </h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        {step.description}
                      </p>
                      {(step.active || (!step.completed && !steps.some(s => s.active))) && (
                        <Link href={step.link} className="mt-2 inline-block">
                          <Button size="sm" variant={step.active ? "default" : "outline"}>
                            {step.action}
                            <ArrowRight className="h-3 w-3 ml-1" />
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

          {/* Celebration Card - Shows when milestones reached */}
          {celebration && (
            <Card className={`bg-gradient-to-r ${celebration.color} text-white border-0 shadow-lg`}>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                    <celebration.icon className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{celebration.title}</h3>
                    <p className="text-white/90">{celebration.subtitle}</p>
                    {activeStep && (
                      <Link href={activeStep.link} className="mt-3 inline-block">
                        <Button 
                          variant="secondary" 
                          size="sm"
                          className="bg-white text-gray-900 hover:bg-white/90"
                        >
                          {activeStep.action}
                          <ArrowRight className="h-4 w-4 ml-1" />
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Share Your Success - Growth Loop */}
          {metrics && metrics.communities > 0 && (
            <Card className="border-amber-200 bg-gradient-to-br from-amber-50/50 to-white">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                    <Share2 className="h-4 w-4 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Share Your Success</h3>
                    <p className="text-xs text-muted-foreground">Grow your community organically</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Your community metrics are worth sharing. Post your progress to attract new members and inspire other creators.
                </p>
                <ShareableMetrics
                  communities={metrics.communities}
                  members={metrics.members}
                  revenue={metrics.revenue}
                  engagement={metrics.engagement}
                  communityName={metrics.communities > 0 ? "My Community" : "My Community"}
                />
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          <Card>
            <CardHeader className="pb-3">
              <h3 className="font-semibold text-foreground">Quick Actions</h3>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href="/dashboard/communities">
                <Button variant="outline" className="w-full justify-start gap-2 hover:bg-primary/10 hover:border-primary/30 transition-all">
                  <Plus className="h-4 w-4" />
                  Create Community
                </Button>
              </Link>
              <Link href="/dashboard/communities">
                <Button variant="outline" className="w-full justify-start gap-2 hover:bg-green-50 hover:border-green-200 transition-all">
                  <Users className="h-4 w-4" />
                  Invite Members
                </Button>
              </Link>
              <Link href="/dashboard/courses/create">
                <Button variant="outline" className="w-full justify-start gap-2 hover:bg-orange-50 hover:border-orange-200 transition-all">
                  <BookOpen className="h-4 w-4" />
                  Create Course
                </Button>
              </Link>
              <Link href="/dashboard/sessions">
                <Button variant="outline" className="w-full justify-start gap-2 hover:bg-purple-50 hover:border-purple-200 transition-all">
                  <Video className="h-4 w-4" />
                  Start Live Session
                </Button>
              </Link>
              <Link href="/dashboard/analytics">
                <Button variant="outline" className="w-full justify-start gap-2 hover:bg-blue-50 hover:border-blue-200 transition-all">
                  <BarChart3 className="h-4 w-4" />
                  View Analytics
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Upcoming Live Sessions - Highlighted */}
          <Card className="border-purple-200 bg-gradient-to-br from-purple-50/50 to-white">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                    <Play className="h-4 w-4 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Upcoming Live</h3>
                    <p className="text-xs text-muted-foreground">Your next sessions</p>
                  </div>
                </div>
                <Link href="/dashboard/sessions">
                  <Button variant="ghost" size="sm" className="text-purple-600">
                    View All
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {events.length > 0 ? (
                <div className="space-y-3">
                  {events.slice(0, 2).map((event) => (
                    <div key={event.id} className="flex items-start gap-3 p-3 rounded-xl bg-white border border-purple-100 shadow-sm hover:shadow-md transition-all">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        event.type === "live" 
                          ? "bg-red-100 text-red-600 animate-pulse" 
                          : "bg-purple-100 text-purple-600"
                      }`}>
                        {event.type === "live" ? (
                          <Play className="h-5 w-5 fill-current" />
                        ) : (
                          <Video className="h-5 w-5" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm truncate">{event.title}</p>
                          {event.type === "live" && (
                            <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-medium">
                              LIVE
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{event.community}</p>
                        <div className="flex items-center gap-3 mt-1.5">
                          <span className="text-xs font-medium text-purple-600">{event.time}</span>
                          {event.attendees && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {event.attendees} attending
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-3">
                    <Calendar className="h-6 w-6 text-purple-600" />
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">No upcoming sessions</p>
                  <Link href="/dashboard/sessions">
                    <Button size="sm" variant="outline" className="border-purple-200 text-purple-600">
                      Schedule One
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ROW 2: Two Column Layout - Quick Actions & Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Quick Actions */}
          <div className="space-y-6">
          {/* Recent Activity Feed */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>What's happening in your communities</CardDescription>
                </div>
                <Button variant="outline" size="sm">View All</Button>
              </div>
            </CardHeader>
            <CardContent>
              {activities.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Sparkles className="h-10 w-10 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">Your community activity will appear here</h3>
                  <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                    Once members start joining and engaging, you'll see their activity in real-time.
                  </p>
                  <Link href="/dashboard/communities">
                    <Button size="lg" className="gap-2">
                      <Plus className="h-5 w-5" />
                      Create Your Community
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {activities.slice(0, 5).map((activity) => (
                    <div key={activity.id} className="flex items-start gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                        activity.type === "member_joined" ? "bg-green-100" :
                        activity.type === "revenue" ? "bg-purple-100" :
                        activity.type === "course_completed" ? "bg-blue-100" :
                        "bg-orange-100"
                      }`}>
                        {activity.type === "member_joined" ? (
                          <Users className="h-5 w-5 text-green-600" />
                        ) : activity.type === "revenue" ? (
                          <DollarSign className="h-5 w-5 text-purple-600" />
                        ) : activity.type === "course_completed" ? (
                          <CheckCircle2 className="h-5 w-5 text-blue-600" />
                        ) : activity.type === "session_scheduled" ? (
                          <Video className="h-5 w-5 text-orange-600" />
                        ) : (
                          <MessageSquare className="h-5 w-5 text-orange-600" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm">{activity.description}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">{activity.time}</span>
                          {activity.value && (
                            <>
                              <span className="text-muted-foreground">•</span>
                              <span className="text-xs font-medium text-green-600">{activity.value}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Achievement/Gamification Section - Optional */}
          {completedSteps > 0 && (
            <Card className="bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center shadow-lg shadow-amber-200">
                    <Award className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-amber-900">Community Builder</h3>
                    <p className="text-amber-700">You've completed {completedSteps} milestones!</p>
                    <div className="flex items-center gap-2 mt-2">
                      {steps.filter(s => s.completed).map((s) => (
                        <div key={s.number} className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs font-bold">
                          {s.number}
                        </div>
                      ))}
                      {steps.filter(s => !s.completed).map((s) => (
                        <div key={s.number} className="w-8 h-8 rounded-full bg-amber-200 text-amber-600 flex items-center justify-center text-xs font-bold">
                          {s.number}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}