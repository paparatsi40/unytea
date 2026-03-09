import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getOverviewAnalytics } from "@/app/actions/analytics";
import { BarChart3, TrendingUp, Users, MessageSquare, FileText } from "lucide-react";
import { StatsCard } from "@/components/analytics/StatsCard";
import { CommunitySelector } from "@/components/analytics/CommunitySelector";

export const metadata = {
  title: "Analytics | Unytea",
  description: "Community analytics and insights",
};

export default async function AnalyticsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  const result = await getOverviewAnalytics();

  if (!result.success || !result.data) {
    return (
      <div className="flex min-h-[600px] items-center justify-center">
        <div className="text-center">
          <BarChart3 className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <h2 className="mb-2 text-xl font-semibold text-foreground">
            Failed to load analytics
          </h2>
          <p className="text-muted-foreground">
            {result.error || "An error occurred"}
          </p>
        </div>
      </div>
    );
  }

  const data = result.data;

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
              <h1 className="text-3xl font-bold text-foreground">Analytics</h1>
              <p className="text-muted-foreground">
                Insights and metrics for your communities
              </p>
            </div>
          </div>
        </div>

        <CommunitySelector />
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Members"
          value={data.totalMembers}
          change={`+${data.newMembersThisMonth} this month`}
          icon={Users}
          color="blue"
        />
        <StatsCard
          title="Total Posts"
          value={data.totalPosts}
          change={`+${data.newPostsThisMonth} this month`}
          icon={FileText}
          color="green"
        />
        <StatsCard
          title="Total Comments"
          value={data.totalComments}
          icon={MessageSquare}
          color="purple"
        />
        <StatsCard
          title="Total Messages"
          value={data.totalMessages}
          icon={MessageSquare}
          color="orange"
        />
      </div>

      {/* Growth Chart Section */}
      <div className="rounded-xl border border-border/50 bg-card/50 p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground">Growth Overview</h2>
            <p className="text-sm text-muted-foreground">
              Member and content growth trends
            </p>
          </div>
          <TrendingUp className="h-6 w-6 text-green-500" />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Member Growth */}
          <div className="rounded-lg border border-border/30 bg-background p-4">
            <h3 className="mb-4 font-semibold text-foreground">Member Growth</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total Members</span>
                <span className="font-bold text-foreground">{data.totalMembers}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">New This Month</span>
                <span className="font-bold text-green-500">
                  +{data.newMembersThisMonth}
                </span>
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
            <h3 className="mb-4 font-semibold text-foreground">Content Growth</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total Posts</span>
                <span className="font-bold text-foreground">{data.totalPosts}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">New This Month</span>
                <span className="font-bold text-green-500">
                  +{data.newPostsThisMonth}
                </span>
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
        <h2 className="mb-4 text-xl font-bold text-foreground">
          Your Communities
        </h2>
        <p className="text-muted-foreground">
          You own {data.totalCommunities} {data.totalCommunities === 1 ? "community" : "communities"}
        </p>
        
        {data.totalCommunities === 0 && (
          <div className="mt-6 rounded-lg border border-border/30 bg-background p-8 text-center">
            <p className="mb-4 text-muted-foreground">
              Create your first community to see detailed analytics
            </p>
            <a
              href="/dashboard/communities/create"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Create Community
            </a>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="rounded-lg border-l-4 border-primary bg-primary/5 p-4">
        <p className="text-sm text-foreground">
          <strong>💡 Pro Tip:</strong> Select a specific community from the dropdown above to see detailed analytics including member insights, engagement metrics, and content performance.
        </p>
      </div>
    </div>
  );
}
