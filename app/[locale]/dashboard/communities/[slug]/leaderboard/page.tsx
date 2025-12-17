import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Trophy, Medal, Award, TrendingUp, Crown, Zap, Target, Star } from "lucide-react";

export default async function CommunityLeaderboardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  // Fetch community
  const community = await prisma.community.findUnique({
    where: { slug: slug },
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
    },
  });

  if (!community) {
    redirect("/dashboard");
  }

  // Fetch members with points ranking
  const members = await prisma.member.findMany({
    where: {
      communityId: community.id,
      status: "ACTIVE",
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          firstName: true,
          lastName: true,
          image: true,
          points: true,
          level: true,
        },
      },
    },
    orderBy: {
      points: "desc",
    },
    take: 50, // Top 50 members
  });

  // Find current user's rank
  const currentUserMember = members.find(m => m.userId === session.user.id);
  const currentUserRank = currentUserMember 
    ? members.findIndex(m => m.userId === session.user.id) + 1 
    : null;

  // Calculate stats
  const totalMembers = members.length;
  const averagePoints = totalMembers > 0
    ? Math.round(members.reduce((sum, m) => sum + m.points, 0) / totalMembers)
    : 0;
  const topScore = members.length > 0 ? members[0].points : 0;

  const getRankIcon = (rank: number) => {
    if (rank === 1) return { Icon: Crown, color: "text-yellow-500", bg: "bg-yellow-500/10", border: "border-yellow-500/20" };
    if (rank === 2) return { Icon: Medal, color: "text-gray-400", bg: "bg-gray-400/10", border: "border-gray-400/20" };
    if (rank === 3) return { Icon: Award, color: "text-orange-500", bg: "bg-orange-500/10", border: "border-orange-500/20" };
    return { Icon: TrendingUp, color: "text-primary", bg: "bg-primary/10", border: "border-primary/20" };
  };

  const getFullName = (member: typeof members[0]) => {
    if (member.user.firstName && member.user.lastName) {
      return `${member.user.firstName} ${member.user.lastName}`;
    }
    return member.user.name || "Anonymous";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
      <div className="container py-8 space-y-8">
        {/* Header */}
        <div className="relative overflow-hidden rounded-3xl border border-border/50 bg-gradient-to-br from-card via-card to-amber-500/5 p-8 shadow-xl backdrop-blur-xl">
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl animate-pulse" />
            <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-yellow-500/10 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          </div>

          <div className="relative">
            <h1 className="text-4xl font-bold text-foreground mb-2 flex items-center gap-3">
              <div className="rounded-2xl bg-amber-500/10 p-3">
                <Trophy className="h-8 w-8 text-amber-500" />
              </div>
              {community.name} - Leaderboard
            </h1>
            <p className="text-lg text-muted-foreground">
              {totalMembers > 0 
                ? `Top ${totalMembers} members competing for the top spot`
                : "No members yet"}
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-border/50 bg-gradient-to-br from-card to-amber-500/5 p-6 shadow-lg backdrop-blur-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="rounded-xl bg-amber-500/10 p-3">
                <Trophy className="h-6 w-6 text-amber-500" />
              </div>
              <TrendingUp className="h-5 w-5 text-green-500" />
            </div>
            <p className="text-3xl font-bold text-foreground">{topScore}</p>
            <p className="text-sm text-muted-foreground">Top Score</p>
          </div>

          <div className="rounded-2xl border border-border/50 bg-gradient-to-br from-card to-primary/5 p-6 shadow-lg backdrop-blur-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="rounded-xl bg-primary/10 p-3">
                <Target className="h-6 w-6 text-primary" />
              </div>
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <p className="text-3xl font-bold text-foreground">{averagePoints}</p>
            <p className="text-sm text-muted-foreground">Average Points</p>
          </div>

          <div className="rounded-2xl border border-border/50 bg-gradient-to-br from-card to-green-500/5 p-6 shadow-lg backdrop-blur-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="rounded-xl bg-green-500/10 p-3">
                <Star className="h-6 w-6 text-green-500" />
              </div>
              <TrendingUp className="h-5 w-5 text-green-500" />
            </div>
            <p className="text-3xl font-bold text-foreground">{totalMembers}</p>
            <p className="text-sm text-muted-foreground">Total Members</p>
          </div>

          <div className="rounded-2xl border border-border/50 bg-gradient-to-br from-card to-purple-500/5 p-6 shadow-lg backdrop-blur-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="rounded-xl bg-purple-500/10 p-3">
                <Zap className="h-6 w-6 text-purple-500" />
              </div>
              <TrendingUp className="h-5 w-5 text-purple-500" />
            </div>
            <p className="text-3xl font-bold text-foreground">
              {currentUserRank ? `#${currentUserRank}` : "—"}
            </p>
            <p className="text-sm text-muted-foreground">Your Rank</p>
          </div>
        </div>

        {/* Leaderboard */}
        {members.length === 0 ? (
          /* Empty State */
          <div className="relative overflow-hidden rounded-3xl border-2 border-dashed border-amber-500/20 bg-gradient-to-br from-card/50 via-accent/20 to-amber-500/5 p-16 text-center backdrop-blur-xl">
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute -top-24 -left-24 h-64 w-64 rounded-full bg-amber-500/5 blur-3xl animate-pulse" />
              <div className="absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-yellow-500/5 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
            </div>

            <div className="relative">
              <div className="relative mx-auto mb-8 h-32 w-32">
                <div className="absolute inset-0 animate-ping rounded-full bg-amber-500/20" style={{ animationDuration: '3s' }} />
                <div className="absolute inset-4 rounded-full bg-gradient-to-br from-amber-500/30 to-yellow-500/30 blur-xl" />
                <div className="relative flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-amber-500 via-yellow-500 to-amber-500/70 shadow-2xl shadow-amber-500/30">
                  <Trophy className="h-16 w-16 text-white animate-bounce" style={{ animationDuration: '2s' }} />
                </div>
              </div>

              <h3 className="mb-3 text-3xl font-bold text-foreground">
                Competition Coming Soon 
              </h3>
              <p className="mb-8 text-lg text-muted-foreground">
                The leaderboard will appear once members start earning points
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-border/50 bg-card/80 p-6 shadow-lg backdrop-blur-xl">
            <div className="space-y-3">
              {members.map((member, index) => {
                const rank = index + 1;
                const { Icon, color, bg, border } = getRankIcon(rank);
                const isTopThree = rank <= 3;
                const isCurrentUser = member.userId === session.user.id;

                return (
                  <div
                    key={member.id}
                    className={`relative flex items-center gap-4 rounded-xl p-4 transition-all ${
                      isCurrentUser
                        ? "border-2 border-primary bg-primary/5 shadow-md"
                        : isTopThree
                        ? `border ${border} ${bg} shadow-sm`
                        : "border border-border/50 hover:border-primary/30 hover:bg-accent/50"
                    }`}
                  >
                    {/* Rank Badge */}
                    <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl ${bg} border ${border}`}>
                      {isTopThree ? (
                        <Icon className={`h-6 w-6 ${color}`} />
                      ) : (
                        <span className="text-lg font-bold text-foreground">#{rank}</span>
                      )}
                    </div>

                    {/* Avatar */}
                    <div className="relative h-14 w-14 flex-shrink-0">
                      <div className="h-full w-full overflow-hidden rounded-xl border-2 border-border bg-gradient-to-br from-primary/20 to-purple-500/20 shadow-sm">
                        {member.user.image ? (
                          <img
                            src={member.user.image}
                            alt={getFullName(member)}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xl font-bold text-primary">
                            {getFullName(member).charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      {/* Level Badge */}
                      <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-lg bg-primary text-xs font-bold text-primary-foreground ring-2 ring-background">
                        {member.user.level}
                      </div>
                    </div>

                    {/* Name & Stats */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-base font-semibold text-foreground">
                          {getFullName(member)}
                        </p>
                        {isCurrentUser && (
                          <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
                            You
                          </span>
                        )}
                        {member.role === "OWNER" && (
                          <Crown className="h-4 w-4 text-amber-500" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Level {member.user.level} • {member.points} community points
                      </p>
                    </div>

                    {/* Points Display */}
                    <div className="text-right">
                      <p className="text-2xl font-bold bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent">
                        {member.points}
                      </p>
                      <p className="text-xs text-muted-foreground">points</p>
                    </div>

                    {/* Trophy indicator for top 3 */}
                    {isTopThree && (
                      <div className="absolute -top-2 -right-2">
                        <div className={`rounded-full ${bg} p-2 shadow-lg`}>
                          <Icon className={`h-4 w-4 ${color}`} />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Points Guide */}
        <div className="rounded-2xl border border-border/50 bg-gradient-to-br from-card/80 to-primary/5 p-8 shadow-lg backdrop-blur-xl">
          <h3 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-3">
            <Zap className="h-6 w-6 text-primary" />
            How to Earn Points
          </h3>
          
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-start gap-3 rounded-xl border border-border/50 bg-card/50 p-4">
              <div className="rounded-lg bg-primary/10 p-2 flex-shrink-0">
                <Star className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Create Posts</p>
                <p className="text-sm text-muted-foreground">Share valuable content with the community</p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-xl border border-border/50 bg-card/50 p-4">
              <div className="rounded-lg bg-green-500/10 p-2 flex-shrink-0">
                <Target className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Join Sessions</p>
                <p className="text-sm text-muted-foreground">Participate in live video sessions</p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-xl border border-border/50 bg-card/50 p-4">
              <div className="rounded-lg bg-purple-500/10 p-2 flex-shrink-0">
                <Award className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Complete Courses</p>
                <p className="text-sm text-muted-foreground">Finish courses and earn achievements</p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-xl border border-border/50 bg-card/50 p-4">
              <div className="rounded-lg bg-amber-500/10 p-2 flex-shrink-0">
                <Trophy className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Stay Active</p>
                <p className="text-sm text-muted-foreground">Regular engagement earns bonus points</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
