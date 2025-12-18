"use client";

import { useState } from "react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { createPost } from "@/app/actions/posts";
import { Button } from "@/components/ui/button";
import { 
  MessageSquare, 
  Heart, 
  Send, 
  Image as ImageIcon, 
  Smile,
  Sparkles,
  Users,
  Zap,
  CheckCircle2
} from "lucide-react";
import { PostCard } from "@/components/community/PostCard";
import { SpectacularFeedHeader } from "@/components/community/SpectacularFeedHeader";

type Post = {
  id: string;
  title: string | null;
  content: string;
  createdAt: Date;
  author: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    imageUrl: string | null;
  };
  _count: {
    comments: number;
    reactions: number;
  };
};

export function PostFeed({
  communityId,
  initialPosts,
}: {
  communityId: string;
  initialPosts: Post[];
}) {
  const { user, isLoading: _isLoading } = useCurrentUser();
  const [posts, setPosts] = useState(initialPosts);
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user?.id || !content.trim()) return;

    setIsSubmitting(true);

    try {
      // Create FormData object
      const formData = new FormData();
      formData.append("communityId", communityId);
      formData.append("content", content.trim());

      const result = await createPost(formData);

      if (result.success) {
        // Transform the post to match the expected format
        const transformedPost = {
          id: result.post.id,
          title: result.post.title,
          content: result.post.content,
          createdAt: result.post.createdAt,
          author: {
            id: result.post.author.id,
            firstName: result.post.author.firstName,
            lastName: result.post.author.lastName,
            imageUrl: result.post.author.image, // Map 'image' to 'imageUrl'
          },
          _count: {
            comments: result.post._count?.comments || 0,
            reactions: result.post._count?.reactions || 0,
          },
        };

        // Add new post to the top of the list with animation
        setPosts([transformedPost as any, ...posts]);
        setContent("");
        setIsFocused(false);
        
        // Show success animation
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 2500);
      }
    } catch (error) {
      console.error("Error creating post:", error);
      alert(error instanceof Error ? error.message : "Failed to create post");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getAuthorName = (author: Post["author"]) => {
    if (author.firstName && author.lastName) {
      return `${author.firstName} ${author.lastName}`;
    }
    return author.firstName || "User";
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

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* Success Toast */}
      {showSuccess && (
        <div className="fixed top-8 right-8 z-50 animate-in slide-in-from-top-4 fade-in duration-300">
          <div className="flex items-center space-x-3 rounded-2xl border border-green-500/20 bg-gradient-to-r from-green-500/10 via-emerald-500/10 to-green-500/10 px-6 py-4 shadow-2xl shadow-green-500/20 backdrop-blur-xl">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/20">
              <CheckCircle2 className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Post Published! 🎉</p>
              <p className="text-sm text-muted-foreground">Your post is now live in the community</p>
            </div>
          </div>
        </div>
      )}

      {/* NEW Spectacular Header with Real Lottie */}
      <SpectacularFeedHeader postsCount={posts.length} />

      {/* Create Post Form - Premium Design */}
      <div className={`group relative overflow-hidden rounded-3xl border transition-all duration-300 ${
        isFocused 
          ? 'border-primary shadow-2xl shadow-primary/20' 
          : 'border-border shadow-lg hover:shadow-xl'
      }`}>
        {/* Animated gradient border on focus */}
        {isFocused && (
          <div className="absolute inset-0 bg-gradient-to-r from-primary via-purple-500 to-pink-500 opacity-20 blur-xl" />
        )}
        
        <div className="relative bg-gradient-to-br from-card via-card to-card/80 p-8 backdrop-blur-xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="flex items-start space-x-5">
              {user?.imageUrl ? (
                <div className="relative">
                  <img
                    src={user.imageUrl}
                    alt={user.fullName || "User"}
                    className="h-14 w-14 rounded-2xl border-2 border-primary/20 object-cover shadow-lg ring-2 ring-primary/10"
                  />
                  <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-background bg-green-500 shadow-sm" />
                </div>
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-primary/20 bg-gradient-to-br from-primary/20 to-primary/10 shadow-lg">
                  <span className="text-xl font-bold text-primary">
                    {user?.firstName?.[0] || "U"}
                  </span>
                </div>
              )}
              
              <div className="flex-1 space-y-4">
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => !content && setIsFocused(false)}
                  placeholder="Share your thoughts, ideas, or questions with the community... ✨"
                  className={`w-full min-h-[140px] rounded-2xl border bg-background/80 px-5 py-4 text-foreground placeholder:text-muted-foreground/50 resize-none transition-all duration-300 ${
                    isFocused
                      ? 'border-primary/50 ring-4 ring-primary/10'
                      : 'border-border hover:border-border/80'
                  } focus:outline-none backdrop-blur-sm`}
                  disabled={isSubmitting}
                />
                
                {/* Enhanced Toolbar */}
                <div className="flex items-center justify-between rounded-xl bg-accent/30 p-3 backdrop-blur-sm">
                  <div className="flex items-center space-x-1">
                    <button
                      type="button"
                      className="group/btn rounded-xl p-2.5 text-muted-foreground transition-all hover:bg-primary/10 hover:text-primary active:scale-95"
                      title="Add image"
                    >
                      <ImageIcon className="h-5 w-5 transition-transform group-hover/btn:scale-110" />
                    </button>
                    <button
                      type="button"
                      className="group/btn rounded-xl p-2.5 text-muted-foreground transition-all hover:bg-amber-500/10 hover:text-amber-500 active:scale-95"
                      title="Add emoji"
                    >
                      <Smile className="h-5 w-5 transition-transform group-hover/btn:scale-110" />
                    </button>
                    <div className="mx-2 h-6 w-px bg-border" />
                    <span className="text-xs text-muted-foreground">
                      {content.length > 0 ? `${content.length} characters` : 'Start typing...'}
                    </span>
                  </div>
                  
                  <Button
                    type="submit"
                    disabled={!content.trim() || isSubmitting}
                    className="group/btn relative overflow-hidden bg-gradient-to-r from-primary via-purple-500 to-pink-500 shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/40 active:scale-95 disabled:opacity-50"
                  >
                    <span className="relative z-10 flex items-center space-x-2">
                      <Send className="h-4 w-4 transition-transform group-hover/btn:translate-x-0.5" />
                      <span className="font-semibold">{isSubmitting ? "Posting..." : "Post"}</span>
                    </span>
                    {!isSubmitting && (
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover/btn:translate-x-[200%] transition-transform duration-1000" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Posts List */}
      <div className="space-y-6">
        {posts.length === 0 ? (
          /* SPECTACULAR Empty State */
          <div className="relative overflow-hidden rounded-3xl border-2 border-dashed border-primary/20 bg-gradient-to-br from-card/50 via-accent/20 to-primary/5 p-16 text-center backdrop-blur-xl">
            {/* Background Decorations */}
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute -top-24 -left-24 h-64 w-64 rounded-full bg-primary/5 blur-3xl animate-pulse" />
              <div className="absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-purple-500/5 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
            </div>

            <div className="relative">
              {/* Animated Icon Stack */}
              <div className="relative mx-auto mb-8 h-32 w-32">
                <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" style={{ animationDuration: '3s' }} />
                <div className="absolute inset-4 rounded-full bg-gradient-to-br from-primary/30 to-purple-500/30 blur-xl" />
                <div className="relative flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-primary via-primary to-primary/70 shadow-2xl shadow-primary/30">
                  <MessageSquare className="h-16 w-16 text-primary-foreground animate-bounce" style={{ animationDuration: '2s' }} />
                </div>
                
                {/* Floating Icons */}
                <div className="absolute -right-2 top-4 animate-bounce" style={{ animationDelay: '0.5s', animationDuration: '3s' }}>
                  <div className="rounded-full bg-gradient-to-br from-green-500 to-emerald-500 p-3 shadow-lg shadow-green-500/30">
                    <Heart className="h-5 w-5 text-white" />
                  </div>
                </div>
                <div className="absolute -left-2 bottom-8 animate-bounce" style={{ animationDelay: '1s', animationDuration: '3s' }}>
                  <div className="rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 p-3 shadow-lg shadow-blue-500/30">
                    <Sparkles className="h-5 w-5 text-white" />
                  </div>
                </div>
              </div>

              {/* Content */}
              <h3 className="mb-3 text-3xl font-bold text-foreground">
                Start the Conversation 🚀
              </h3>
              <p className="mb-2 text-lg text-muted-foreground">
                This community is ready for its first post!
              </p>
              <p className="mb-8 text-sm text-muted-foreground/80">
                Share your insights, ask questions, or spark a discussion.
              </p>

              {/* Feature Highlights */}
              <div className="mx-auto max-w-lg space-y-3">
                <div className="flex items-center space-x-3 rounded-2xl border border-border/50 bg-card/50 p-4 backdrop-blur-sm">
                  <div className="rounded-xl bg-primary/10 p-2">
                    <Zap className="h-5 w-5 text-primary" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-foreground">Instant Engagement</p>
                    <p className="text-xs text-muted-foreground">Get reactions and comments in real-time</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 rounded-2xl border border-border/50 bg-card/50 p-4 backdrop-blur-sm">
                  <div className="rounded-xl bg-green-500/10 p-2">
                    <Users className="h-5 w-5 text-green-500" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-foreground">Connect with Members</p>
                    <p className="text-xs text-muted-foreground">Build relationships through meaningful conversations</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 rounded-2xl border border-border/50 bg-card/50 p-4 backdrop-blur-sm">
                  <div className="rounded-xl bg-purple-500/10 p-2">
                    <Sparkles className="h-5 w-5 text-purple-500" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-foreground">Rich Content</p>
                    <p className="text-xs text-muted-foreground">Add images, emojis, and formatted text</p>
                  </div>
                </div>
              </div>

              {/* CTA Button */}
              <button
                onClick={() => {
                  const textarea = document.querySelector('textarea');
                  textarea?.focus();
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="group/cta relative mt-8 overflow-hidden rounded-2xl bg-gradient-to-r from-primary via-purple-500 to-pink-500 px-8 py-4 font-semibold text-white shadow-2xl shadow-primary/30 transition-all hover:scale-105 hover:shadow-3xl active:scale-95"
              >
                <span className="relative z-10 flex items-center space-x-2">
                  <Sparkles className="h-5 w-5" />
                  <span>Create Your First Post</span>
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent translate-x-[-200%] group-hover/cta:translate-x-[200%] transition-transform duration-700" />
              </button>
            </div>
          </div>
        ) : (
          posts.map((post, index) => (
            <PostCard key={post.id} post={post} index={index} />
          ))
        )}
      </div>
    </div>
  );
}
