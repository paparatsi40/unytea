"use client";

import { MessageSquare, Heart, User } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import Image from "next/image";

interface Post {
  id: string;
  title?: string;
  content: string;
  author: {
    id: string;
    name: string | null;
    image: string | null;
  };
  createdAt: Date;
  _count?: {
    comments: number;
    reactions: number;
  };
}

interface FeaturedPostsSectionProps {
  title?: string;
  posts: Post[];
  theme?: {
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
  };
}

export function FeaturedPostsSection({
  title = "Featured Posts",
  posts,
  theme,
}: FeaturedPostsSectionProps) {
  const primaryColor = theme?.primaryColor || "#0ea5e9";

  if (posts.length === 0) {
    return null;
  }

  return (
    <section>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold" style={{ color: primaryColor }}>
          {title}
        </h2>
        <a href="#" className="text-sm hover:underline" style={{ color: primaryColor }}>
          View all →
        </a>
      </div>

      {/* Posts Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {posts.slice(0, 6).map((post) => (
          <article
            key={post.id}
            className="cursor-pointer rounded-xl border border-gray-100 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md"
          >
            {/* Author */}
            <div className="mb-4 flex items-center gap-3">
              {post.author.image ? (
                <Image
                  src={post.author.image}
                  alt={post.author.name || "User"}
                  width={40}
                  height={40}
                  className="rounded-full"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200">
                  <User className="h-5 w-5 text-gray-500" />
                </div>
              )}
              <div>
                <div className="font-medium text-gray-900">{post.author.name || "Anonymous"}</div>
                <div className="text-xs text-gray-500">
                  {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                </div>
              </div>
            </div>

            {/* Title */}
            {post.title && (
              <h3 className="mb-2 line-clamp-2 text-lg font-semibold text-gray-900">
                {post.title}
              </h3>
            )}

            {/* Content Preview */}
            <p className="mb-4 line-clamp-3 text-sm text-gray-600">{post.content}</p>

            {/* Stats */}
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <div className="flex items-center gap-1">
                <Heart className="h-4 w-4" />
                <span>{post._count?.reactions || 0}</span>
              </div>
              <div className="flex items-center gap-1">
                <MessageSquare className="h-4 w-4" />
                <span>{post._count?.comments || 0}</span>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
