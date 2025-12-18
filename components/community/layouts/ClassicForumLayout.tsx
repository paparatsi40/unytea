"use client";

import { MessageSquare, ThumbsUp, Eye, Pin, User, Calendar } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

interface ClassicForumLayoutProps {
  community: {
    id: string;
    name: string;
    slug: string;
    description?: string | null;
    imageUrl?: string | null;
    primaryColor?: string | null;
    secondaryColor?: string | null;
    accentColor?: string | null;
    heroTitle?: string | null;
    heroSubtitle?: string | null;
    aboutSection?: string | null;
    showStats?: boolean;
    _count?: {
      members: number;
      posts: number;
      courses: number;
    };
  };
  posts?: any[];
  members?: any[];
  pinnedPosts?: any[];
}

export function ClassicForumLayout({
  community,
  posts = [],
  members = [],
  pinnedPosts = [],
}: ClassicForumLayoutProps) {
  const primaryColor = community.primaryColor || "#8B5CF6";
  const accentColor = community.accentColor || "#F59E0B";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Bar */}
      <div className="border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            {/* Community Icon */}
            {community.imageUrl && (
              <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl border-2 border-gray-200">
                <Image
                  src={community.imageUrl}
                  alt={community.name}
                  width={64}
                  height={64}
                  className="object-cover"
                />
              </div>
            )}

            {/* Community Info */}
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">
                {community.heroTitle || community.name}
              </h1>
              {(community.heroSubtitle || community.description) && (
                <p className="mt-1 text-sm text-gray-600">
                  {community.heroSubtitle || community.description}
                </p>
              )}
            </div>

            {/* Stats */}
            {community.showStats && community._count && (
              <div className="hidden items-center gap-6 md:flex">
                <div className="text-center">
                  <div className="text-xl font-bold text-gray-900">
                    {community._count.members}
                  </div>
                  <div className="text-xs text-gray-500">Members</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-gray-900">
                    {community._count.posts}
                  </div>
                  <div className="text-xs text-gray-500">Posts</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-4">
          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* About Section */}
            {community.aboutSection && (
              <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="mb-3 text-lg font-semibold text-gray-900">
                  About this community
                </h2>
                <div
                  className="prose prose-sm max-w-none text-gray-600"
                  dangerouslySetInnerHTML={{ __html: community.aboutSection }}
                />
              </div>
            )}

            {/* Pinned Posts */}
            {pinnedPosts.length > 0 && (
              <div className="mb-6">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <Pin className="h-4 w-4" />
                  Pinned Posts
                </div>
                <div className="space-y-2">
                  {pinnedPosts.map((post) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      communitySlug={community.slug}
                      primaryColor={primaryColor}
                      accentColor={accentColor}
                      isPinned
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Regular Posts */}
            <div className="space-y-2">
              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  communitySlug={community.slug}
                  primaryColor={primaryColor}
                  accentColor={accentColor}
                />
              ))}
            </div>

            {/* Load More */}
            {posts.length >= 20 && (
              <div className="mt-6 text-center">
                <button
                  className="rounded-lg border border-gray-300 bg-white px-6 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                >
                  Load more posts
                </button>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="space-y-6 lg:sticky lg:top-6">
              {/* Community Stats */}
              <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                <h3 className="mb-4 text-sm font-semibold text-gray-900">
                  Community Stats
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Members</span>
                    <span className="font-semibold text-gray-900">
                      {community._count?.members || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Posts</span>
                    <span className="font-semibold text-gray-900">
                      {community._count?.posts || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Courses</span>
                    <span className="font-semibold text-gray-900">
                      {community._count?.courses || 0}
                    </span>
                  </div>
                </div>
              </div>

              {/* Top Contributors */}
              {members.length > 0 && (
                <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                  <h3 className="mb-4 text-sm font-semibold text-gray-900">
                    Top Contributors
                  </h3>
                  <div className="space-y-3">
                    {members.slice(0, 5).map((member, index) => (
                      <div key={member.id} className="flex items-center gap-3">
                        <div
                          className="flex h-6 w-6 items-center justify-center rounded text-xs font-bold"
                          style={{
                            backgroundColor: index < 3 ? accentColor : '#E5E7EB',
                            color: index < 3 ? 'white' : '#6B7280',
                          }}
                        >
                          {index + 1}
                        </div>
                        {member.user?.image && (
                          <Image
                            src={member.user.image}
                            alt={member.user.name || "User"}
                            width={32}
                            height={32}
                            className="rounded-full"
                          />
                        )}
                        <div className="flex-1 overflow-hidden">
                          <div className="truncate text-sm font-medium text-gray-900">
                            {member.user?.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {member.points} points
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Links */}
              <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                <h3 className="mb-4 text-sm font-semibold text-gray-900">
                  Quick Links
                </h3>
                <div className="space-y-2">
                  <Link
                    href={`/dashboard/c/${community.slug}/posts/new`}
                    className="block rounded-lg px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    Create Post
                  </Link>
                  <Link
                    href={`/dashboard/c/${community.slug}/courses`}
                    className="block rounded-lg px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    Browse Courses
                  </Link>
                  <Link
                    href={`/dashboard/c/${community.slug}/members`}
                    className="block rounded-lg px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    View Members
                  </Link>
                  <Link
                    href={`/dashboard/c/${community.slug}/leaderboard`}
                    className="block rounded-lg px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    Leaderboard
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Post Card Component
function PostCard({
  post,
  communitySlug,
  primaryColor,
  accentColor,
  isPinned = false,
}: {
  post: any;
  communitySlug: string;
  primaryColor: string;
  accentColor: string;
  isPinned?: boolean;
}) {
  return (
    <Link href={`/dashboard/c/${communitySlug}/posts/${post.id}`}>
      <div
        className={`group flex gap-4 rounded-lg border bg-white p-4 transition-all hover:border-gray-300 hover:shadow-md ${
          isPinned ? 'border-amber-200 bg-amber-50' : 'border-gray-200'
        }`}
      >
        {/* Vote Section */}
        <div className="flex flex-col items-center gap-1 text-center">
          <button
            className="rounded p-1 transition-colors hover:bg-gray-100"
            onClick={(e) => e.preventDefault()}
          >
            <ThumbsUp className="h-4 w-4 text-gray-400" />
          </button>
          <span className="text-sm font-semibold text-gray-900">
            {post._count?.reactions || 0}
          </span>
        </div>

        {/* Post Content */}
        <div className="flex-1 overflow-hidden">
          {/* Header */}
          <div className="mb-2 flex items-center gap-2 text-xs text-gray-500">
            {isPinned && (
              <span className="flex items-center gap-1 font-semibold text-amber-600">
                <Pin className="h-3 w-3" />
                Pinned
              </span>
            )}
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {post.author?.name || "Unknown"}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {new Date(post.createdAt).toLocaleDateString()}
            </span>
          </div>

          {/* Title */}
          <h3
            className="mb-1 text-base font-semibold text-gray-900 group-hover:underline"
            style={{ color: post.title ? undefined : '#6B7280' }}
          >
            {post.title || "Untitled Post"}
          </h3>

          {/* Preview */}
          <p className="mb-3 line-clamp-2 text-sm text-gray-600">
            {post.content}
          </p>

          {/* Footer Stats */}
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <MessageSquare className="h-3.5 w-3.5" />
              {post._count?.comments || 0} comments
            </span>
            <span className="flex items-center gap-1">
              <Eye className="h-3.5 w-3.5" />
              {post.viewCount || 0} views
            </span>
            {post.contentType && (
              <span
                className="rounded-full px-2 py-0.5 text-xs font-medium"
                style={{
                  backgroundColor: `${primaryColor}15`,
                  color: primaryColor,
                }}
              >
                {post.contentType}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
