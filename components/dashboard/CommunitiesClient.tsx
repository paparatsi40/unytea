"use client";

import { useEffect, useState } from "react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Plus, Users, TrendingUp, Crown, Lock, Loader2, Search, Grid3x3, List, Filter, Sparkles, Heart, Dumbbell, Briefcase, Code, BookOpen, Palette, Flame, Star, Calendar, MessageSquare, Video, GraduationCap, DollarSign, X, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FeaturedCommunityCard } from "@/components/dashboard/FeaturedCommunityCard";

type Community = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  coverImageUrl: string | null;
  isPrivate: boolean;
  isPaid?: boolean;
  memberCount?: number;
  role: string;
  _count: {
    members: number;
    posts: number;
  };
};

type PublicCommunity = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  coverImageUrl: string | null;
  isPaid: boolean;
  memberCount: number;
  postCount: number;
  isMember: boolean;
  owner: {
    firstName: string | null;
    lastName: string | null;
    image: string | null;
  };
};

// Categories for filtering
const categories = [
  { name: "All", icon: Users, color: "from-gray-500 to-gray-600" },
  { name: "Spiritual", icon: Sparkles, color: "from-purple-500 to-pink-500" },
  { name: "Fitness", icon: Dumbbell, color: "from-green-500 to-emerald-500" },
  { name: "Business", icon: Briefcase, color: "from-blue-500 to-cyan-500" },
  { name: "Technology", icon: Code, color: "from-indigo-500 to-purple-500" },
  { name: "Education", icon: BookOpen, color: "from-orange-500 to-red-500" },
  { name: "Creative", icon: Palette, color: "from-pink-500 to-rose-500" },
];

const sizeFilters = [
  { label: "All Sizes", value: "all" },
  { label: "Small (<100)", value: "small", min: 0, max: 100 },
  { label: "Medium (100-1k)", value: "medium", min: 100, max: 1000 },
  { label: "Large (>1k)", value: "large", min: 1000, max: Infinity },
];

