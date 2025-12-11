"use client";

import { useState, useEffect } from "react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { toggleReaction, getPostReactions, type ReactionType } from "@/app/actions/reactions";
import { Heart, ThumbsUp, PartyPopper, Flame, Lightbulb, Hand } from "lucide-react";
import { cn } from "@/lib/utils";

type ReactionData = {
  count: number;
  users: Array<{ id: string; name: string; imageUrl: string | null }>;
  userReacted: boolean;
};

const REACTIONS = [
  { type: "LOVE" as ReactionType, emoji: "❤️", icon: Heart, label: "Love", color: "text-red-500", bgColor: "bg-red-500/10", hoverColor: "hover:bg-red-500/20" },
  { type: "LIKE" as ReactionType, emoji: "👍", icon: ThumbsUp, label: "Like", color: "text-blue-500", bgColor: "bg-blue-500/10", hoverColor: "hover:bg-blue-500/20" },
  { type: "CELEBRATE" as ReactionType, emoji: "🎉", icon: PartyPopper, label: "Celebrate", color: "text-purple-500", bgColor: "bg-purple-500/10", hoverColor: "hover:bg-purple-500/20" },
  { type: "FIRE" as ReactionType, emoji: "🔥", icon: Flame, label: "Fire", color: "text-orange-500", bgColor: "bg-orange-500/10", hoverColor: "hover:bg-orange-500/20" },
  { type: "IDEA" as ReactionType, emoji: "💡", icon: Lightbulb, label: "Idea", color: "text-yellow-500", bgColor: "bg-yellow-500/10", hoverColor: "hover:bg-yellow-500/20" },
  { type: "CLAP" as ReactionType, emoji: "👏", icon: Hand, label: "Clap", color: "text-green-500", bgColor: "bg-green-500/10", hoverColor: "hover:bg-green-500/20" },
] as const;

export function PostReactions({ postId }: { postId: string }) {
  const { user } = useCurrentUser();
  const [reactions, setReactions] = useState<Record<string, ReactionData>>({});
  const [totalCount, setTotalCount] = useState(0);
  const [showPicker, setShowPicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [animatingReaction, setAnimatingReaction] = useState<ReactionType | null>(null);

  // Load reactions on mount
  useEffect(() => {
    loadReactions();
  }, [postId, user?.id]);

  async function loadReactions() {
    const result = await getPostReactions(postId, user?.id);
    if (result.success) {
      setReactions(result.reactions);
      setTotalCount(result.totalCount);
    }
  }

  async function handleReaction(type: ReactionType) {
    if (!user?.id || isLoading) return;

    // Optimistic update
    const wasReacted = reactions[type]?.userReacted || false;
    const currentCount = reactions[type]?.count || 0;

    // Animate
    setAnimatingReaction(type);
    setTimeout(() => setAnimatingReaction(null), 600);

    // Update local state immediately
    setReactions(prev => ({
      ...prev,
      [type]: {
        count: wasReacted ? Math.max(0, currentCount - 1) : currentCount + 1,
        users: prev[type]?.users || [],
        userReacted: !wasReacted,
      },
    }));

    setTotalCount(prev => wasReacted ? Math.max(0, prev - 1) : prev + 1);
    setShowPicker(false);

    // Actual API call
    setIsLoading(true);
    const result = await toggleReaction(user.id, postId, type);
    setIsLoading(false);

    if (result.success) {
      // Reload to get accurate data
      loadReactions();
    } else {
      // Revert on error
      setReactions(prev => ({
        ...prev,
        [type]: {
          count: currentCount,
          users: prev[type]?.users || [],
          userReacted: wasReacted,
        },
      }));
      setTotalCount(prev => wasReacted ? prev + 1 : prev - 1);
    }
  }

  // Get reactions that have been used
  const usedReactions = REACTIONS.filter(r => (reactions[r.type]?.count || 0) > 0);

  return (
    <div className="relative">
      <div className="flex items-center space-x-2">
        {/* Existing Reactions */}
        {usedReactions.length > 0 && (
          <div className="flex items-center space-x-1">
            {usedReactions.map(reaction => {
              const data = reactions[reaction.type];
              if (!data || data.count === 0) return null;

              return (
                <button
                  key={reaction.type}
                  onClick={() => handleReaction(reaction.type)}
                  disabled={isLoading}
                  className={cn(
                    "group relative flex items-center space-x-1.5 rounded-xl px-3 py-1.5 text-sm font-medium transition-all",
                    data.userReacted
                      ? `${reaction.bgColor} ${reaction.color} ring-2 ring-inset ring-current/20`
                      : "bg-accent/50 text-muted-foreground hover:bg-accent",
                    animatingReaction === reaction.type && "animate-bounce",
                    "active:scale-95"
                  )}
                >
                  <span className={cn(
                    "text-base transition-transform",
                    data.userReacted && "scale-110",
                    animatingReaction === reaction.type && "animate-ping"
                  )}>
                    {reaction.emoji}
                  </span>
                  <span className="font-semibold">{data.count}</span>

                  {/* Tooltip */}
                  <div className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 opacity-0 transition-opacity group-hover:opacity-100">
                    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-xl backdrop-blur-xl">
                      <div className="flex items-center space-x-2">
                        <span>{reaction.emoji}</span>
                        <span>{data.count} {reaction.label}</span>
                      </div>
                      {data.users.length > 0 && (
                        <div className="mt-1 max-w-[200px] text-muted-foreground">
                          {data.users.slice(0, 3).map(u => u.name).join(", ")}
                          {data.users.length > 3 && ` and ${data.users.length - 3} more`}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Add Reaction Button */}
        <div className="relative">
          <button
            onClick={() => setShowPicker(!showPicker)}
            className={cn(
              "group relative flex items-center space-x-1.5 rounded-xl px-3 py-1.5 text-sm font-medium transition-all",
              showPicker
                ? "bg-primary/10 text-primary ring-2 ring-inset ring-primary/20"
                : "bg-accent/50 text-muted-foreground hover:bg-accent hover:text-foreground",
              "active:scale-95"
            )}
          >
            <span className="text-base transition-transform group-hover:scale-110">😊</span>
            {totalCount === 0 && <span className="font-semibold">React</span>}
          </button>

          {/* Reaction Picker */}
          {showPicker && (
            <div className="absolute bottom-full left-0 mb-2 z-10 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div className="rounded-2xl border border-border bg-popover/95 p-2 shadow-2xl backdrop-blur-xl">
                <div className="flex items-center space-x-1">
                  {REACTIONS.map(reaction => (
                    <button
                      key={reaction.type}
                      onClick={() => handleReaction(reaction.type)}
                      disabled={isLoading}
                      className={cn(
                        "group/emoji relative rounded-xl p-2.5 transition-all hover:scale-125 active:scale-95",
                        reaction.hoverColor,
                        reactions[reaction.type]?.userReacted && reaction.bgColor
                      )}
                    >
                      <span className="text-2xl">{reaction.emoji}</span>
                      
                      {/* Mini tooltip */}
                      <div className="pointer-events-none absolute bottom-full left-1/2 mb-1 -translate-x-1/2 opacity-0 transition-opacity group-hover/emoji:opacity-100">
                        <div className="whitespace-nowrap rounded-lg bg-popover px-2 py-1 text-xs font-medium text-popover-foreground shadow-lg">
                          {reaction.label}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Click outside to close picker */}
      {showPicker && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setShowPicker(false)}
        />
      )}
    </div>
  );
}
