import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth-utils";
import { Search, Users, TrendingUp, Filter, Sparkles, Dumbbell, Briefcase, Code, BookOpen, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";

const discoveryCategories = [
  { name: "Spiritual", icon: Sparkles, color: "from-purple-500/30 to-pink-500/30", desc: "Meditation, mindfulness & inner growth" },
  { name: "Fitness", icon: Dumbbell, color: "from-green-500/30 to-emerald-500/30", desc: "Workouts, nutrition & accountability" },
  { name: "Business", icon: Briefcase, color: "from-blue-500/30 to-cyan-500/30", desc: "Startups, marketing & leadership" },
  { name: "Technology", icon: Code, color: "from-indigo-500/30 to-purple-500/30", desc: "Dev, AI, open source & product building" },
  { name: "Education", icon: BookOpen, color: "from-orange-500/30 to-red-500/30", desc: "Teaching, tutoring & skill sharing" },
  { name: "Creative", icon: Palette, color: "from-pink-500/30 to-rose-500/30", desc: "Art, design, music & storytelling" },
];

async function getPublicCommunities(userId?: string) {
  // Get communities that are public
  const communities = await prisma.community.findMany({
    where: {
      isPrivate: false,
    },
    include: {
      owner: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          image: true,
        },
      },
      _count: {
        select: {
          members: true,
          posts: true,
        },
      },
    },
    orderBy: {
      memberCount: "desc",
    },
    take: 20,
  });

  // If user is logged in, check which communities they're already in
  if (userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (user) {
      const memberships = await prisma.member.findMany({
        where: {
          userId: user.id,
          status: "ACTIVE",
        },
        select: {
          communityId: true,
        },
      });

      const memberCommunityIds = new Set(memberships.map((m) => m.communityId));

      return communities.map((c) => ({
        ...c,
        isMember: memberCommunityIds.has(c.id),
      }));
    }
  }

  return communities.map((c) => ({ ...c, isMember: false }));
}

export default async function ExplorePage() {
  const userId = await getCurrentUserId();

  if (!userId) {
    redirect("/sign-in");
  }

  const communities = await getPublicCommunities(userId);

  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-gray-900 via-purple-900 to-pink-900 p-8">
        <div className="absolute inset-0 opacity-15" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.22) 1px, transparent 0)", backgroundSize: "36px 36px" }} />
        <div className="relative z-10">
          <h1 className="text-3xl font-bold text-white">Explore Communities</h1>
          <p className="mt-2 max-w-2xl text-white/80">
            Discover communities by topic, find your people, and join high-signal conversations.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {discoveryCategories.map((category) => {
              const Icon = category.icon;
              return (
                <div key={category.name} className={`rounded-xl border border-white/20 bg-gradient-to-br ${category.color} p-4 backdrop-blur-sm`}>
                  <div className="flex items-center gap-2 text-white">
                    <Icon className="h-4 w-4" />
                    <span className="font-medium">{category.name}</span>
                  </div>
                  <p className="mt-2 text-xs text-white/80">{category.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search communities..."
            className="w-full rounded-xl border border-border bg-background py-3 pl-12 pr-4 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <Button variant="outline" className="flex items-center space-x-2">
          <Filter className="h-4 w-4" />
          <span className="hidden sm:inline">Filters</span>
        </Button>
      </div>

      {/* Stats - only show when there are enough communities */}
      {communities.length >= 5 && <div className="grid gap-6 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-gradient-to-br from-card to-card/50 p-6">
          <div className="flex items-center space-x-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                Public Communities
              </p>
              <p className="text-2xl font-bold text-foreground">
                {communities.length}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-gradient-to-br from-card to-card/50 p-6">
          <div className="flex items-center space-x-3">
            <div className="rounded-lg bg-green-500/10 p-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                Total Members
              </p>
              <p className="text-2xl font-bold text-foreground">
                {communities.reduce((sum, c) => sum + c._count.members, 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-gradient-to-br from-card to-card/50 p-6">
          <div className="flex items-center space-x-3">
            <div className="rounded-lg bg-blue-500/10 p-2">
              <TrendingUp className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                Total Posts
              </p>
              <p className="text-2xl font-bold text-foreground">
                {communities.reduce((sum, c) => sum + c._count.posts, 0)}
              </p>
            </div>
          </div>
        </div>
      </div>}

      {/* Communities Grid */}
      {communities.length > 0 ? (
        <div>
          <h2 className="mb-4 text-xl font-semibold text-foreground">
            All Communities
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {communities.map((community) => (
              <div
                key={community.id}
                className="group h-full rounded-2xl border border-border bg-gradient-to-br from-card via-card to-card/50 shadow-sm transition-all hover:border-primary/20 hover:shadow-xl"
              >
                {/* Cover Image */}
                <div className="relative h-32 overflow-hidden rounded-t-2xl bg-gradient-to-br from-primary/20 to-purple-500/20">
                  {community.coverImageUrl && (
                    <img
                      src={community.coverImageUrl}
                      alt={community.name}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                  )}
                </div>

                {/* Content */}
                <div className="p-6">
                  {/* Logo */}
                  <div className="relative -mt-12 mb-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-xl border-4 border-background bg-gradient-to-br from-primary to-primary/70 shadow-lg">
                      {community.imageUrl ? (
                        <img
                          src={community.imageUrl}
                          alt={community.name}
                          className="h-full w-full rounded-lg object-cover"
                        />
                      ) : (
                        <Users className="h-8 w-8 text-primary-foreground" />
                      )}
                    </div>
                  </div>

                  {/* Name & Description */}
                  <h3 className="mb-2 text-lg font-bold text-foreground">
                    {community.name}
                  </h3>
                  {community.description && (
                    <p className="mb-4 line-clamp-2 text-sm text-muted-foreground">
                      {community.description}
                    </p>
                  )}

      {/* Stats - only show when there are enough communities */}
      {communities.length >= 5 && <div className="grid gap-6 sm:grid-cols-3">
                    <div className="flex items-center space-x-1">
                      <Users className="h-4 w-4" />
                      <span>{community._count.members} members</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <TrendingUp className="h-4 w-4" />
                      <span>{community._count.posts} posts</span>
                    </div>
                  </div>

                  {/* Action Button */}
                  {community.isMember ? (
                    <Link href={`/dashboard/c/${community.slug}`}>
                      <Button className="w-full" variant="outline">
                        View Community
                      </Button>
                    </Link>
                  ) : (
                    <Link href={`/dashboard/c/${community.slug}`}>
                      <Button className="w-full bg-gradient-to-r from-primary to-primary/80">
                        Join Community
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Empty State */
        <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-card/50 p-12 text-center">
          <Users className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="mb-2 text-xl font-bold text-foreground">
            No public communities yet
          </h3>
          <p className="text-muted-foreground">
            Be the first to create a public community!
          </p>
        </div>
      )}
    </div>
  );
}
