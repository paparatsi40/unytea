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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
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

      if (impactResult.success) {
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
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
          <p className="text-zinc-400">Loading your knowledge library...</p>
        </div>
      </div>
    );
  }

  const hasConvertibleSessions = sessions.length > 0;
  const hasSuggestions = suggestions.length > 0;

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* HEADER */}
      <header className="border-b border-zinc-800 bg-zinc-900/50 px-6 py-6">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <BookOpen className="h-6 w-6 text-purple-500" />
                Knowledge Library
              </h1>
              <p className="mt-1 text-zinc-400">
                Turn your live sessions into scalable education
              </p>
            </div>
            <Button
              onClick={() => setShowCreateDialog(true)}
              className="bg-purple-600 hover:bg-purple-700 gap-2"
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
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" />
              Course Potential
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {suggestions.map((suggestion, index) => (
                <Card
                  key={index}
                  className="bg-zinc-900 border-zinc-800 hover:border-purple-500/50 transition-all cursor-pointer group"
                  onClick={() => setShowCreateDialog(true)}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-white group-hover:text-purple-400 transition-colors">
                          {suggestion.title}
                        </h3>
                        <p className="text-sm text-zinc-400 mt-1">
                          {suggestion.sessionCount} sessions • {Math.round(suggestion.totalDuration / 60)}h total
                        </p>
                      </div>
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-500/10 text-purple-500">
                        <TrendingUp className="h-5 w-5" />
                      </div>
                    </div>
                    
                    <div className="mt-4 space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-zinc-400">Potential students</span>
                        <span className="font-medium text-white">{suggestion.potentialStudents}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-zinc-400">Total attendees</span>
                        <span className="font-medium text-zinc-300">{suggestion.totalAttendees}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-zinc-400">Engagement score</span>
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
            <h2 className="text-lg font-semibold text-white mb-4">Your Knowledge Impact</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card className="bg-zinc-900 border-zinc-800">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10 text-blue-500">
                      <Video className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white">{stats.completedSessions}</p>
                      <p className="text-sm text-zinc-400">Sessions recorded</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-zinc-900 border-zinc-800">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-500/10 text-purple-500">
                      <GraduationCap className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white">{stats.coursesFromSessions}</p>
                      <p className="text-sm text-zinc-400">Courses created</p>
                    </div>
                  </div>
                  {stats.totalCourses > 0 && (
                    <div className="mt-3">
                      <Progress 
                        value={stats.conversionRate} 
                        className="h-1.5 bg-zinc-800"
                      />
                      <p className="text-xs text-zinc-500 mt-1">
                        {stats.conversionRate}% conversion rate
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-zinc-900 border-zinc-800">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/10 text-green-500">
                      <Users className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white">{stats.totalEnrollments}</p>
                      <p className="text-sm text-zinc-400">Students learning</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-zinc-900 border-zinc-800">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10 text-amber-500">
                      <PlayCircle className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white">{stats.totalLessons}</p>
                      <p className="text-sm text-zinc-400">Lessons created</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>
        )}

        {/* CONVERTIBLE SESSIONS */}
        {hasConvertibleSessions && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">
                Sessions Ready to Convert
              </h2>
              <Button
                variant="outline"
                size="sm"
                className="border-zinc-700 text-zinc-300"
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
                  className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors"
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800">
                          {session.mode === "AUDIO" ? (
                            <span className="text-blue-400 text-xs font-medium">AUDIO</span>
                          ) : (
                            <Video className="h-4 w-4 text-zinc-400" />
                          )}
                        </div>
                        <div>
                          <h3 className="font-medium text-white">{session.title}</h3>
                          <p className="text-sm text-zinc-400">
                            {session.community?.name} • {session.duration} min • {session._count.participations} attendees
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-sm font-medium text-zinc-300">
                            Score: {session.engagementScore}/100
                          </p>
                          <p className="text-xs text-zinc-500">
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
                  className="border-zinc-700 text-zinc-400"
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
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-12 text-center">
              <div className="flex justify-center mb-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-800">
                  <Video className="h-8 w-8 text-zinc-500" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                No sessions to convert yet
              </h3>
              <p className="text-zinc-400 max-w-md mx-auto mb-6">
                Complete live sessions with recordings will appear here, ready to be turned into courses.
              </p>
              <Link href="/dashboard/sessions/create">
                <Button className="bg-purple-600 hover:bg-purple-700">
                  <Plus className="mr-2 h-4 w-4" />
                  Host Your First Session
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
