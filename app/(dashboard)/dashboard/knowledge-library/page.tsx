"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  BookOpen,
  Video,
  Users,
  GraduationCap,
  ArrowRight,
  Loader2,
  Sparkles,
  PlayCircle,
  TrendingUp,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useCurrentUser } from "@/hooks/use-current-user";
import { toast } from "sonner";
import {
  getKnowledgeImpact,
  analyzeCoursePotential,
  getConvertibleSessions,
} from "@/app/actions/knowledge-library";
import { CreateCourseFromSessionsDialog } from "@/components/knowledge-library/CreateCourseFromSessionsDialog";

interface KnowledgeStats {
  totalSessions: number;
  completedSessions: number;
  totalAttendees: number;
  totalCourses: number;
  coursesFromSessions: number;
  totalEnrollments: number;
  totalLessons: number;
  conversionRate: number;
}

interface CourseSuggestion {
  title: string;
  sessionCount: number;
  sessions: any[];
  totalDuration: number;
  totalAttendees: number;
  potentialStudents: number;
  avgEngagement: number;
}

interface ConvertibleSession {
  id: string;
  title: string;
  description: string | null;
  scheduledAt: Date;
  duration: number;
  mode: string;
  community: { id: string; name: string; slug: string } | null;
  series: { id: string; title: string } | null;
  _count: { participations: number; resources: number };
  engagementScore: number;
}

