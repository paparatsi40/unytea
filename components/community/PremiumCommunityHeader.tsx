"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CommunityActions } from "@/components/community/CommunityActions";
import { MessageCircle, Trophy, Users, Heart, TrendingUp, Hash, Settings, Crown } from "lucide-react";

type Community = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  coverImageUrl: string | null;
  isPrivate: boolean;
  _count: {
    members: number;
    posts: number;
  };
};

export function PremiumCommunityHeader({
  community,
  isMember,
  isOwner,
  isPending,
}: {
  community: Community;
  isMember: boolean;
  isOwner: boolean;
  isPending: boolean;
}) {
  const pathname = usePathname();

  return (
    <div className="border-b border-gray-100 bg-white">
      {/* Cover Image - Hidden on mobile */}
      <div className="relative h-32 md:h-48 bg-gradient-to-r from-purple-50 via-pink-50 to-purple-50">
        {community.coverImageUrl && (
          <img
            src={community.coverImageUrl}
            alt={community.name}
            className="h-full w-full object-cover opacity-60"
          />
        )}
      </div>

      {/* Header Content */}
      <div className="mx-auto max-w-6xl px-4 md:px-8">
        <div className="relative">
          {/* Community Icon - Smaller on mobile */}
          <div className="absolute -top-10 md:-top-16 flex h-20 w-20 md:h-32 md:w-32 items-center justify-center overflow-hidden rounded-xl md:rounded-2xl border-4 border-white bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg transition-transform hover:scale-105">
            {community.imageUrl ? (
              <img
                src={community.imageUrl}
                alt={community.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <Users className="h-10 w-10 md:h-16 md:w-16 text-white" />
            )}
          </div>

          {/* Header Info */}
          <div className="flex min-h-[80px] md:min-h-[120px] items-end justify-between py-4 md:py-6 pl-24 md:pl-40">
            <div className="flex-1">
              <div className="flex items-center space-x-2 md:space-x-3">
                <h1 className="text-xl md:text-3xl font-bold text-gray-900 truncate">
                  {community.name}
                </h1>
                {isOwner && (
                  <span className="inline-flex items-center space-x-1 rounded-lg bg-amber-50 px-2 md:px-2.5 py-0.5 md:py-1 text-xs font-semibold text-amber-700">
                    <Crown className="h-2.5 w-2.5 md:h-3 md:w-3" />
                    <span className="hidden md:inline">Owner</span>
                  </span>
                )}
                {community.isPrivate && (
                  <span className="rounded-lg bg-purple-50 px-2 md:px-2.5 py-0.5 md:py-1 text-xs font-semibold text-purple-700">
                    Private
                  </span>
                )}
                {isPending && (
                  <span className="rounded-lg bg-orange-50 px-2 md:px-2.5 py-0.5 md:py-1 text-xs font-semibold text-orange-700">
                    Pending Approval
                  </span>
                )}
              </div>
              {community.description && (
                <p className="mt-1 md:mt-2 max-w-2xl text-sm md:text-base text-gray-600 line-clamp-2 md:line-clamp-none">
                  {community.description}
                </p>
              )}

              {/* Stats - Smaller on mobile */}
              <div className="mt-2 md:mt-4 flex items-center space-x-4 md:space-x-6">
                <div className="flex items-center space-x-1.5 md:space-x-2 text-xs md:text-sm">
                  <Users className="h-3 w-3 md:h-4 md:w-4 text-gray-400" />
                  <span className="font-semibold text-gray-900">{community._count?.members || 0}</span>
                  <span className="text-gray-500 hidden sm:inline">members</span>
                </div>
                <div className="flex items-center space-x-1.5 md:space-x-2 text-xs md:text-sm">
                  <TrendingUp className="h-3 w-3 md:h-4 md:w-4 text-gray-400" />
                  <span className="font-semibold text-gray-900">{community._count?.posts || 0}</span>
                  <span className="text-gray-500 hidden sm:inline">posts</span>
                </div>
              </div>
            </div>

            {/* Actions - Smaller on mobile */}
            <div className="ml-2">
              <CommunityActions
                communityId={community.id}
                communitySlug={community.slug}
                isMember={isMember}
                isOwner={isOwner}
                isPending={isPending}
              />
            </div>
          </div>
        </div>

        {/* Navigation Tabs - Horizontal scroll on mobile */}
        <div className="flex space-x-1 overflow-x-auto scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
          <Link
            href={`/dashboard/c/${community.slug}`}
            className={`flex items-center space-x-1.5 md:space-x-2 border-b-2 px-3 md:px-4 py-2.5 md:py-3 text-xs md:text-sm font-medium transition-colors whitespace-nowrap ${
              pathname === `/dashboard/c/${community.slug}`
                ? "border-purple-600 text-purple-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            <Hash className="h-3.5 w-3.5 md:h-4 md:w-4" />
            <span>Feed</span>
          </Link>
          <Link
            href={`/dashboard/c/${community.slug}/chat`}
            className={`flex items-center space-x-1.5 md:space-x-2 border-b-2 px-3 md:px-4 py-2.5 md:py-3 text-xs md:text-sm font-medium transition-colors whitespace-nowrap ${
              pathname?.startsWith(`/dashboard/c/${community.slug}/chat`)
                ? "border-purple-600 text-purple-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            <MessageCircle className="h-3.5 w-3.5 md:h-4 md:w-4" />
            <span>Chat</span>
          </Link>
          <Link
            href={`/dashboard/c/${community.slug}/leaderboard`}
            className={`flex items-center space-x-1.5 md:space-x-2 border-b-2 px-3 md:px-4 py-2.5 md:py-3 text-xs md:text-sm font-medium transition-colors whitespace-nowrap ${
              pathname?.startsWith(`/dashboard/c/${community.slug}/leaderboard`)
                ? "border-purple-600 text-purple-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            <Trophy className="h-3.5 w-3.5 md:h-4 md:w-4" />
            <span className="hidden sm:inline">Leaderboard</span>
            <span className="sm:hidden">Rank</span>
          </Link>
          <Link
            href={`/dashboard/c/${community.slug}/buddy`}
            className={`flex items-center space-x-1.5 md:space-x-2 border-b-2 px-3 md:px-4 py-2.5 md:py-3 text-xs md:text-sm font-medium transition-colors whitespace-nowrap ${
              pathname?.startsWith(`/dashboard/c/${community.slug}/buddy`)
                ? "border-purple-600 text-purple-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            <Heart className="h-3.5 w-3.5 md:h-4 md:w-4" />
            <span>Buddy</span>
          </Link>
          <Link
            href={`/dashboard/c/${community.slug}/members`}
            className={`flex items-center space-x-1.5 md:space-x-2 border-b-2 px-3 md:px-4 py-2.5 md:py-3 text-xs md:text-sm font-medium transition-colors whitespace-nowrap ${
              pathname === `/dashboard/c/${community.slug}/members`
                ? "border-purple-600 text-purple-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            <Users className="h-3.5 w-3.5 md:h-4 md:w-4" />
            <span>Members</span>
          </Link>
          <Link
            href={`/dashboard/c/${community.slug}/about`}
            className={`flex items-center space-x-1.5 md:space-x-2 border-b-2 px-3 md:px-4 py-2.5 md:py-3 text-xs md:text-sm font-medium transition-colors whitespace-nowrap ${
              pathname === `/dashboard/c/${community.slug}/about`
                ? "border-purple-600 text-purple-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            <TrendingUp className="h-3.5 w-3.5 md:h-4 md:w-4" />
            <span>About</span>
          </Link>
        </div>
      </div>

      {/* Add styles for hiding scrollbar on mobile */}
      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
