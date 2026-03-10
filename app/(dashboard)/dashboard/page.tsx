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
  Clock,
  Play,
  CheckCircle2,
  Sparkles,
  Building2,
  DollarSign,
  BarChart3,
  ArrowRight,
  ChevronRight,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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

  // Determine next best action based on user state
  const getNextBestAction = () => {
    if (!metrics) return null;
    
    if (metrics.communities === 0) {
      return {
        title: "Create your first community",
        description: "Start building your community business today",
        action: "Create Community",
        link: "/dashboard/communities",
        priority: "high",
      };
    }
    
    if (metrics.members === 0) {
      return {
        title: "Invite your first members",
        description: "Your community is ready. Time to bring people in!",
        action: "Invite Members",
        link: "/dashboard/communities",
        priority: "high",
      };
    }
    
    if (metrics.revenue === 0) {
      return {
        title: "Turn on paid memberships",
        description: "Start monetizing your community with paid plans",
        action: "Set Up Pricing",
        link: "/dashboard/settings/billing",
        priority: "medium",
      };
    }
    
    return {
      title: "Schedule your next live session",
      description: "Keep your community engaged with live content",
      action: "Schedule Session",
      link: "/dashboard/sessions",
      priority: "medium",
    };
  };

  const nextAction = getNextBestAction();

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

      {/* Next Best Action - Host Priority #2 */}
      {nextAction && (
        <Card className="mb-8 border-primary/20 bg-primary/5">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                  <Target className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{nextAction.title}</h3>
                  <p className="text-muted-foreground">{nextAction.description}</p>
                </div>
              </div>
              <Link href={nextAction.link}>
                <Button className="gap-2">
                  {nextAction.action}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Quick Actions & Navigation */}
        <div className="space-y-6">
          {/* Quick Actions - Host Focused */}
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

          {/* Upcoming Events */}
          {events.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-foreground">Upcoming</h3>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {events.slice(0, 3).map((event) => (
                  <div key={event.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      {event.type === "session" ? (
                        <Video className="h-5 w-5 text-primary" />
                      ) : event.type === "live" ? (
                        <Play className="h-5 w-5 text-primary" />
                      ) : (
                        <Clock className="h-5 w-5 text-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{event.title}</p>
                      <p className="text-xs text-muted-foreground">{event.community}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">{event.time}</span>
                        {event.attendees && (
                          <>
                            <span className="text-muted-foreground">•</span>
                            <span className="text-xs text-muted-foreground">{event.attendees} attending</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                <Link href="/dashboard/sessions">
                  <Button variant="ghost" size="sm" className="w-full text-primary">
                    View All Sessions
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Main Content - Recent Activity */}
        <div className="lg:col-span-2 space-y-6">
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
                <div className="text-center py-8">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                    <BarChart3 className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">No activity yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Start building your community to see activity here!
                  </p>
                  <Link href="/dashboard/communities">
                    <Button>Create Community</Button>
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

          {/* Getting Started Guide */}
          {!metrics || metrics.communities === 0 ? (
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Getting Started
                </CardTitle>
                <CardDescription>Follow these steps to launch your community</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                      1
                    </div>
                    <div>
                      <p className="font-medium">Create your community</p>
                      <p className="text-sm text-muted-foreground">Set up your community name, description, and branding</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-sm font-bold flex-shrink-0">
                      2
                    </div>
                    <div>
                      <p className="font-medium text-muted-foreground">Invite your first members</p>
                      <p className="text-sm text-muted-foreground">Share your community link or invite people directly</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-sm font-bold flex-shrink-0">
                      3
                    </div>
                    <div>
                      <p className="font-medium text-muted-foreground">Publish your first content</p>
                      <p className="text-sm text-muted-foreground">Create a post, course, or schedule a live session</p>
                    </div>
                  </div>
                </div>
                <Link href="/dashboard/communities" className="mt-6 block">
                  <Button className="w-full">
                    Start Step 1: Create Community
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
