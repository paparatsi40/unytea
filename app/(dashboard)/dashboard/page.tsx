import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { 
  Users, 
  Plus,
  Crown,
  ArrowRight,
  TrendingUp,
} from "lucide-react";

export default async function DashboardPage() {
  const session = await auth();
  
  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  const supabase = createClient();

  // Fetch communities where user is owner
  const { data: ownedCommunities } = await supabase
    .from("communities")
    .select("*")
    .eq("ownerId", session.user.id)
    .order("createdAt", { ascending: false });

  // Fetch communities where user is member
  const { data: memberCommunities } = await supabase
    .from("community_members")
    .select(`
      community:communities(*)
    `)
    .eq("userId", session.user.id)
    .neq("communities.ownerId", session.user.id);

  const joinedCommunities = memberCommunities?.map(m => m.community).filter(Boolean) || [];

  const totalCommunities = (ownedCommunities?.length || 0) + (joinedCommunities?.length || 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          Welcome back, {session.user.name}! 👋
        </h1>
        <p className="mt-2 text-muted-foreground">
          Select a community to get started, or create a new one.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-6 sm:grid-cols-3">
        <div className="group relative overflow-hidden rounded-xl border border-border bg-card p-6 transition-all hover:border-primary/50 hover:shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Total Communities
              </p>
              <p className="mt-2 text-3xl font-bold text-foreground">
                {totalCommunities}
              </p>
            </div>
            <div className="rounded-full p-3 bg-blue-500/10">
              <Users className="h-6 w-6 text-blue-500" />
            </div>
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-xl border border-border bg-card p-6 transition-all hover:border-primary/50 hover:shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                You Own
              </p>
              <p className="mt-2 text-3xl font-bold text-foreground">
                {ownedCommunities?.length || 0}
              </p>
            </div>
            <div className="rounded-full p-3 bg-yellow-500/10">
              <Crown className="h-6 w-6 text-yellow-500" />
            </div>
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-xl border border-border bg-card p-6 transition-all hover:border-primary/50 hover:shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                You Joined
              </p>
              <p className="mt-2 text-3xl font-bold text-foreground">
                {joinedCommunities?.length || 0}
              </p>
            </div>
            <div className="rounded-full p-3 bg-purple-500/10">
              <TrendingUp className="h-6 w-6 text-purple-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Your Communities (Owned) */}
      {ownedCommunities && ownedCommunities.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground">
                Your Communities
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Communities you own and manage
              </p>
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {ownedCommunities.map((community) => (
              <Link
                key={community.id}
                href={`/dashboard/communities/${community.id}`}
                className="group relative overflow-hidden rounded-xl border border-border bg-card p-6 transition-all hover:border-primary hover:shadow-xl"
              >
                <div className="absolute top-4 right-4">
                  <div className="rounded-full bg-yellow-500/10 p-2">
                    <Crown className="h-4 w-4 text-yellow-500" />
                  </div>
                </div>
                
                <div className="mb-4">
                  <h3 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">
                    {community.name}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                    {community.description || "No description"}
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                    <span className="flex items-center">
                      <Users className="h-4 w-4 mr-1" />
                      {community.memberCount || 0}
                    </span>
                  </div>
                  <ArrowRight className="h-5 w-5 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </Link>
            ))}

            {/* Create New Community Card */}
            <Link
              href="/dashboard/communities/new"
              className="group relative overflow-hidden rounded-xl border-2 border-dashed border-border bg-card/50 p-6 transition-all hover:border-primary hover:bg-card"
            >
              <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                <div className="rounded-full bg-primary/10 p-4 group-hover:bg-primary/20 transition-colors">
                  <Plus className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">
                    Create New Community
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Start building your community
                  </p>
                </div>
              </div>
            </Link>
          </div>
        </div>
      )}

      {/* Joined Communities */}
      {joinedCommunities && joinedCommunities.length > 0 && (
        <div>
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-foreground">
              Joined Communities
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Communities you're a member of
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {joinedCommunities.map((community: any) => (
              <Link
                key={community.id}
                href={`/dashboard/communities/${community.id}`}
                className="group relative overflow-hidden rounded-xl border border-border bg-card p-6 transition-all hover:border-primary hover:shadow-xl"
              >
                <div className="mb-4">
                  <h3 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">
                    {community.name}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                    {community.description || "No description"}
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                    <span className="flex items-center">
                      <Users className="h-4 w-4 mr-1" />
                      {community.memberCount || 0}
                    </span>
                  </div>
                  <ArrowRight className="h-5 w-5 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {totalCommunities === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="rounded-full bg-primary/10 p-6 mb-6">
            <Users className="h-12 w-12 text-primary" />
          </div>
          <h3 className="text-2xl font-bold text-foreground mb-2">
            No communities yet
          </h3>
          <p className="text-muted-foreground mb-8 max-w-md">
            Create your first community to start building your audience and connecting with members.
          </p>
          <Link
            href="/dashboard/communities/new"
            className="inline-flex items-center px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-5 w-5 mr-2" />
            Create Your First Community
          </Link>
        </div>
      )}
    </div>
  );
}
