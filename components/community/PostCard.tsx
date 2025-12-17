"use client";

import { useState } from "react";
import { PostReactions } from "@/components/community/PostReactions";
import { MessageSquare, Share2, Sparkles, Check } from "lucide-react";
import { cn } from "@/lib/utils";

type Post = {
  id: string;
  title: string | null;
  content: string;
  createdAt: Date;
  author: {
    id: string;
    username?: string | null;
    name?: string | null;
    firstName: string | null;
    lastName: string | null;
    imageUrl: string | null;
  };
  _count?: {
    comments: number;
    reactions: number;
  };
};

interface PostCardProps {
  post: Post;
  index?: number;
}

export function PostCard({ post, index = 0 }: PostCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const getAuthorName = (author: Post["author"]) => {
    // Priority 1: Username (public display name chosen by user)
    if (author.username) {
      return author.username;
    }
    // Priority 2: Full name (firstName + lastName)
    if (author.firstName && author.lastName) {
      return `${author.firstName} ${author.lastName}`;
    }
    // Priority 3: Just firstName
    if (author.firstName) {
      return author.firstName;
    }
    // Priority 4: Name field (fallback)
    if (author.name) {
      return author.name;
    }
    // Last resort
    return "User";
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(date).toLocaleDateString();
  };

  const handleShare = async () => {
    try {
      const postUrl = `${window.location.origin}${window.location.pathname}?post=${post.id}`;
      
      // Try to use native share API if available (mobile)
      if (navigator.share) {
        await navigator.share({
          title: post.title || `Post by ${getAuthorName(post.author)}`,
          text: post.content.slice(0, 100) + (post.content.length > 100 ? "..." : ""),
          url: postUrl,
        });
      } else {
        // Fallback to clipboard
        await navigator.clipboard.writeText(postUrl);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      }
    } catch (error) {
      console.error("Error sharing:", error);
    }
  };

  return (
    <div
      className="group relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-card via-card to-card/80 shadow-lg transition-all hover:border-primary/20 hover:shadow-2xl animate-in fade-in slide-in-from-bottom-8 duration-500"
      style={{ animationDelay: `${index * 100}ms` }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Animated Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/5 to-primary/0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      
      {/* Sparkle Effects with CSS */}
      {isHovered && (
        <>
          <div className="absolute top-4 right-4 animate-ping">
            <Sparkles className="h-6 w-6 text-amber-400 opacity-60" />
          </div>
          <div className="absolute bottom-6 left-6 animate-pulse" style={{ animationDelay: '200ms' }}>
            <Sparkles className="h-4 w-4 text-blue-400 opacity-40" />
          </div>
          <div className="absolute top-1/2 right-12 animate-bounce" style={{ animationDelay: '400ms', animationDuration: '2s' }}>
            <Sparkles className="h-4 w-4 text-purple-400 opacity-50" />
          </div>
        </>
      )}

      {/* Shimmer Effect */}
      <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <div className="relative p-8">
        {/* Post Header */}
        <div className="mb-6 flex items-start justify-between">
          <div className="flex items-center space-x-4">
            {post.author.imageUrl ? (
              <div className="relative">
                <img
                  src={post.author.imageUrl}
                  alt={getAuthorName(post.author)}
                  className={cn(
                    "h-12 w-12 rounded-2xl border-2 border-primary/10 object-cover shadow-lg ring-2 ring-primary/5 transition-all duration-300",
                    isHovered && "scale-110 ring-primary/20 shadow-2xl"
                  )}
                />
                {/* Online indicator with pulse */}
                <div className="absolute -bottom-0.5 -right-0.5">
                  <span className="relative flex h-3 w-3">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex h-3 w-3 rounded-full bg-green-500 ring-2 ring-background"></span>
                  </span>
                </div>
              </div>
            ) : (
              <div className={cn(
                "flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-primary/10 bg-gradient-to-br from-primary/20 to-primary/10 shadow-lg transition-all duration-300",
                isHovered && "scale-110 shadow-2xl"
              )}>
                <span className="text-sm font-bold text-primary">
                  {post.author.firstName?.[0] || "U"}
                </span>
              </div>
            )}
            <div>
              <p className={cn(
                "font-bold text-foreground transition-colors duration-300",
                isHovered && "text-primary"
              )}>
                {getAuthorName(post.author)}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatTime(post.createdAt)}
              </p>
            </div>
          </div>
          <button 
            onClick={handleShare}
            className={cn(
              "rounded-xl p-2.5 transition-all hover:bg-accent active:scale-95 group-hover:opacity-100",
              isCopied 
                ? "opacity-100 bg-green-500/10 text-green-500" 
                : "text-muted-foreground opacity-0 hover:text-foreground"
            )}
            title={isCopied ? "Link copied!" : "Share post"}
          >
            {isCopied ? (
              <Check className="h-4 w-4" />
            ) : (
              <Share2 className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* Post Content */}
        {post.title && (
          <h3 className="mb-3 text-2xl font-bold text-foreground transition-colors duration-300 group-hover:text-primary/90">
            {post.title}
          </h3>
        )}
        <p className="mb-6 whitespace-pre-wrap text-foreground/90 leading-relaxed text-[15px]">
          {post.content}
        </p>

        {/* Post Actions */}
        <div className="flex items-center justify-between rounded-2xl border border-border/50 bg-accent/30 p-4 backdrop-blur-sm transition-all duration-300 group-hover:border-primary/20 group-hover:bg-accent/50">
          <div className="flex items-center space-x-4">
            {/* Reactions Component with stagger animation */}
            <div className="animate-in fade-in slide-in-from-left-4 duration-300" style={{ animationDelay: `${index * 100 + 100}ms` }}>
              <PostReactions postId={post.id} />
            </div>

            {/* Comments Button */}
            <button 
              className="group/btn flex items-center space-x-2 rounded-xl px-4 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:bg-blue-500/10 hover:text-blue-500 active:scale-95 animate-in fade-in slide-in-from-left-4 duration-300"
              style={{ animationDelay: `${index * 100 + 200}ms` }}
            >
              <MessageSquare className="h-5 w-5 transition-transform group-hover/btn:scale-125 duration-300" />
              <span className="font-semibold">{post._count?.comments || 0}</span>
            </button>
          </div>

          {/* Share Button */}
          <button 
            onClick={handleShare}
            className={cn(
              "group/btn flex items-center space-x-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all active:scale-95 animate-in fade-in slide-in-from-right-4 duration-300",
              isCopied
                ? "bg-green-500/10 text-green-500"
                : "text-muted-foreground hover:bg-primary/10 hover:text-primary"
            )}
            style={{ animationDelay: `${index * 100 + 300}ms` }}
          >
            {isCopied ? (
              <>
                <Check className="h-4 w-4" />
                <span className="font-semibold">Copied!</span>
              </>
            ) : (
              <>
                <Share2 className="h-4 w-4 transition-transform group-hover/btn:rotate-12 group-hover/btn:scale-110 duration-300" />
                <span className="font-semibold">Share</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
