"use client";

import { useTranslations } from "next-intl";
import { BarChart3, TrendingUp } from "lucide-react";
import { StatsCard } from "@/components/analytics/StatsCard";
import { CommunitySelector } from "@/components/analytics/CommunitySelector";
import {
  AnalyticsCharts,
  type SessionData,
  type CourseData,
  type RevenueData,
} from "@/components/analytics/AnalyticsCharts";

interface OverviewData {
  totalMembers: number;
  newMembersThisMonth: number;
  totalPosts: number;
  newPostsThisMonth: number;
  totalComments: number;
  totalMessages: number;
  totalCommunities: number;
}

interface HealthMetrics {
  returningAttendeesRate: number;
  returningAttendeesCount: number;
  uniqueAttendeesCount: number;
  feedParticipationRate: number;
  feedActiveMembersCount: number;
  activeMembersCount: number;
}

interface NorthStarData {
  waa: number;
  avgLiveAttendance: number;
  returningAttendeesRate: number;
  feedParticipationRate: number;
  contentReuseRate: number;
}

interface NorthAction {
  title: string;
  why: string;
  href: string;
  cta: string;
}

interface Cohort {
  cohort: string;
  size: number;
  week0: number;
  week1: number;
  week2: number;
  week3: number;
}

interface RetentionCommunity {
  id: string;
  name: string;
}

interface AnalyticsPageClientProps {
  data: OverviewData | null;
  health: HealthMetrics | null;
  northStar: NorthStarData | null;
  northDiagnosis: string | null;
  northActions: NorthAction[];
  cohorts: Cohort[];
  retentionCommunities: RetentionCommunity[];
  retentionTrend: number;
  retentionCommunityId: string | null;
  sessions: SessionData | null;
  courses: CourseData | null;
  revenue: RevenueData | null;
  error: string | null;
}