export default function KnowledgeLibraryPage() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useCurrentUser();
  const [stats, setStats] = useState<KnowledgeStats | null>(null);
  const [suggestions, setSuggestions] = useState<CourseSuggestion[]>([]);
  const [sessions, setSessions] = useState<ConvertibleSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.push("/auth/signin");
      return;
    }

    if (!isAuthLoading && user) {
      loadData();
    }
  }, [user, isAuthLoading, router]);

  async function loadData() {
    setLoading(true);
    try {
      const [impactResult, potentialResult, sessionsResult] = await Promise.all([
        getKnowledgeImpact(),
        analyzeCoursePotential(),
        getConvertibleSessions(),
      ]);

      if (impactResult.success && impactResult.stats) {
        setStats(impactResult.stats);
      }

      if (potentialResult.success) {
        setSuggestions(potentialResult.suggestions || []);
      }

      if (sessionsResult.success) {
        setSessions(sessionsResult.sessions || []);
      }
    } catch (error) {
      console.error("Error loading knowledge library:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  }

  if (isAuthLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
          <p className="text-muted-foreground">Loading your knowledge library...</p>
        </div>
      </div>
    );
  }

  const hasConvertibleSessions = sessions.length > 0;
  const hasSuggestions = suggestions.length > 0;
  const hasRecordedSessions = (stats?.completedSessions || 0) > 0;

  const bestSessions = [...sessions]
    .sort((a, b) => (b.engagementScore || 0) - (a.engagementScore || 0))
    .slice(0, 3);

  const curatedRecordings = [...sessions]
    .sort((a, b) => (b._count?.participations || 0) - (a._count?.participations || 0))
    .slice(0, 5);

  const keyTopics = Object.entries(
    sessions.reduce((acc, session) => {
      const title = (session.title || "").toLowerCase();
      const candidates = [
        "marketing",
        "sales",
        "product",
        "engineering",
        "leadership",
        "finance",
        "strategy",
        "operations",
        "ai",
      ];

      for (const topic of candidates) {
        if (title.includes(topic)) {
          acc[topic] = (acc[topic] || 0) + 1;
        }
      }

      return acc;
    }, {} as Record<string, number>)
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  return (
    <div className="min-h-screen bg-background">
      {/* HEADER */}
      <header className="border-b border-border bg-card/50 px-6 py-6">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <BookOpen className="h-6 w-6 text-purple-500" />
                Knowledge Library
              </h1>
              <p className="mt-1 text-muted-foreground">
                Turn your live sessions into scalable education
              </p>
            </div>
            <Button
              onClick={() => setShowCreateDialog(true)}
              className="bg-purple-600 hover:bg-purple-700 gap-2 text-white"
              disabled={!hasConvertibleSessions}
            >
              <Sparkles className="h-4 w-4" />
              Build a Course from Sessions
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl p-6">
        {/* CTA CARDS - Growth Driven */}
        {hasSuggestions && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" />
              Course Potential
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {suggestions.map((suggestion, index) => (
                <Card
                  key={index}
                  className="bg-card border-border hover:border-purple-500/50 transition-all cursor-pointer group"
                  onClick={() => setShowCreateDialog(true)}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-foreground group-hover:text-purple-400 transition-colors">
                          {suggestion.title}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {suggestion.sessionCount} sessions • {Math.round(suggestion.totalDuration / 60)}h total
                        </p>
                      </div>
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-500/10 text-purple-500">
                        <TrendingUp className="h-5 w-5" />
                      </div>
                    </div>
                    
                    <div className="mt-4 space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Potential students</span>
                        <span className="font-medium text-foreground">{suggestion.potentialStudents}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Total attendees</span>
                        <span className="font-medium text-foreground">{suggestion.totalAttendees}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Engagement score</span>
                        <span className="font-medium text-green-400">{suggestion.avgEngagement}/100</span>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      className="w-full mt-4 text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
                    >
                      Create Course
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* KNOWLEDGE IMPACT STATS */}
        {stats && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-foreground mb-4">Your Knowledge Impact</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card className="bg-card border-border">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10 text-blue-500">
                      <Video className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{stats.completedSessions}</p>
                      <p className="text-sm text-muted-foreground">Sessions recorded</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-500/10 text-purple-500">
                      <GraduationCap className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{stats.coursesFromSessions}</p>
                      <p className="text-sm text-muted-foreground">Courses created</p>
                    </div>
                  </div>
                  {stats?.totalCourses > 0 && (
                    <div className="mt-3">
                      <Progress 
                        value={stats?.conversionRate} 
                        className="h-1.5 bg-muted"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        {stats?.conversionRate}% conversion rate
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/10 text-green-500">
                      <Users className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{stats.totalEnrollments}</p>
                      <p className="text-sm text-muted-foreground">Students learning</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10 text-amber-500">
                      <PlayCircle className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{stats.totalLessons}</p>
                      <p className="text-sm text-muted-foreground">Lessons created</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>
        )}

        {/* CURATED DISCOVERY */}
        {hasConvertibleSessions && (
          <section className="mb-8 grid gap-4 md:grid-cols-3">
            <Card className="bg-card border-border md:col-span-2">
              <CardContent className="p-5">
                <h2 className="text-lg font-semibold text-foreground mb-3">Best Sessions</h2>
                <div className="space-y-3">
                  {bestSessions.map((session) => (
                    <div key={session.id} className="flex items-center justify-between rounded-lg border border-border bg-card/60 px-3 py-2">
                      <div>
                        <p className="font-medium text-foreground">{session.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {session.community?.name || "Community"} • {session._count.participations} attendees
                        </p>
                      </div>
                      <Link href={`/dashboard/sessions/${session.id}`}>
                        <Button variant="ghost" size="sm" className="text-purple-400">Open</Button>
                      </Link>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardContent className="p-5">
                <h2 className="text-lg font-semibold text-foreground mb-3">Key Topics</h2>
                <div className="flex flex-wrap gap-2">
                  {keyTopics.length > 0 ? (
                    keyTopics.map(([topic, count]) => (
                      <Badge key={topic} variant="secondary" className="bg-muted text-foreground">
                        {topic} ({count})
                      </Badge>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">Topics will appear as sessions accumulate.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        {hasConvertibleSessions && (
          <section className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">Curated Recordings</h2>
              <Link href="/dashboard/recordings">
                <Button variant="outline" size="sm" className="border-border text-foreground">View recordings</Button>
              </Link>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {curatedRecordings.map((session) => (
                <Card key={session.id} className="bg-card border-border">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">{session.title}</p>
                      <p className="text-xs text-muted-foreground">{session._count.participations} attendees • {session.duration} min</p>
                    </div>
                    <Link href={`/dashboard/sessions/${session.id}`}>
                      <Button variant="ghost" size="sm" className="text-purple-400">Watch</Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* CONVERTIBLE SESSIONS */}
        {hasConvertibleSessions && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">
                Sessions Ready to Convert
              </h2>
              <Button
                variant="outline"
                size="sm"
                className="border-border text-foreground"
                onClick={() => setShowCreateDialog(true)}
              >
                <Plus className="h-4 w-4 mr-1" />
                Select Multiple
              </Button>
            </div>

            <div className="grid gap-3">
              {sessions.slice(0, 6).map((session) => (
                <Card
                  key={session.id}
                  className="bg-card border-border hover:border-border transition-colors"
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                          {session.mode === "AUDIO" ? (
                            <span className="text-blue-400 text-xs font-medium">AUDIO</span>
                          ) : (
                            <Video className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <h3 className="font-medium text-foreground">{session.title}</h3>
                          <p className="text-sm text-muted-foreground">
                            {session.community?.name} • {session.duration} min • {session._count.participations} attendees
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-sm font-medium text-foreground">
                            Score: {session.engagementScore}/100
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(session.scheduledAt).toLocaleDateString()}
                          </p>
                        </div>
                        <Link href={`/dashboard/sessions/${session.id}`}>
                          <Button variant="ghost" size="sm" className="text-purple-400">
                            View
                            <ArrowRight className="ml-1 h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {sessions.length > 6 && (
              <div className="mt-4 text-center">
                <Button
                  variant="outline"
                  className="border-border text-muted-foreground"
                  onClick={() => setShowCreateDialog(true)}
                >
                  View all {sessions.length} sessions
                </Button>
              </div>
            )}
          </section>
        )}

        {/* EMPTY STATE */}
        {!hasConvertibleSessions && !loading && (
          <Card className="bg-card border-border">
            <CardContent className="p-12 text-center">
              <div className="flex justify-center mb-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                  <Video className="h-8 w-8 text-muted-foreground" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {hasRecordedSessions ? "No convertible recordings yet" : "No sessions to convert yet"}
              </h3>
              <p className="text-muted-foreground max-w-md mx-auto mb-6">
                {hasRecordedSessions
                  ? "You already have completed sessions. Open Recordings to review status and convert those ready for courses."
                  : "Complete live sessions with recordings will appear here, ready to be turned into courses."}
              </p>
              <Link href={hasRecordedSessions ? "/dashboard/recordings" : "/dashboard/sessions"}>
                <Button className="bg-purple-600 hover:bg-purple-700 text-white">
                  <Plus className="mr-2 h-4 w-4" />
                  {hasRecordedSessions ? "Open Recordings" : "Host Your First Session"}
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </main>

      {/* CREATE COURSE DIALOG */}
      <CreateCourseFromSessionsDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        sessions={sessions}
        suggestions={suggestions}
        onSuccess={() => {
          loadData();
          toast.success("Course created successfully!");
        }}
      />
    </div>
  );
}
