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
      <div className="flex items-center justify-between mb-6">
        <h2 
          className="text-2xl font-bold"
          style={{ color: primaryColor }}
        >
          {title}
        </h2>
        <a 
          href="#" 
          className="text-sm hover:underline"
          style={{ color: primaryColor }}
        >
          View all →
        </a>
      </div>

      {/* Posts Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {posts.slice(0, 6).map((post) => (
          <article
            key={post.id}
            className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all hover:-translate-y-1 cursor-pointer"
          >
            {/* Author */}
            <div className="flex items-center gap-3 mb-4">
              {post.author.image ? (
                <Image
                  src={post.author.image}
                  alt={post.author.name || "User"}
                  width={40}
                  height={40}
                  className="rounded-full"
                />
              ) : (
                <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                  <User className="h-5 w-5 text-gray-500" />
                </div>
              )}
              <div>
                <div className="font-medium text-gray-900">
                  {post.author.name || "Anonymous"}
                </div>
                <div className="text-xs text-gray-500">
                  {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                </div>
              </div>
            </div>

            {/* Title */}
            {post.title && (
              <h3 className="font-semibold text-lg text-gray-900 mb-2 line-clamp-2">
                {post.title}
              </h3>
            )}

            {/* Content Preview */}
            <p className="text-gray-600 text-sm line-clamp-3 mb-4">
              {post.content}
            </p>

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