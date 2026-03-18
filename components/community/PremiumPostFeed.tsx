"use client";

import { useMemo, useState, useEffect } from "react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { PremiumPostCard } from "@/components/community/PremiumPostCard";
import { createPost } from "@/app/actions/posts";
import { 
  Sparkles, 
  Send, 
  Image as ImageIcon, 
  Smile, 
  AtSign, 
  Loader2, 
  CheckCircle2,
  MessageCircle,
  Trophy,
  BookOpen,
  MessagesSquare,
  Flame,
  Play,
  Radio,
  HelpCircle,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

type Post = {
  id: string;
  title: string | null;
  content: string;
  contentType?: string;
  createdAt: Date;
  author: {
    id: string;
    name: string | null;
    image: string | null;
  };
  attachments?: {
    sessionId?: string;
    sessionTitle?: string;
    sessionDescription?: string;
    scheduledAt?: string;
    duration?: number;
    mentorId?: string;
    mentorName?: string;
    mentorImage?: string | null;
  } | null;
  _count?: {
    comments: number;
    reactions: number;
  };
};

type ComposerMode = "default" | "question" | "win" | "resource" | "discussion";
type FeedFilter = "all" | "updates" | "questions" | "resources" | "discussion";

type UpcomingSession = {
  id: string;
  title: string;
  scheduledAt: Date;
  duration: number;
  mentorName: string | null;
  attendeeCount: number;
};

export function PremiumPostFeed({ 
  posts: initialPosts, 
  communityId,
  upcomingSession,
  hotTopics,
}: { 
  posts: Post[]; 
  communityId: string;
  upcomingSession?: UpcomingSession | null;
  hotTopics?: { id: string; title: string; commentCount: number }[];
}) {
  const { user } = useCurrentUser();
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [focused, setFocused] = useState(false);
  const [composerMode, setComposerMode] = useState<ComposerMode>("default");
  const [activeFilter, setActiveFilter] = useState<FeedFilter>("all");

  // Set title based on composer mode
  useEffect(() => {
    if (composerMode === "question") {
      setTitle("🤔 " + (title.replace(/^(💡|🏆|📚|💬)\s*/, "") || ""));
    } else if (composerMode === "win") {
      setTitle("🏆 " + (title.replace(/^(🤔|💡|📚|💬)\s*/, "") || ""));
    } else if (composerMode === "resource") {
      setTitle("📚 " + (title.replace(/^(🤔|🏆|💡|💬)\s*/, "") || ""));
    } else if (composerMode === "discussion") {
      setTitle("💬 " + (title.replace(/^(🤔|🏆|📚|💡)\s*/, "") || ""));
    }
  }, [composerMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !content.trim() || !communityId) return;

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("communityId", communityId);
      formData.append("content", content.trim());

      const contentType =
        composerMode === "question"
          ? "QUESTION"
          : composerMode === "resource"
            ? "RESOURCE"
            : composerMode === "win"
              ? "ANNOUNCEMENT"
              : "DISCUSSION";
      formData.append("contentType", contentType);

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
      setComposerMode("default");

      if (result.post) {
        const optimisticPost: Post = {
          id: result.post.id,
          title: (result.post as any).title ?? (title.trim() || null),
          content: (result.post as any).content ?? content.trim(),
          contentType: (result.post as any).contentType ?? contentType,
          createdAt: (result.post as any).createdAt ? new Date((result.post as any).createdAt) : new Date(),
          author: {
            id: user.id,
            name: user.name || "You",
            image: user.image || null,
          },
          _count: {
            comments: 0,
            reactions: 0,
          },
        };

        setPosts((prev) => [optimisticPost, ...prev]);
      }
    } catch (error) {
      console.error("❌ Error creating post:", error);
      alert("Failed to create post");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPlaceholder = () => {
    switch (composerMode) {
      case "question":
        return "What do you want to ask the community? Be specific to get better answers...";
      case "win":
        return "Share a recent win or success! What did you accomplish? How did you do it?";
      case "resource":
        return "Share a helpful resource, tool, or article that the community would love...";
      case "discussion":
        return "Start a discussion. What's on your mind? What do you want to explore with the community?";
      default:
        return "Share your thoughts, ideas, or questions with the community... ✨";
    }
  };

  const userFullName = user ? (user.name || "") : "";

  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      if (activeFilter === "all") return true;
      if (activeFilter === "updates") return post.contentType === "ANNOUNCEMENT";
      if (activeFilter === "questions") return post.contentType === "QUESTION";
      if (activeFilter === "resources") return post.contentType === "RESOURCE";
      return post.contentType === "DISCUSSION" || !post.contentType;
    });
  }, [posts, activeFilter]);

  // Calculate time until session
  const getTimeUntil = (date: Date) => {
    const now = new Date();
    const sessionTime = new Date(date);
    const diffMs = sessionTime.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 0) return `${diffDays}d ${diffHours % 24}h`;
    if (diffHours > 0) return `${diffHours}h`;
    return "Soon";
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      {/* Success Toast */}
      {showSuccess && (
        <div className="fixed right-6 top-6 z-50 animate-slide-in-from-top">
          <div className="flex items-center space-x-3 rounded-xl border border-green-200 bg-white px-5 py-3 shadow-lg">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            <p className="font-medium text-gray-900">Post published successfully!</p>
          </div>
        </div>
      )}

      {/* PRE-SESSION DISCUSSION BLOCK */}
      {upcomingSession && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-5">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100">
              <Radio className="h-6 w-6 text-amber-600 animate-pulse" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Badge className="bg-amber-100 text-amber-700 border-amber-200">
                  LIVE IN {getTimeUntil(upcomingSession.scheduledAt).toUpperCase()}
                </Badge>
              </div>
              <h3 className="font-semibold text-gray-900 text-lg">
                {upcomingSession.title}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Hosted by {upcomingSession.mentorName || "the host"} • {upcomingSession.duration} min • {upcomingSession.attendeeCount} attending
              </p>
              
              {/* Pre-session discussion prompt */}
              <div className="mt-4 p-4 rounded-lg bg-white/60 border border-amber-200/50">
                <p className="text-sm font-medium text-gray-800 mb-2">
                  💬 Drop your questions for the host 👇
                </p>
                <p className="text-xs text-gray-500">
                  The best questions may be featured during the live session!
                </p>
              </div>

              <div className="flex items-center gap-3 mt-3">
                <Link href={`/dashboard/sessions/${upcomingSession.id}/room`}>
                  <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white">
                    <Play className="h-4 w-4 mr-1.5" />
                    Join Room
                  </Button>
                </Link>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setComposerMode("question");
                    setFocused(true);
                  }}
                  className="border-amber-300 hover:bg-amber-100"
                >
                  <HelpCircle className="h-4 w-4 mr-1.5" />
                  Ask a Question
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* HOT DISCUSSIONS */}
      {hotTopics && hotTopics.length > 0 && (
        <div className="mb-6 rounded-xl border border-purple-100 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Flame className="h-5 w-5 text-orange-500" />
            <h3 className="font-semibold text-gray-900">🔥 Hot Discussions</h3>
          </div>
          <div className="space-y-2">
            {hotTopics.slice(0, 3).map((topic) => (
              <Link 
                key={topic.id} 
                href={`#post-${topic.id}`}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-purple-50 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <MessageCircle className="h-4 w-4 text-purple-400" />
                  <span className="text-sm font-medium text-gray-700 group-hover:text-purple-700">
                    {topic.title}
                  </span>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {topic.commentCount} comments
                </Badge>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* GUIDED COMPOSER */}
      <div className={`mb-6 overflow-hidden rounded-xl border ${focused ? 'border-purple-200 shadow-lg' : 'border-gray-200'} bg-white transition-all`}>
        {/* Composer Mode Selector - Always Visible */}
        <div className="flex items-center gap-1 p-2 border-b border-gray-100 overflow-x-auto">
          <button
            type="button"
            onClick={() => setComposerMode("default")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              composerMode === "default" 
                ? "bg-gray-100 text-gray-900" 
                : "text-gray-500 hover:bg-gray-50"
            }`}
          >
            <Sparkles className="h-4 w-4" />
            Post
          </button>
          <button
            type="button"
            onClick={() => setComposerMode("question")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              composerMode === "question" 
                ? "bg-blue-100 text-blue-700" 
                : "text-gray-500 hover:bg-gray-50"
            }`}
          >
            <HelpCircle className="h-4 w-4" />
            Ask Question
          </button>
          <button
            type="button"
            onClick={() => setComposerMode("win")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              composerMode === "win" 
                ? "bg-amber-100 text-amber-700" 
                : "text-gray-500 hover:bg-gray-50"
            }`}
          >
            <Trophy className="h-4 w-4" />
            Share Win
          </button>
          <button
            type="button"
            onClick={() => setComposerMode("resource")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              composerMode === "resource" 
                ? "bg-green-100 text-green-700" 
                : "text-gray-500 hover:bg-gray-50"
            }`}
          >
            <BookOpen className="h-4 w-4" />
            Share Resource
          </button>
          <button
            type="button"
            onClick={() => setComposerMode("discussion")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              composerMode === "discussion" 
                ? "bg-purple-100 text-purple-700" 
                : "text-gray-500 hover:bg-gray-50"
            }`}
          >
            <MessagesSquare className="h-4 w-4" />
            Discussion
          </button>
        </div>

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
              <p className="text-xs text-gray-500">
                {composerMode === "question" && "Ask the community"}
                {composerMode === "win" && "Celebrate your success"}
                {composerMode === "resource" && "Share something helpful"}
                {composerMode === "discussion" && "Start a conversation"}
                {composerMode === "default" && "Share with the community"}
              </p>
            </div>
          </div>

          {/* Title Input */}
          {(focused || title) && (
            <div className="mb-2 animate-fade-in">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={
                  composerMode === "question" ? "What's your question?" :
                  composerMode === "win" ? "What did you achieve?" :
                  composerMode === "resource" ? "What are you sharing?" :
                  composerMode === "discussion" ? "What do you want to discuss?" :
                  "Add a title (optional)"
                }
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
              placeholder={getPlaceholder()}
              className="w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-4 text-base leading-relaxed text-gray-900 placeholder-gray-400 transition-all focus:border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-100"
              rows={focused ? 5 : 3}
            />
            
            {/* Character Count */}
            {focused && (
              <div className="absolute bottom-3 right-3 text-sm text-gray-400">
                {content.length} characters
              </div>
            )}
          </div>

          {/* Actions Bar */}
          <div className="mt-3 flex items-center justify-between">
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
                  setComposerMode("default");
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
                    <span>
                      {composerMode === "question" ? "Ask" :
                       composerMode === "win" ? "Share Win" :
                       composerMode === "resource" ? "Share" :
                       composerMode === "discussion" ? "Discuss" :
                       "Post"}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setActiveFilter("all")}
          className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
            activeFilter === "all" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          All
        </button>
        <button
          type="button"
          onClick={() => setActiveFilter("updates")}
          className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
            activeFilter === "updates" ? "bg-blue-600 text-white" : "bg-blue-50 text-blue-700 hover:bg-blue-100"
          }`}
        >
          <Clock className="h-3.5 w-3.5" /> Updates
        </button>
        <button
          type="button"
          onClick={() => setActiveFilter("questions")}
          className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
            activeFilter === "questions" ? "bg-purple-600 text-white" : "bg-purple-50 text-purple-700 hover:bg-purple-100"
          }`}
        >
          Questions
        </button>
        <button
          type="button"
          onClick={() => setActiveFilter("resources")}
          className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
            activeFilter === "resources" ? "bg-green-600 text-white" : "bg-green-50 text-green-700 hover:bg-green-100"
          }`}
        >
          Resources
        </button>
        <button
          type="button"
          onClick={() => setActiveFilter("discussion")}
          className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
            activeFilter === "discussion" ? "bg-amber-600 text-white" : "bg-amber-50 text-amber-700 hover:bg-amber-100"
          }`}
        >
          Discussion
        </button>
      </div>

      {/* Posts List */}
      {filteredPosts.length > 0 ? (
        <div className="space-y-4">
          {filteredPosts.map((post) => (
            <div key={post.id} id={`post-${post.id}`}>
              <PremiumPostCard post={post} />
            </div>
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
            {posts.length === 0 ? "No posts yet" : "No posts for this filter"}
          </h3>
          <p className="mx-auto mb-6 max-w-sm text-sm text-gray-600">
            {posts.length === 0
              ? "Be the first to share your thoughts and start a conversation with the community."
              : "Try another filter to see different community activity."}
          </p>

          {/* Feature Highlights */}
          <div className="mx-auto grid max-w-lg grid-cols-2 gap-3">
            <button 
              onClick={() => setComposerMode("question")}
              className="rounded-lg bg-blue-50 p-3 hover:bg-blue-100 transition-colors text-left"
            >
              <div className="mb-1 text-xl">❓</div>
              <p className="text-xs font-medium text-blue-700">Ask a Question</p>
            </button>
            <button 
              onClick={() => setComposerMode("win")}
              className="rounded-lg bg-amber-50 p-3 hover:bg-amber-100 transition-colors text-left"
            >
              <div className="mb-1 text-xl">🏆</div>
              <p className="text-xs font-medium text-amber-700">Share a Win</p>
            </button>
            <button 
              onClick={() => setComposerMode("resource")}
              className="rounded-lg bg-green-50 p-3 hover:bg-green-100 transition-colors text-left"
            >
              <div className="mb-1 text-xl">📚</div>
              <p className="text-xs font-medium text-green-700">Share Resource</p>
            </button>
            <button 
              onClick={() => setComposerMode("discussion")}
              className="rounded-lg bg-purple-50 p-3 hover:bg-purple-100 transition-colors text-left"
            >
              <div className="mb-1 text-xl">💬</div>
              <p className="text-xs font-medium text-purple-700">Start Discussion</p>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
