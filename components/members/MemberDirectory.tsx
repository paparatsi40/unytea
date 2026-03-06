"use client";

import { useState, useEffect } from "react";
import { Search, Users } from "lucide-react";
import { MemberCard } from "./MemberCard";
import { getCommunityMembers } from "@/app/actions/members";

type Props = {
  communityId: string;
};

export function MemberDirectory({ communityId }: Props) {
  const [members, setMembers] = useState<any[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"recent" | "points" | "level" | "name">("recent");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadMembers();
  }, [communityId, sortBy]);

  useEffect(() => {
    applyFilters();
  }, [search, statusFilter, members]);

  const loadMembers = async () => {
    setIsLoading(true);
    const result = await getCommunityMembers(communityId, { sortBy });
    if (result.success) {
      setMembers(result.members);
    }
    setIsLoading(false);
  };

  const applyFilters = () => {
    let filtered = [...members];

    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(m =>
        m.user.name?.toLowerCase().includes(searchLower) ||
        m.user.bio?.toLowerCase().includes(searchLower) ||
        m.user.tagline?.toLowerCase().includes(searchLower) ||
        m.user.skills?.some((s: string) => s.toLowerCase().includes(searchLower))
      );
    }

    if (statusFilter) {
      filtered = filtered.filter(m => m.user.availabilityStatus === statusFilter);
    }

    setFilteredMembers(filtered);
  };

  return (
    <div className="mx-auto max-w-7xl px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Members</h1>
        <p className="mt-2 text-gray-600">
          Connect with {members.length} amazing people in this community
        </p>
      </div>

      {/* Search & Filters */}
      <div className="mb-8 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, skills, or bio..."
            className="w-full rounded-lg border border-gray-300 py-2.5 md:py-3 pl-10 md:pl-12 pr-4 text-sm md:text-base focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 md:mb-8 flex flex-wrap items-center gap-3 md:gap-4">
        {/* Sort By */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-xs md:text-sm focus:border-purple-500 focus:outline-none"
        >
          <option value="recent">Recently Joined</option>
          <option value="points">Most Points</option>
          <option value="level">Highest Level</option>
          <option value="name">Name (A-Z)</option>
        </select>

        {/* Status Filters */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setStatusFilter(null)}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              statusFilter === null
                ? "bg-purple-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setStatusFilter("AVAILABLE")}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              statusFilter === "AVAILABLE"
                ? "bg-green-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            💚 Available
          </button>
          <button
            onClick={() => setStatusFilter("MENTORING")}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              statusFilter === "MENTORING"
                ? "bg-purple-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            💜 Mentoring
          </button>
        </div>

        {/* Results Count */}
        <div className="ml-auto flex items-center space-x-2 text-sm text-gray-600">
          <Users className="h-4 w-4" />
          <span>{filteredMembers.length} members</span>
        </div>
      </div>

      {/* Members Grid - Responsive */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse rounded-xl border border-gray-200 bg-white p-4 md:p-6">
              <div className="flex items-center space-x-3 md:space-x-4">
                <div className="h-14 w-14 md:h-16 md:w-16 rounded-full bg-gray-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-24 rounded bg-gray-200" />
                  <div className="h-3 w-16 rounded bg-gray-200" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredMembers.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center text-center">
          <Users className="h-12 w-12 md:h-16 md:w-16 text-gray-300" />
          <p className="mt-4 text-base md:text-lg font-medium text-gray-600">No members found</p>
          <p className="text-sm text-gray-500">Try adjusting your search or filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {filteredMembers.map((member) => (
            <MemberCard key={member.id} member={member} />
          ))}
        </div>
      )}
    </div>
  );
}