export function CommunitiesClient() {
  const { user, isLoading } = useCurrentUser();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Tab state - set tab from searchParams in initialState
  const tabParam = searchParams.get("tab");
  const initialTab = tabParam === "discover" ? "discover" : "yours";
  const [activeTab, setActiveTab] = useState<"yours" | "discover">(initialTab);

  // UI States - Your Communities
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"recent" | "members" | "posts" | "name">("recent");
  const [filterPrivacy, setFilterPrivacy] = useState<"all" | "public" | "private">("all");

  // UI States - Discover
  const [discoverSearchQuery, setDiscoverSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedSize, setSelectedSize] = useState("all");
  const [selectedType, setSelectedType] = useState<"all" | "free" | "paid">("all");
  const [discoverSortBy, setDiscoverSortBy] = useState<"popular" | "recent" | "active" | "name">("popular");
  const [showFilters, setShowFilters] = useState(false);

  // Data states
  const [communities, setCommunities] = useState<Community[]>([]);
  const [publicCommunities, setPublicCommunities] = useState<PublicCommunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPublic, setLoadingPublic] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync tab with URL - MUST BE BEFORE OTHER useEffects
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "discover") {
      setActiveTab("discover");
    } else {
      setActiveTab("yours");
    }
  }, [searchParams]);

  // Fetch user's communities
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

  // Fetch public communities when Discover tab is opened
  useEffect(() => {
    async function fetchPublicCommunities() {
      if (activeTab !== "discover" || publicCommunities.length > 0) return;

      setLoadingPublic(true);
      try {
        const response = await fetch('/api/communities/public');

        if (!response.ok) {
          throw new Error("Failed to fetch public communities");
        }

        const data = await response.json();
        setPublicCommunities(data.communities || []);
      } catch (err) {
        console.error("❌ Error fetching public communities:", err);
      } finally {
        setLoadingPublic(false);
      }
    }

    fetchPublicCommunities();
  }, [activeTab, publicCommunities.length]);

  // Filter and sort user's communities
  const filteredCommunities = communities
    .filter((c) => {
      if (searchQuery && !c.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
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

  // Filter and sort public communities
  const filteredPublicCommunities = publicCommunities
    .filter((c) => {
      // Search filter
      if (discoverSearchQuery && !c.name.toLowerCase().includes(discoverSearchQuery.toLowerCase())) {
        return false;
      }

      // Category filter (would need category field in DB)
      // For now, we'll skip this until category is added to schema

      // Size filter
      if (selectedSize !== "all") {
        const sizeFilter = sizeFilters.find(f => f.value === selectedSize);
        if (sizeFilter && sizeFilter.min !== undefined && sizeFilter.max !== undefined) {
          if (c.memberCount < sizeFilter.min || c.memberCount >= sizeFilter.max) {
            return false;
          }
        }
      }

      // Type filter
      if (selectedType === "free" && c.isPaid) return false;
      if (selectedType === "paid" && !c.isPaid) return false;

      return true;
    })
    .sort((a, b) => {
      switch (discoverSortBy) {
        case "popular":
          return b.memberCount - a.memberCount;
        case "active":
          return b.postCount - a.postCount;
        case "name":
          return a.name.localeCompare(b.name);
        case "recent":
        default:
          return 0;
      }
    });

  // Calculate stats
  const totalMembers = communities.reduce((sum, c) => sum + c._count.members, 0);
  const ownedCommunities = communities.filter((c) => c.role === "OWNER").length;
  const totalPosts = communities.reduce((sum, c) => sum + c._count.posts, 0);

  return (
    <div className="space-y-8">
      {/* 🎨 HEADER WITH TABS */}
      <div className="space-y-6">
        {/* Title & Create Button */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-foreground">Communities</h1>
            <p className="mt-2 text-muted-foreground">
              Manage your communities or discover new ones
            </p>
          </div>
          <Link href="/dashboard/communities/new">
            <Button size="lg" className="bg-gradient-to-r from-primary to-primary/80 shadow-lg">
              <Plus className="mr-2 h-5 w-5" />
              Create Community
            </Button>
          </Link>
        </div>

        {/* TABS */}
        <div className="flex items-center gap-2 border-b border-border">
          <button
            onClick={() => setActiveTab("yours")}
            className={`relative px-6 py-3 font-semibold transition-colors ${
              activeTab === "yours"
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            My Communities
            <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
              {communities.length}
            </span>
            {activeTab === "yours" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>

          <button
            onClick={() => setActiveTab("discover")}
            className={`relative px-6 py-3 font-bold transition-colors ${
              activeTab === "discover"
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Discover Communities
            <span className="ml-2 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 px-2.5 py-0.5 text-xs font-bold text-white shadow-md">
              NUEVO
            </span>
            {activeTab === "discover" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
        </div>
      </div>

      {/* TAB CONTENT */}
      {isLoading || loading ? (
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-center">
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
            <p className="mt-4 text-muted-foreground">Loading communities...</p>
          </div>
        </div>
      ) : error ? (
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-foreground">Error loading communities</h2>
            <p className="mt-2 text-muted-foreground">{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-4 inline-flex items-center justify-center rounded-md bg-primary px-8 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      ) : (
        <div>
          {activeTab === "yours" ? (
            /* YOUR COMMUNITIES TAB */
            <div className="space-y-8">
              {/* 🔍 SEARCH & FILTERS */}
              <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm lg:flex-row lg:items-center lg:justify-between">
                {/* Search */}
                <div className="relative flex-1 lg:max-w-md">
                  <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search your communities..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pl-10 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  />
                </div>

                {/* Filters & Sort */}
                <div className="flex flex-wrap items-center gap-3">
                  <select
                    value={filterPrivacy}
                    onChange={(e) => setFilterPrivacy(e.target.value as any)}
                    className="rounded-lg border border-border bg-background px-4 py-2 text-sm"
                  >
                    <option value="all">All Communities</option>
                    <option value="public">Public</option>
                    <option value="private">Private</option>
                  </select>

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

              {/* COMMUNITIES GRID/LIST */}
              {filteredCommunities.length > 0 ? (
                <div>
                  <h2 className="mb-6 text-2xl font-bold text-foreground">
                    {searchQuery ? `Search Results (${filteredCommunities.length})` : "Your Communities"}
                  </h2>
                  
                  {viewMode === "grid" ? (
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                      {filteredCommunities.map((community, index) => (
                        <Link
                          key={community.id}
                          href={`/dashboard/communities/${community.slug}/feed`}
                          className="group relative"
                        >
                          <div className="relative overflow-hidden rounded-3xl border-2 border-border bg-card shadow-xl transition-all duration-500 hover:scale-[1.02] hover:border-primary/50 hover:shadow-2xl hover:shadow-primary/20">
                            {/* Cover Image */}
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
                              
                              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                              
                              {/* Badges */}
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
                              <div className="absolute bottom-4 left-4 flex items-center gap-3 text-white">
                                <div className="flex items-center gap-1.5 rounded-full bg-black/40 px-3 py-1.5 backdrop-blur-md">
                                  <Users className="h-4 w-4" />
                                  <span className="text-sm font-semibold">{community._count.members}</span>
                                </div>
                                <div className="flex items-center gap-1.5 rounded-full bg-black/40 px-3 py-1.5 backdrop-blur-md">
                                  <TrendingUp className="h-4 w-4" />
                                  <span className="text-sm font-semibold">{community._count.posts}</span>
                                </div>
                              </div>
                            </div>

                            {/* Content */}
                            <div className="p-6">
                              <div className="mb-4 flex items-start gap-4">
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
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filteredCommunities.map((community) => (
                        <Link
                          key={community.id}
                          href={`/dashboard/communities/${community.slug}/feed`}
                          className="group"
                        >
                          <div className="flex items-center gap-6 overflow-hidden rounded-2xl border-2 border-border bg-card p-6 shadow-lg transition-all hover:scale-[1.01] hover:border-primary/50 hover:shadow-xl">
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

                            <div className="min-w-0 flex-1">
                              <div className="mb-2 flex items-center gap-2">
                                <h3 className="truncate text-xl font-bold text-foreground">
                                  {community.name}
                                </h3>
                                {community.role === "OWNER" && (
                                  <Crown className="h-4 w-4 text-amber-500" />
                                )}
                                {community.isPrivate && (
                                  <Lock className="h-4 w-4 text-muted-foreground" />
                                )}
                              </div>
                              {community.description && (
                                <p className="line-clamp-1 text-sm text-muted-foreground">
                                  {community.description}
                                </p>
                              )}
                            </div>

                            <div className="flex items-center gap-6">
                              <div className="text-center">
                                <div className="text-2xl font-bold">{community._count.members}</div>
                                <div className="text-xs text-muted-foreground">Members</div>
                              </div>
                              <div className="text-center">
                                <div className="text-2xl font-bold">{community._count.posts}</div>
                                <div className="text-xs text-muted-foreground">Posts</div>
                              </div>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex min-h-[400px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-card/50 p-12 text-center">
                  <Users className="mb-4 h-16 w-16 text-muted-foreground" />
                  <h3 className="mb-2 text-2xl font-bold">
                    {searchQuery ? "No communities found" : "No communities yet"}
                  </h3>
                  <p className="mb-6 text-muted-foreground">
                    {searchQuery
                      ? "Try adjusting your search"
                      : "Create your first community to get started"}
                  </p>
                  {!searchQuery && (
                    <Link href="/dashboard/communities/new">
                      <Button size="lg">
                        <Plus className="mr-2 h-5 w-5" />
                        Create Community
                      </Button>
                    </Link>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* DISCOVER TAB */
            <div className="space-y-8">
              {/* ADVANCED FILTERS */}
              <div className="space-y-4">
                {/* Search Bar */}
                <div className="flex items-center gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search public communities..."
                      value={discoverSearchQuery}
                      onChange={(e) => setDiscoverSearchQuery(e.target.value)}
                      className="w-full rounded-xl border border-border bg-background py-3 pl-12 pr-4 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <Button
                    variant={showFilters ? "default" : "outline"}
                    onClick={() => setShowFilters(!showFilters)}
                    className="flex items-center gap-2"
                  >
                    <Filter className="h-4 w-4" />
                    Filters
                    {(selectedSize !== "all" || selectedType !== "all") && (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                        {(selectedSize !== "all" ? 1 : 0) + (selectedType !== "all" ? 1 : 0)}
                      </span>
                    )}
                  </Button>
                </div>

                {/* Filter Panel */}
                {showFilters && (
                  <div className="rounded-xl border border-border bg-card p-6 shadow-lg">
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="text-lg font-semibold">Filters</h3>
                      <button
                        onClick={() => {
                          setSelectedSize("all");
                          setSelectedType("all");
                          setSelectedCategory("All");
                        }}
                        className="text-sm text-muted-foreground hover:text-foreground"
                      >
                        Clear all
                      </button>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                      {/* Community Size */}
                      <div>
                        <label className="mb-2 block text-sm font-medium">Community Size</label>
                        <select
                          value={selectedSize}
                          onChange={(e) => setSelectedSize(e.target.value)}
                          className="w-full rounded-lg border border-border bg-background px-4 py-2"
                        >
                          {sizeFilters.map((filter) => (
                            <option key={filter.value} value={filter.value}>
                              {filter.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Community Type */}
                      <div>
                        <label className="mb-2 block text-sm font-medium">Membership</label>
                        <select
                          value={selectedType}
                          onChange={(e) => setSelectedType(e.target.value as any)}
                          className="w-full rounded-lg border border-border bg-background px-4 py-2"
                        >
                          <option value="all">All Types</option>
                          <option value="free">Free</option>
                          <option value="paid">Paid</option>
                        </select>
                      </div>

                      {/* Sort By */}
                      <div>
                        <label className="mb-2 block text-sm font-medium">Sort By</label>
                        <select
                          value={discoverSortBy}
                          onChange={(e) => setDiscoverSortBy(e.target.value as any)}
                          className="w-full rounded-lg border border-border bg-background px-4 py-2"
                        >
                          <option value="popular">Most Popular</option>
                          <option value="active">Most Active</option>
                          <option value="recent">Recently Created</option>
                          <option value="name">Alphabetical</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Category Pills */}
                <div className="flex flex-wrap gap-2">
                  {categories.map((category) => {
                    const Icon = category.icon;
                    const isSelected = selectedCategory === category.name;
                    
                    return (
                      <button
                        key={category.name}
                        onClick={() => setSelectedCategory(category.name)}
                        className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all ${
                          isSelected
                            ? `bg-gradient-to-r ${category.color} text-white shadow-lg`
                            : "border border-border bg-background text-muted-foreground hover:border-primary hover:text-foreground"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        {category.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* FEATURED COMMUNITIES CAROUSEL */}
              <div>
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                      <Sparkles className="h-6 w-6 text-primary" />
                      Comunidades Destacadas
                    </h2>
                    <p className="text-base text-muted-foreground mt-1">
                      Comunidades populares que podrían gustarte
                    </p>
                  </div>
                </div>

                {/* 3D Carousel Container with Perspective */}
                <div className="relative mb-12" style={{ perspective: '1000px' }}>
                  <div className="flex gap-6 overflow-x-auto pb-6 px-2 scroll-smooth snap-x snap-mandatory scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent hover:scrollbar-thumb-primary/40">
                    {/* Featured Community Cards with 3D Effect */}
                    {[
                      { 
                        name: 'Tech Innovators', 
                        category: 'Technology', 
                        members: 1234, 
                        color: 'from-blue-500 to-cyan-500',
                        image: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800&h=600&fit=crop',
                        description: 'Join developers and tech enthusiasts'
                      },
                      { 
                        name: 'Fitness Warriors', 
                        category: 'Health & Fitness', 
                        members: 892, 
                        color: 'from-green-500 to-emerald-500',
                        image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&h=600&fit=crop',
                        description: 'Transform your body and mind'
                      },
                      { 
                        name: 'Creative Minds', 
                        category: 'Art & Design', 
                        members: 2156, 
                        color: 'from-pink-500 to-rose-500',
                        image: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=800&h=600&fit=crop',
                        description: 'Unleash your creative potential'
                      },
                      { 
                        name: 'Business Leaders', 
                        category: 'Business & Entrepreneurship', 
                        members: 1543, 
                        color: 'from-purple-500 to-indigo-500',
                        image: 'https://images.unsplash.com/photo-1556761175-b413da4baf72?w=800&h=600&fit=crop',
                        description: 'Network with industry leaders'
                      },
                      { 
                        name: 'Language Learners', 
                        category: 'Education & Languages', 
                        members: 987, 
                        color: 'from-orange-500 to-red-500',
                        image: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=800&h=600&fit=crop',
                        description: 'Master any language together'
                      },
                      { 
                        name: 'Mindful Living', 
                        category: 'Wellness & Spirituality', 
                        members: 1678, 
                        color: 'from-violet-500 to-purple-500',
                        image: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&h=600&fit=crop',
                        description: 'Find peace and balance'
                      },
                    ].map((community, index) => (
                      <FeaturedCommunityCard 
                        key={index}
                        community={community}
                        locale="en"
                      />
                    ))}
                  </div>

                  {/* Scroll Indicators */}
                  <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 flex gap-2">
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="h-1.5 w-8 rounded-full bg-border transition-all hover:bg-primary" />
                    ))}
                  </div>
                </div>
              </div>

              {/* Loading State */}
              {loadingPublic ? (
                <div className="flex min-h-[400px] items-center justify-center">
                  <div className="text-center">
                    <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
                    <p className="mt-4 text-muted-foreground">Discovering communities...</p>
                  </div>
                </div>
              ) : filteredPublicCommunities.length > 0 ? (
                <div>
                  <div className="mb-6 flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold text-foreground">
                        Public Communities
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        {filteredPublicCommunities.length} communities found
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredPublicCommunities.map((community) => (
                      <div
                        key={community.id}
                        className="group relative overflow-hidden rounded-3xl border-2 border-border bg-card shadow-xl transition-all duration-500 hover:scale-[1.02] hover:border-primary/50 hover:shadow-2xl"
                      >
                        {/* Cover Image */}
                        <div className="relative h-40 overflow-hidden">
                          {community.coverImageUrl ? (
                            <img
                              src={community.coverImageUrl}
                              alt={community.name}
                              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                            />
                          ) : (
                            <div className="h-full w-full bg-gradient-to-br from-primary/20 to-purple-500/20" />
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                          
                          {/* Badges */}
                          <div className="absolute right-4 top-4 flex flex-col gap-2">
                            {community.isPaid && (
                              <div className="flex items-center gap-1 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 px-3 py-1 text-xs font-bold text-white">
                                <DollarSign className="h-3 w-3" />
                                Paid
                              </div>
                            )}
                          </div>

                          {/* Stats */}
                          <div className="absolute bottom-3 left-3 flex items-center gap-2">
                            <div className="flex items-center gap-1 rounded-full bg-black/40 px-2 py-1 text-xs text-white backdrop-blur-md">
                              <Users className="h-3 w-3" />
                              <span>{community.memberCount}</span>
                            </div>
                            <div className="flex items-center gap-1 rounded-full bg-black/40 px-2 py-1 text-xs text-white backdrop-blur-md">
                              <TrendingUp className="h-3 w-3" />
                              <span>{community.postCount}</span>
                            </div>
                          </div>
                        </div>

                        {/* Content */}
                        <div className="p-6">
                          {/* Logo */}
                          <div className="relative -mt-14 mb-4">
                            <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl border-4 border-background bg-gradient-to-br from-primary to-primary/70 shadow-lg">
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

                          {/* Owner Info */}
                          <div className="mb-4 flex items-center gap-2 text-xs text-muted-foreground">
                            <span>by</span>
                            {community.owner.image ? (
                              <img
                                src={community.owner.image}
                                alt="Owner"
                                className="h-5 w-5 rounded-full"
                              />
                            ) : (
                              <div className="h-5 w-5 rounded-full bg-primary/20" />
                            )}
                            <span className="font-medium">
                              {community.owner.firstName} {community.owner.lastName}
                            </span>
                          </div>

                          {/* Action Button */}
                          {community.isMember ? (
                            <Link href={`/dashboard/communities/${community.slug}/feed`}>
                              <Button className="w-full" variant="outline">
                                View Community
                              </Button>
                            </Link>
                          ) : (
                            <Link href={`/dashboard/communities/${community.slug}`}>
                              <Button className="w-full bg-gradient-to-r from-primary to-primary/80">
                                <span className="mr-2">Learn More</span>
                                <ArrowRight className="h-4 w-4" />
                              </Button>
                            </Link>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex min-h-[400px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-card/50 p-12 text-center">
                  <Sparkles className="mb-4 h-16 w-16 text-muted-foreground" />
                  <h3 className="mb-2 text-2xl font-bold">
                    {discoverSearchQuery ? "No communities found" : "No public communities yet"}
                  </h3>
                  <p className="text-muted-foreground">
                    {discoverSearchQuery
                      ? "Try different search terms or filters"
                      : "Be the first to create a public community!"}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
