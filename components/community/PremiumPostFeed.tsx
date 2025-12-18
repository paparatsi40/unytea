"use client";

import { useState } from "react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { PremiumPostCard } from "@/components/community/PremiumPostCard";
import { createPost } from "@/app/actions/posts";
import { Sparkles, Send, Image as ImageIcon, Smile, AtSign, Loader2, CheckCircle2 } from "lucide-react";

type Post = {
  id: string;
  title: string | null;
  content: string;
  createdAt: Date;
  author: {
    id: string;
    name: string | null;
    image: string | null;
  };
  _count?: {
    comments: number;
    reactions: number;
  };
};

export function PremiumPostFeed({ posts: initialPosts, communityId }: { posts: Post[]; communityId: string }) {
  const { user, isLoading: _isLoading } = useCurrentUser();
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [focused, setFocused] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !content.trim() || !communityId) return;

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("communityId", communityId);
      formData.append("content", content.trim());
      if (title.trim()) {
        formData.append("title", title.trim());
      }

      const result = await createPost(formData);

      if (!result.success) {
        alert(result.error || "Failed to create post");
        setIsSubmitting(false);
        return;
      }

      // Show success animation
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);

      // Reset form
      setContent("");
      setTitle("");
      setFocused(false);

      // Refresh posts
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      console.error("❌ Error creating post:", error);
      alert("Failed to create post");
    } finally {
      setIsSubmitting(false);
    }
  };

  const userFullName = user ? (user.name || "") : "";

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* Success Toast */}
      {showSuccess && (
        <div className="fixed right-6 top-6 z-50 animate-slide-in-from-top">
          <div className="flex items-center space-x-3 rounded-xl border border-green-200 bg-white px-5 py-3 shadow-lg">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            <p className="font-medium text-gray-900">Post published successfully!</p>
          </div>
        </div>
      )}

      {/* Create Post Form */}
      <div className={`mb-6 overflow-hidden rounded-xl border ${focused ? 'border-purple-200 shadow-lg' : 'border-gray-200'} bg-white transition-all`}>
        <form onSubmit={handleSubmit} className="p-4">
          {/* User Avatar */}
          <div className="mb-3 flex items-center space-x-3">
            <div className="relative h-10 w-10 overflow-hidden rounded-full border border-gray-100 bg-gradient-to-br from-purple-500 to-pink-500">
              {user?.image ? (
                <img
                  src={user.image}
                  alt={userFullName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-white">
                  {userFullName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">{userFullName}</p>
              <p className="text-xs text-gray-500">Share something with the community</p>
            </div>
          </div>

          {/* Title Input (Optional) */}
          {focused && (
            <div className="mb-2 animate-fade-in">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Add a title (optional)"
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-900 placeholder-gray-400 transition-colors focus:border-purple-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-100"
              />
            </div>
          )}

          {/* Content Textarea */}
          <div className="relative">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onFocus={() => setFocused(true)}
              placeholder="Share your thoughts, ideas, or questions with the community... ✨"
              className="w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-4 text-base leading-relaxed text-gray-900 placeholder-gray-400 transition-all focus:border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-100"
              rows={focused ? 6 : 3}
            />
            
            {/* Character Count */}
            {focused && (
              <div className="absolute bottom-3 right-3 text-sm text-gray-400">
                {content.length} characters
              </div>
            )}
          </div>

          {/* Actions Bar */}
          {focused && (
            <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3 animate-fade-in">
              <div className="flex items-center space-x-1">
                <button
                  type="button"
                  className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-600"
                  title="Add image"
                >
                  <ImageIcon className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-600"
                  title="Add emoji"
                >
                  <Smile className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-600"
                  title="Mention someone"
                >
                  <AtSign className="h-4 w-4" />
                </button>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setContent("");
                    setTitle("");
                    setFocused(false);
                  }}
                  className="px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:text-gray-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !content.trim()}
                  className="flex items-center space-x-2 rounded-lg bg-purple-600 px-4 py-1.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-purple-700 disabled:opacity-50 disabled:hover:bg-purple-600"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Publishing...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      <span>Post</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>

      {/* Posts List */}
      {posts.length > 0 ? (
        <div className="space-y-4">
          {posts.map((post) => (
            <PremiumPostCard key={post.id} post={post} />
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <div className="mb-4 flex justify-center">
            <div className="rounded-full bg-purple-50 p-4">
              <Sparkles className="h-8 w-8 text-purple-600" />
            </div>
          </div>

          <h3 className="mb-2 text-xl font-semibold text-gray-900">
            No posts yet
          </h3>
          <p className="mx-auto mb-6 max-w-sm text-sm text-gray-600">
            Be the first to share your thoughts and start a conversation with the community.
          </p>

          {/* Feature Highlights */}
          <div className="mx-auto grid max-w-lg grid-cols-3 gap-3">
            <div className="rounded-lg bg-gray-50 p-3">
              <div className="mb-1 text-xl">💡</div>
              <p className="text-xs font-medium text-gray-700">Share Ideas</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-3">
              <div className="mb-1 text-xl">❓</div>
              <p className="text-xs font-medium text-gray-700">Ask Questions</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-3">
              <div className="mb-1 text-xl">🚀</div>
              <p className="text-xs font-medium text-gray-700">Start Discussions</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}