export function AnalyticsPageClient({
  data,
  health,
  northStar,
  northDiagnosis,
  northActions,
  cohorts,
  retentionCommunities,
  retentionTrend,
  retentionCommunityId,
  sessions,
  courses,
  revenue,
  error,
}: AnalyticsPageClientProps) {
  const t = useTranslations("dashboard.analytics");

  if (error !== null || !data) {
    return (
      <div className="flex min-h-[600px] items-center justify-center">
        <div className="text-center">
          <BarChart3 className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <h2 className="mb-2 text-xl font-semibold text-foreground">{t("loadFailedTitle")}</h2>
          <p className="text-muted-foreground">{error || t("genericError")}</p>
        </div>
      </div>
    );
  }

  // Health benchmarks resolve to translation keys (helpers can't call hooks).
  const getReturningBenchmark = (value: number) => {
    if (value < 20) return { labelKey: "needsWork", tone: "text-red-600" };
    if (value < 40) return { labelKey: "acceptable", tone: "text-amber-600" };
    if (value < 60) return { labelKey: "strong", tone: "text-green-600" };
    return { labelKey: "exceptional", tone: "text-emerald-700" };
  };
  const getFeedBenchmark = (value: number) => {
    if (value < 3) return { labelKey: "silent", tone: "text-red-600" };
    if (value < 10) return { labelKey: "normal", tone: "text-amber-600" };
    if (value < 20) return { labelKey: "alive", tone: "text-green-600" };
    return { labelKey: "veryStrong", tone: "text-emerald-700" };
  };

  const returningBenchmark = getReturningBenchmark(health?.returningAttendeesRate || 0);
  const feedBenchmark = getFeedBenchmark(health?.feedParticipationRate || 0);

  return (
    <div className="space-y-8 p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/10">
              <BarChart3 className="h-6 w-6 text-purple-500" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">{t("title")}</h1>
              <p className="text-muted-foreground">{t("subtitle")}</p>
            </div>
          </div>
        </div>

        <CommunitySelector />
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title={t("overview.totalMembers")}
          value={data.totalMembers}
          change={t("overview.thisMonth", { count: data.newMembersThisMonth })}
          iconName="users"
          color="blue"
        />
        <StatsCard
          title={t("overview.totalPosts")}
          value={data.totalPosts}
          change={t("overview.thisMonth", { count: data.newPostsThisMonth })}
          iconName="posts"
          color="green"
        />
        <StatsCard
          title={t("overview.totalComments")}
          value={data.totalComments}
          iconName="comments"
          color="purple"
        />
        <StatsCard
          title={t("overview.totalMessages")}
          value={data.totalMessages}
          iconName="messages"
          color="orange"
        />
      </div>

      {/* Deep Analytics (Sessions, Courses, Revenue) */}
      <AnalyticsCharts sessions={sessions} courses={courses} revenue={revenue} />

      {/* Growth Chart Section */}
      <div className="rounded-xl border border-border/50 bg-card/50 p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground">{t("growth.title")}</h2>
            <p className="text-sm text-muted-foreground">{t("growth.subtitle")}</p>
          </div>
          <TrendingUp className="h-6 w-6 text-green-500" />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Member Growth */}
          <div className="rounded-lg border border-border/30 bg-background p-4">
            <h3 className="mb-4 font-semibold text-foreground">{t("growth.memberTitle")}</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t("growth.totalMembers")}</span>
                <span className="font-bold text-foreground">{data.totalMembers}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t("growth.newThisMonth")}</span>
                <span className="font-bold text-green-500">+{data.newMembersThisMonth}</span>
              </div>
              <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-blue-600"
                  style={{
                    width: `${Math.min((data.newMembersThisMonth / data.totalMembers) * 100, 100)}%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Post Growth */}
          <div className="rounded-lg border border-border/30 bg-background p-4">
            <h3 className="mb-4 font-semibold text-foreground">{t("growth.contentTitle")}</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t("growth.totalPosts")}</span>
                <span className="font-bold text-foreground">{data.totalPosts}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t("growth.newThisMonth")}</span>
                <span className="font-bold text-green-500">+{data.newPostsThisMonth}</span>
              </div>
              <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-gradient-to-r from-green-500 to-green-600"
                  style={{
                    width: `${Math.min((data.newPostsThisMonth / data.totalPosts) * 100, 100)}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Communities Overview */}
      <div className="rounded-xl border border-border/50 bg-card/50 p-6">
        <h2 className="mb-4 text-xl font-bold text-foreground">{t("communities.title")}</h2>
        <p className="text-muted-foreground">
          {t("communities.youOwn", { count: data.totalCommunities })}
        </p>

        {data.totalCommunities === 0 && (
          <div className="mt-6 rounded-lg border border-border/30 bg-background p-8 text-center">
            <p className="mb-4 text-muted-foreground">{t("communities.emptyText")}</p>
            <a
              href="/dashboard/communities/create"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              {t("communities.createCta")}
            </a>
          </div>
        )}
      </div>

      {/* North Star Decision Framework */}
      <div className="rounded-xl border border-border/50 bg-card/50 p-6">
        <div className="mb-4">
          <h2 className="text-xl font-bold text-foreground">{t("northStar.title")}</h2>
          <p className="text-sm text-muted-foreground">{t("northStar.subtitle")}</p>
        </div>

        {northStar ? (
          <>
            <div className="grid gap-4 md:grid-cols-5">
              <div className="rounded-lg border border-border/30 bg-background p-4">
                <p className="text-xs text-muted-foreground">{t("northStar.waa")}</p>
                <p className="mt-1 text-2xl font-bold text-foreground">{northStar.waa}</p>
              </div>
              <div className="rounded-lg border border-border/30 bg-background p-4">
                <p className="text-xs text-muted-foreground">{t("northStar.avgLiveAttendance")}</p>
                <p className="mt-1 text-2xl font-bold text-foreground">
                  {northStar.avgLiveAttendance}
                </p>
              </div>
              <div className="rounded-lg border border-border/30 bg-background p-4">
                <p className="text-xs text-muted-foreground">{t("northStar.returningAttendees")}</p>
                <p className="mt-1 text-2xl font-bold text-foreground">
                  {northStar.returningAttendeesRate}%
                </p>
              </div>
              <div className="rounded-lg border border-border/30 bg-background p-4">
                <p className="text-xs text-muted-foreground">{t("northStar.feedParticipation")}</p>
                <p className="mt-1 text-2xl font-bold text-foreground">
                  {northStar.feedParticipationRate}%
                </p>
              </div>
              <div className="rounded-lg border border-border/30 bg-background p-4">
                <p className="text-xs text-muted-foreground">{t("northStar.contentReuse")}</p>
                <p className="mt-1 text-2xl font-bold text-foreground">
                  {northStar.contentReuseRate}%
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <strong>{t("northStar.diagnosisLabel")}</strong> {northDiagnosis}
            </div>

            {northActions.length > 0 && (
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {northActions.map((action) => (
                  <a
                    key={action.title}
                    href={action.href}
                    className="rounded-lg border border-border/40 bg-background p-4 hover:border-primary/40"
                  >
                    <p className="font-semibold text-foreground">{action.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{action.why}</p>
                    <p className="mt-3 text-xs font-semibold text-primary">{action.cta} →</p>
                  </a>
                ))}
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">{t("northStar.error")}</p>
        )}
      </div>

      {/* Live Community Health */}
      <div className="rounded-xl border border-border/50 bg-card/50 p-6">
        <div className="mb-4">
          <h2 className="text-xl font-bold text-foreground">{t("health.title")}</h2>
          <p className="text-sm text-muted-foreground">{t("health.subtitle")}</p>
        </div>

        {health ? (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-border/30 bg-background p-4">
              <p className="text-sm text-muted-foreground">{t("health.returningAttendees")}</p>
              <div className="mt-1 flex items-center gap-3">
                <p className="text-3xl font-bold text-foreground">
                  {health.returningAttendeesRate}%
                </p>
                <span className={`text-sm font-semibold ${returningBenchmark.tone}`}>
                  {t(`health.benchmark.${returningBenchmark.labelKey}`)}
                </span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {t("health.returningDetail", {
                  returning: health.returningAttendeesCount,
                  unique: health.uniqueAttendeesCount,
                })}
              </p>
            </div>

            <div className="rounded-lg border border-border/30 bg-background p-4">
              <p className="text-sm text-muted-foreground">{t("health.feedParticipation")}</p>
              <div className="mt-1 flex items-center gap-3">
                <p className="text-3xl font-bold text-foreground">
                  {health.feedParticipationRate}%
                </p>
                <span className={`text-sm font-semibold ${feedBenchmark.tone}`}>
                  {t(`health.benchmark.${feedBenchmark.labelKey}`)}
                </span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {t("health.feedDetail", {
                  active: health.feedActiveMembersCount,
                  total: health.activeMembersCount,
                })}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{t("health.error")}</p>
        )}
      </div>

      {/* Retention Cohorts */}
      <div className="rounded-xl border border-border/50 bg-card/50 p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-foreground">{t("retention.title")}</h2>
            <p className="text-sm text-muted-foreground">{t("retention.subtitle")}</p>
          </div>
          <div className="rounded-md border border-border/50 bg-background px-3 py-2 text-xs">
            {t("retention.trendLabel")}{" "}
            <span className={retentionTrend >= 0 ? "text-green-600" : "text-red-600"}>
              {retentionTrend >= 0 ? `+${retentionTrend}` : retentionTrend}%
            </span>
          </div>
        </div>

        {retentionCommunities.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            <a
              href="/dashboard/analytics"
              className={`rounded-full border px-3 py-1 text-xs transition ${
                !retentionCommunityId
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {t("retention.allCommunities")}
            </a>
            {retentionCommunities.map((community) => (
              <a
                key={community.id}
                href={`/dashboard/analytics?communityId=${community.id}`}
                className={`rounded-full border px-3 py-1 text-xs transition ${
                  retentionCommunityId === community.id
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {community.name}
              </a>
            ))}
          </div>
        )}

        {cohorts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-border/40 text-left text-muted-foreground">
                  <th className="py-2 pr-4 font-medium">{t("retention.cohortWeek")}</th>
                  <th className="py-2 pr-4 font-medium">{t("retention.size")}</th>
                  <th className="py-2 pr-4 font-medium">W0</th>
                  <th className="py-2 pr-4 font-medium">W1</th>
                  <th className="py-2 pr-4 font-medium">W2</th>
                  <th className="py-2 pr-4 font-medium">W3</th>
                </tr>
              </thead>
              <tbody>
                {cohorts.map((cohort) => (
                  <tr key={cohort.cohort} className="border-b border-border/20 text-foreground">
                    <td className="py-2 pr-4">{cohort.cohort}</td>
                    <td className="py-2 pr-4">{cohort.size}</td>
                    <td className="py-2 pr-4">{cohort.week0}%</td>
                    <td className="py-2 pr-4">{cohort.week1}%</td>
                    <td className="py-2 pr-4">{cohort.week2}%</td>
                    <td className="py-2 pr-4">{cohort.week3}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{t("retention.empty")}</p>
        )}
      </div>

      {/* Info */}
      <div className="rounded-lg border-l-4 border-primary bg-primary/5 p-4">
        <p className="text-sm text-foreground">
          <strong>{t("proTipLabel")}</strong> {t("proTip")}
        </p>
      </div>
    </div>
  );
}
