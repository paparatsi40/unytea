"use client";

import { useEffect, useState } from "react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Users, TrendingUp, Crown, Lock, Loader2, Search, Grid3x3, List, Filter, SortAsc, Sparkles, Heart, Dumbbell, Briefcase, Code, BookOpen, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";

type Community = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  coverImageUrl: string | null;
  isPrivate: boolean;
  role: string;
  _count: {
    members: number;
    posts: number;
  };
};

// Categories for carousel
const categories = [
  { name: "Spiritual", icon: Sparkles, color: "from-purple-500 to-pink-500", image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80" },
  { name: "Fitness", icon: Dumbbell, color: "from-green-500 to-emerald-500", image: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&q=80" },
  { name: "Business", icon: Briefcase, color: "from-blue-500 to-cyan-500", image: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800&q=80" },
  { name: "Technology", icon: Code, color: "from-indigo-500 to-purple-500", image: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80" },
  { name: "Education", icon: BookOpen, color: "from-orange-500 to-red-500", image: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&q=80" },
  { name: "Creative", icon: Palette, color: "from-pink-500 to-rose-500", image: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=800&q=80" },
];

export function CommunitiesClient() {
  const { user, isLoading } = useCurrentUser();
  const router = useRouter();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // UI States
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"recent" | "members" | "posts" | "name">("recent");
  const [filterPrivacy, setFilterPrivacy] = useState<"all" | "public" | "private">("all");
  const [currentCarouselIndex, setCurrentCarouselIndex] = useState(0);

  // Auto-rotate carousel
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentCarouselIndex((prev) => prev + 1);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    async function fetchCommunities() {
      if (isLoading) return;
      
      if (!user) {
        router.push("/auth/signin");
        return;
      }

      try {
        const response = await fetch('/api/communities');
        
        if (!response.ok) {
          throw new Error("Failed to fetch communities");
        }
        
        const data = await response.json();
        setCommunities(data);
      } catch (err) {
        console.error("❌ Error fetching communities:", err);
        setError(err instanceof Error ? err.message : "Failed to load communities");
      } finally {
        setLoading(false);
      }
    }

    fetchCommunities();
  }, [user, isLoading, router]);

  // Filter and sort communities
  const filteredCommunities = communities
    .filter((c) => {
      // Search filter
      if (searchQuery && !c.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      // Privacy filter
      if (filterPrivacy === "public" && c.isPrivate) return false;
      if (filterPrivacy === "private" && !c.isPrivate) return false;
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "members":
          return b._count.members - a._count.members;
        case "posts":
          return b._count.posts - a._count.posts;
        case "name":
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

  if (isLoading || loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Loading communities...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground">Error loading communities</h2>
          <p className="mt-2 text-muted-foreground">{error}</p>
          <Button onClick={() => window.location.reload()} className="mt-4">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  // Calculate stats
  const totalMembers = communities.reduce((sum, c) => sum + c._count.members, 0);
  const ownedCommunities = communities.filter((c) => c.role === "OWNER").length;
  const totalPosts = communities.reduce((sum, c) => sum + c._count.posts, 0);

  return (
    <div className="space-y-8">
      {/* 🎨 HERO CAROUSEL - CATEGORIES */}
      <div className="relative h-[500px] overflow-hidden rounded-3xl bg-gradient-to-br from-gray-900 via-purple-900 to-pink-900">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)`,
            backgroundSize: '40px 40px'
          }}></div>
        </div>

        {/* Title */}
        <div className="absolute left-1/2 top-6 z-20 -translate-x-1/2 text-center">
          <h2 className="mb-1 text-5xl font-bold text-white drop-shadow-2xl">
            Explore Communities
          </h2>
          <p className="text-lg text-white/80">
            Find your perfect community
          </p>
        </div>

        {/* 3D Carousel Container - CENTERED */}
        <div className="absolute inset-0 flex items-center justify-center" style={{ perspective: '1000px' }}>
          <div 
            className="relative h-64 w-full"
            style={{
              transformStyle: 'preserve-3d',
              transform: `translateY(-100px) translateZ(-350px) rotateY(${-currentCarouselIndex * 60}deg)`,
              transition: 'transform 0.7s ease-out'
            }}
          >
            {/* Category Cards in 3D Circle */}
            {categories.map((category, index) => {
              const Icon = category.icon;
              const angle = (index * 360) / categories.length;
              
              return (
                <div
                  key={category.name}
                  className="absolute left-1/2 top-1/2 h-72 w-64 -translate-x-1/2 -translate-y-1/2 cursor-pointer"
                  style={{
                    transform: `rotateY(${angle}deg) translateZ(350px)`,
                    transformStyle: 'preserve-3d'
                  }}
                  onClick={() => setCurrentCarouselIndex(index)}
                >
                  <div className="group h-full w-full overflow-hidden rounded-2xl shadow-2xl transition-all hover:scale-110">
                    {/* Card Image */}
                    <div className="relative h-full w-full">
                      <img
                        src={category.image}
                        alt={category.name}
                        className="h-full w-full object-cover"
                      />
                      <div className={`absolute inset-0 bg-gradient-to-br ${category.color} opacity-70`} />
                      
                      {/* Card Content */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-white">
                        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/20 backdrop-blur-md">
                          <Icon className="h-8 w-8" />
                        </div>
                        <h3 className="mb-2 text-2xl font-bold">
                          {category.name}
                        </h3>
                        <p className="text-center text-sm text-white/80">
                          Discover amazing communities
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Navigation Controls */}
        <div className="absolute bottom-4 left-1/2 z-30 flex -translate-x-1/2 items-center gap-4">
          <button
            onClick={() => setCurrentCarouselIndex((prev) => prev - 1)}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md transition-all hover:bg-white/20 hover:scale-110"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Indicators */}
          <div className="flex gap-2">
            {categories.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentCarouselIndex(idx)}
                className={`h-2 rounded-full transition-all ${
                  idx === currentCarouselIndex % categories.length
                    ? "w-8 bg-white"
                    : "w-2 bg-white/40 hover:bg-white/60"
                }`}
              />
            ))}
          </div>

          <button
            onClick={() => setCurrentCarouselIndex((prev) => prev + 1)}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md transition-all hover:bg-white/20 hover:scale-110"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Create Button */}
        <div className="absolute right-8 top-6 z-30">
          <Link href="/dashboard/communities/new">
            <Button size="lg" className="bg-white text-gray-900 shadow-2xl hover:bg-gray-100">
              <Plus className="mr-2 h-5 w-5" />
              Create Community
            </Button>
          </Link>
        </div>
      </div>

      {/* 🔍 SEARCH & FILTERS BAR */}
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        {/* Search */}
        <div className="relative flex-1 lg:max-w-md">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search communities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pl-10 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>

        {/* Filters & Sort */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Privacy Filter */}
          <select
            value={filterPrivacy}
            onChange={(e) => setFilterPrivacy(e.target.value as any)}
            className="rounded-lg border border-border bg-background px-4 py-2 text-sm"
          >
            <option value="all">All Communities</option>
            <option value="public">Public</option>
            <option value="private">Private</option>
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="rounded-lg border border-border bg-background px-4 py-2 text-sm"
          >
            <option value="recent">Recent</option>
            <option value="members">Most Members</option>
            <option value="posts">Most Active</option>
            <option value="name">Alphabetical</option>
          </select>

          {/* View Toggle */}
          <div className="flex rounded-lg border border-border bg-background">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 ${
                viewMode === "grid"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              } rounded-l-lg transition-colors`}
            >
              <Grid3x3 className="h-5 w-5" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 ${
                viewMode === "list"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              } rounded-r-lg transition-colors`}
            >
              <List className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* 📊 STATS CARDS */}
      {communities.length > 0 && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="group rounded-2xl border border-border bg-gradient-to-br from-card to-card/50 p-6 shadow-sm transition-all hover:scale-105 hover:shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Communities</p>
                <p className="mt-2 text-3xl font-bold text-foreground">{communities.length}</p>
              </div>
              <div className="rounded-xl bg-primary/10 p-3 transition-transform group-hover:rotate-12">
                <Users className="h-6 w-6 text-primary" />
              </div>
            </div>
          </div>

          <div className="group rounded-2xl border border-border bg-gradient-to-br from-card to-card/50 p-6 shadow-sm transition-all hover:scale-105 hover:shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Members</p>
                <p className="mt-2 text-3xl font-bold text-foreground">{totalMembers}</p>
              </div>
              <div className="rounded-xl bg-green-500/10 p-3 transition-transform group-hover:rotate-12">
                <Users className="h-6 w-6 text-green-500" />
              </div>
            </div>
          </div>

          <div className="group rounded-2xl border border-border bg-gradient-to-br from-card to-card/50 p-6 shadow-sm transition-all hover:scale-105 hover:shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">You Own</p>
                <p className="mt-2 text-3xl font-bold text-foreground">{ownedCommunities}</p>
              </div>
              <div className="rounded-xl bg-amber-500/10 p-3 transition-transform group-hover:rotate-12">
                <Crown className="h-6 w-6 text-amber-500" />
              </div>
            </div>
          </div>

          <div className="group rounded-2xl border border-border bg-gradient-to-br from-card to-card/50 p-6 shadow-sm transition-all hover:scale-105 hover:shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Posts</p>
                <p className="mt-2 text-3xl font-bold text-foreground">{totalPosts}</p>
              </div>
              <div className="rounded-xl bg-blue-500/10 p-3 transition-transform group-hover:rotate-12">
                <TrendingUp className="h-6 w-6 text-blue-500" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🎨 COMMUNITIES GRID/LIST */}
      {filteredCommunities.length > 0 ? (
        <div>
          {/* Section Header with Tabs */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold text-foreground">
                Your Communities
              </h2>
              <p className="mt-1 text-muted-foreground">
                {filteredCommunities.length} {filteredCommunities.length === 1 ? 'community' : 'communities'} • Growing daily
              </p>
            </div>
            
            {/* Featured Badges */}
            <div className="hidden items-center gap-2 lg:flex">
              <div className="flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2 text-sm font-semibold text-white shadow-lg">
                <Crown className="h-4 w-4" />
                <span>{ownedCommunities} Owned</span>
              </div>
              <div className="flex items-center gap-2 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-lg">
                <Users className="h-4 w-4" />
                <span>{totalMembers} Members</span>
              </div>
            </div>
          </div>
          
          {viewMode === "grid" ? (
            // 🎨 EPIC GRID VIEW - SUPERIOR TO SKOOL
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {filteredCommunities.map((community, index) => (
                <Link
                  key={community.id}
                  href={`/dashboard/c/${community.slug}`}
                  className="group relative"
                >
                  <div className="relative overflow-hidden rounded-3xl border-2 border-border bg-card shadow-xl transition-all duration-500 hover:scale-[1.02] hover:border-primary/50 hover:shadow-2xl hover:shadow-primary/20">
                    {/* Ranking Badge */}
                    {index < 3 && (
                      <div className="absolute left-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 font-bold text-white shadow-2xl">
                        #{index + 1}
                      </div>
                    )}

                    {/* Cover Image with Overlay */}
                    <div className="relative h-48 overflow-hidden">
                      {community.coverImageUrl ? (
                        <img
                          src={community.coverImageUrl}
                          alt={community.name}
                          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                      ) : (
                        <div className={`h-full w-full bg-gradient-to-br ${categories[index % categories.length].color}`} />
                      )}
                      
                      {/* Gradient Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                      
                      {/* Badges on Cover */}
                      <div className="absolute right-4 top-4 flex flex-col gap-2">
                        {community.isPrivate && (
                          <div className="flex items-center gap-1 rounded-full bg-black/60 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-md">
                            <Lock className="h-3 w-3" />
                            Private
                          </div>
                        )}
                        {community.role === "OWNER" && (
                          <div className="flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-1.5 text-xs font-bold text-white shadow-lg">
                            <Crown className="h-3 w-3" />
                            Owner
                          </div>
                        )}
                      </div>

                      {/* Stats on Cover */}
                      <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                        <div className="flex items-center gap-3 text-white">
                          <div className="flex items-center gap-1.5 rounded-full bg-black/40 px-3 py-1.5 backdrop-blur-md">
                            <Users className="h-4 w-4" />
                            <span className="text-sm font-semibold">{community._count.members.toLocaleString()}</span>
                          </div>
                          <div className="flex items-center gap-1.5 rounded-full bg-black/40 px-3 py-1.5 backdrop-blur-md">
                            <TrendingUp className="h-4 w-4" />
                            <span className="text-sm font-semibold">{community._count.posts}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-6">
                      {/* Logo + Name */}
                      <div className="mb-4 flex items-start gap-4">
                        {/* Logo */}
                        <div className="relative -mt-12 shrink-0">
                          <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border-4 border-background bg-gradient-to-br from-primary to-primary/70 shadow-2xl">
                            {community.imageUrl ? (
                              <img
                                src={community.imageUrl}
                                alt={community.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <Users className="h-10 w-10 text-primary-foreground" />
                            )}
                          </div>
                        </div>

                        {/* Name + Quick Stats */}
                        <div className="min-w-0 flex-1 pt-2">
                          <h3 className="mb-2 truncate text-xl font-bold text-foreground transition-colors group-hover:text-primary">
                            {community.name}
                          </h3>
                          {community.description && (
                            <p className="line-clamp-2 text-sm text-muted-foreground">
                              {community.description}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Bottom Info */}
                      <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
                        <div className="flex items-center gap-2">
                          <div className="flex -space-x-2">
                            {[1, 2, 3].map((i) => (
                              <div
                                key={i}
                                className="h-8 w-8 rounded-full border-2 border-background bg-gradient-to-br from-primary/80 to-primary"
                              />
                            ))}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            +{community._count.members - 3} more
                          </span>
                        </div>
                        
                        {/* Arrow */}
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary transition-all group-hover:bg-primary group-hover:text-primary-foreground">
                          <svg className="h-5 w-5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            // 📋 ENHANCED LIST VIEW
            <div className="space-y-4">
              {filteredCommunities.map((community, index) => (
                <Link
                  key={community.id}
                  href={`/dashboard/c/${community.slug}`}
                  className="group"
                >
                  <div className="flex items-center gap-6 overflow-hidden rounded-2xl border-2 border-border bg-card p-6 shadow-lg transition-all hover:scale-[1.01] hover:border-primary/50 hover:shadow-xl hover:shadow-primary/10">
                    {/* Ranking */}
                    {index < 3 && (
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-lg font-bold text-white shadow-lg">
                        #{index + 1}
                      </div>
                    )}

                    {/* Logo */}
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-primary to-primary/70 shadow-lg">
                      {community.imageUrl ? (
                        <img
                          src={community.imageUrl}
                          alt={community.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Users className="h-8 w-8 text-primary-foreground" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex items-center gap-2">
                        <h3 className="truncate text-xl font-bold text-foreground transition-colors group-hover:text-primary">
                          {community.name}
                        </h3>
                        {community.role === "OWNER" && (
                          <span className="flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-2 py-0.5 text-xs font-bold text-white">
                            <Crown className="h-3 w-3" />
                            Owner
                          </span>
                        )}
                        {community.isPrivate && (
                          <span className="flex items-center gap-1 rounded-full bg-gray-500 px-2 py-0.5 text-xs font-semibold text-white">
                            <Lock className="h-3 w-3" />
                            Private
                          </span>
                        )}
                      </div>
                      {community.description && (
                        <p className="line-clamp-1 text-sm text-muted-foreground">
                          {community.description}
                        </p>
                      )}
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-6 text-sm">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-foreground">{community._count.members.toLocaleString()}</div>
                        <div className="text-xs text-muted-foreground">Members</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-foreground">{community._count.posts}</div>
                        <div className="text-xs text-muted-foreground">Posts</div>
                      </div>
                    </div>

                    {/* Arrow */}
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary transition-all group-hover:bg-primary group-hover:text-primary-foreground">
                      <svg className="h-5 w-5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Empty State */
        <div className="flex min-h-[400px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-gradient-to-br from-card/50 to-accent/20 p-12 text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5">
            <Users className="h-10 w-10 text-primary" />
          </div>
          <h2 className="mb-2 text-2xl font-bold text-foreground">
            {searchQuery ? "No communities found" : "No communities yet"}
          </h2>
          <p className="mb-6 max-w-md text-muted-foreground">
            {searchQuery
              ? "Try adjusting your search or filters"
              : "Create your first community to start building your audience"}
          </p>
          <Link href="/dashboard/communities/new">
            <Button size="lg" className="bg-gradient-to-r from-primary to-primary/80 shadow-lg">
              <Plus className="mr-2 h-5 w-5" />
              Create Community
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
