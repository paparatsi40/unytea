import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import {
  getLiveCommunityHealthMetrics,
  getNorthStarDecisionSnapshot,
  getOverviewAnalytics,
  getRetentionCohorts,
} from "@/app/actions/analytics";
import {
  getSessionAnalytics,
  getCourseAnalytics,
  getRevenueAnalytics,
} from "@/app/actions/analytics-extended";
import { AnalyticsPageClient } from "./AnalyticsPageClient";

export const metadata = {
  title: "Analytics | Unytea",
  description: "Community analytics and insights",
};

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ communityId?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  const resolvedSearchParams = await searchParams;
  const selectedCommunityId = resolvedSearchParams?.communityId;

  const [
    result,
    retentionResult,
    healthResult,
    northStarResult,
    sessionResult,
    courseResult,
    revenueResult,
  ] = await Promise.all([
    getOverviewAnalytics(),
    getRetentionCohorts(selectedCommunityId),
    getLiveCommunityHealthMetrics(selectedCommunityId),
    getNorthStarDecisionSnapshot(selectedCommunityId),
    getSessionAnalytics(selectedCommunityId),
    getCourseAnalytics(selectedCommunityId),
    getRevenueAnalytics(selectedCommunityId),
  ]);

  // The (dashboard) route group has no [locale] segment, so all strings/dates
  // are localized in the client view; the page stays a thin data fetcher.
  if (!result.success || !result.data) {
    return (
      <AnalyticsPageClient
        data={null}
        health={null}
        northStar={null}
        northDiagnosis={null}
        northActions={[]}
        cohorts={[]}
        retentionCommunities={[]}
        retentionTrend={0}
        retentionCommunityId={null}
        sessions={null}
        courses={null}
        revenue={null}
        error={result.error || ""}
      />
    );
  }

  const cohorts = retentionResult.success ? retentionResult.cohorts || [] : [];
  const retentionCommunities = retentionResult.success ? retentionResult.communities || [] : [];
  const retentionTrend = retentionResult.success ? retentionResult.trend || 0 : 0;
  const retentionCommunityId = retentionResult.success
    ? (retentionResult.selectedCommunityId ?? null)
    : null;
  const health = healthResult.success ? (healthResult.metrics ?? null) : null;
  const northStar = northStarResult.success ? (northStarResult.northStar ?? null) : null;
  const northDiagnosis = northStarResult.success ? (northStarResult.diagnosis ?? null) : null;
  const northActions = northStarResult.success ? northStarResult.actions || [] : [];

  return (
    <AnalyticsPageClient
      data={result.data}
      health={health}
      northStar={northStar}
      northDiagnosis={northDiagnosis}
      northActions={northActions}
      cohorts={cohorts}
      retentionCommunities={retentionCommunities}
      retentionTrend={retentionTrend}
      retentionCommunityId={retentionCommunityId}
      sessions={sessionResult.success ? (sessionResult.data ?? null) : null}
      courses={courseResult.success ? (courseResult.data ?? null) : null}
      revenue={revenueResult.success ? (revenueResult.data ?? null) : null}
      error={null}
    />
  );
}
