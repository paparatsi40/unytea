"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
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
import { useTranslations } from "next-intl";
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

// Extracted from the former /dashboard/knowledge-library page (Sub-Phase E
// Commit 3). Renders inside the Library "Resources" tab; the page-level title
// header is dropped (the Library page provides it). Stays a client component —
// it owns data-loading state, a creation dialog, and client-side auth gating.
export function ResourcesTab() {
  const t = useTranslations("dashboard.library.resources");
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
      toast.error(t("toastLoadError"));
    } finally {
      setLoading(false);
    }
  }

  if (isAuthLoading || loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
          <p className="text-muted-foreground">{t("loading")}</p>
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
    sessions.reduce(
      (acc, session) => {
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
      },
      {} as Record<string, number>
    )
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  return (
    <div>
      {/* Action row */}
      <div className="mb-6 flex justify-end">
        <Button
          onClick={() => setShowCreateDialog(true)}
          className="gap-2 bg-purple-600 text-white hover:bg-purple-700"
          disabled={!hasConvertibleSessions}
        >
          <Sparkles className="h-4 w-4" />
          {t("buildCourse")}
        </Button>
      </div>

      {/* CTA CARDS - Growth Driven */}
      {hasSuggestions && (
        <section className="mb-8">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
            <Sparkles className="h-5 w-5 text-amber-500" />
            {t("coursePotential")}
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {suggestions.map((suggestion, index) => (
              <Card
                key={index}
                className="group cursor-pointer border-border bg-card transition-all hover:border-purple-500/50"
                onClick={() => setShowCreateDialog(true)}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-foreground transition-colors group-hover:text-purple-400">
                        {suggestion.title}
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {t("suggestionMeta", {
                          sessions: suggestion.sessionCount,
                          hours: Math.round(suggestion.totalDuration / 60),
                        })}
                      </p>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-500/10 text-purple-500">
                      <TrendingUp className="h-5 w-5" />
                    </div>
                  </div>

                  <div className="mt-4 space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{t("potentialStudents")}</span>
                      <span className="font-medium text-foreground">
                        {suggestion.potentialStudents}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{t("totalAttendees")}</span>
                      <span className="font-medium text-foreground">
                        {suggestion.totalAttendees}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{t("engagementScore")}</span>
                      <span className="font-medium text-green-400">
                        {t("scoreValue", { value: suggestion.avgEngagement })}
                      </span>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    className="mt-4 w-full text-purple-400 hover:bg-purple-500/10 hover:text-purple-300"
                  >
                    {t("createCourse")}
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
          <h2 className="mb-4 text-lg font-semibold text-foreground">{t("knowledgeImpact")}</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="border-border bg-card">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10 text-blue-500">
                    <Video className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{stats.completedSessions}</p>
                    <p className="text-sm text-muted-foreground">{t("sessionsRecorded")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-500/10 text-purple-500">
                    <GraduationCap className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">
                      {stats.coursesFromSessions}
                    </p>
                    <p className="text-sm text-muted-foreground">{t("coursesCreated")}</p>
                  </div>
                </div>
                {stats?.totalCourses > 0 && (
                  <div className="mt-3">
                    <Progress value={stats?.conversionRate} className="h-1.5 bg-muted" />
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t("conversionRate", { rate: stats?.conversionRate })}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/10 text-green-500">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{stats.totalEnrollments}</p>
                    <p className="text-sm text-muted-foreground">{t("studentsLearning")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10 text-amber-500">
                    <PlayCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{stats.totalLessons}</p>
                    <p className="text-sm text-muted-foreground">{t("lessonsCreated")}</p>
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
          <Card className="border-border bg-card md:col-span-2">
            <CardContent className="p-5">
              <h2 className="mb-3 text-lg font-semibold text-foreground">{t("bestSessions")}</h2>
              <div className="space-y-3">
                {bestSessions.map((session) => (
                  <div
                    key={session.id}
                    className="flex items-center justify-between rounded-lg border border-border bg-card/60 px-3 py-2"
                  >
                    <div>
                      <p className="font-medium text-foreground">{session.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {t("bestSessionMeta", {
                          community: session.community?.name || t("communityFallback"),
                          count: session._count.participations,
                        })}
                      </p>
                    </div>
                    <Link href={`/dashboard/sessions/${session.id}`}>
                      <Button variant="ghost" size="sm" className="text-purple-400">
                        {t("open")}
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardContent className="p-5">
              <h2 className="mb-3 text-lg font-semibold text-foreground">{t("keyTopics")}</h2>
              <div className="flex flex-wrap gap-2">
                {keyTopics.length > 0 ? (
                  keyTopics.map(([topic, count]) => (
                    <Badge key={topic} variant="secondary" className="bg-muted text-foreground">
                      {topic} ({count})
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">{t("topicsEmpty")}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      {hasConvertibleSessions && (
        <section className="mb-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">{t("curatedRecordings")}</h2>
            <Link href="/dashboard/library?tab=recordings">
              <Button variant="outline" size="sm" className="border-border text-foreground">
                {t("viewRecordings")}
              </Button>
            </Link>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {curatedRecordings.map((session) => (
              <Card key={session.id} className="border-border bg-card">
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-medium text-foreground">{session.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {t("curatedMeta", {
                        count: session._count.participations,
                        duration: session.duration,
                      })}
                    </p>
                  </div>
                  <Link href={`/dashboard/sessions/${session.id}`}>
                    <Button variant="ghost" size="sm" className="text-purple-400">
                      {t("watch")}
                    </Button>
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
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">{t("sessionsReadyToConvert")}</h2>
            <Button
              variant="outline"
              size="sm"
              className="border-border text-foreground"
              onClick={() => setShowCreateDialog(true)}
            >
              <Plus className="mr-1 h-4 w-4" />
              {t("selectMultiple")}
            </Button>
          </div>

          <div className="grid gap-3">
            {sessions.slice(0, 6).map((session) => (
              <Card
                key={session.id}
                className="border-border bg-card transition-colors hover:border-border"
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                        {session.mode === "AUDIO" ? (
                          <span className="text-xs font-medium text-blue-400">AUDIO</span>
                        ) : (
                          <Video className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-medium text-foreground">{session.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {t("convertibleMeta", {
                            community: session.community?.name ?? t("communityFallback"),
                            duration: session.duration,
                            count: session._count.participations,
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-sm font-medium text-foreground">
                          {t("score", { score: session.engagementScore })}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(session.scheduledAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Link href={`/dashboard/sessions/${session.id}`}>
                        <Button variant="ghost" size="sm" className="text-purple-400">
                          {t("view")}
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
                {t("viewAllSessions", { count: sessions.length })}
              </Button>
            </div>
          )}
        </section>
      )}

      {/* EMPTY STATE */}
      {!hasConvertibleSessions && !loading && (
        <Card className="border-border bg-card">
          <CardContent className="p-12 text-center">
            <div className="mb-4 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <Video className="h-8 w-8 text-muted-foreground" />
              </div>
            </div>
            <h3 className="mb-2 text-lg font-semibold text-foreground">
              {hasRecordedSessions ? t("emptyTitleConvertible") : t("emptyTitleNone")}
            </h3>
            <p className="mx-auto mb-6 max-w-md text-muted-foreground">
              {hasRecordedSessions ? t("emptyBodyConvertible") : t("emptyBodyNone")}
            </p>
            <Link
              href={
                hasRecordedSessions ? "/dashboard/library?tab=recordings" : "/dashboard/sessions"
              }
            >
              <Button className="bg-purple-600 text-white hover:bg-purple-700">
                <Plus className="mr-2 h-4 w-4" />
                {hasRecordedSessions ? t("openRecordings") : t("hostFirstSession")}
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* CREATE COURSE DIALOG */}
      <CreateCourseFromSessionsDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        sessions={sessions}
        suggestions={suggestions}
        onSuccess={() => {
          loadData();
          toast.success(t("toastCourseCreated"));
        }}
      />
    </div>
  );
}
