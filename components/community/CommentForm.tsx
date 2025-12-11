"use client";

import { useState } from "react";
import { createComment } from "@/app/actions/comments";
import { Send, Loader2 } from "lucide-react";

type CommentFormProps = {
  postId: string;
  parentId?: string;
  onSuccess?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
};

export function CommentForm({
  postId,
  parentId,
  onSuccess,
  placeholder = "Write a comment...",
  autoFocus = false,
}: CommentFormProps) {
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim()) {
      setError("Comment cannot be empty");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const result = await createComment(postId, content, parentId);

    if (result.success) {
      setContent("");
      onSuccess?.();
    } else {
      setError(result.error || "Failed to post comment");
    }

    setIsSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="relative">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          disabled={isSubmitting}
          rows={3}
          className="w-full resize-none rounded-lg border border-gray-200 px-4 py-3 pr-12 text-sm transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 disabled:bg-gray-50 disabled:text-gray-400"
        />

        {/* Character count */}
        <div className="absolute bottom-2 left-2 text-xs text-gray-400">
          {content.length} / 1000
        </div>

        {/* Submit button inside textarea */}
        <button
          type="submit"
          disabled={!content.trim() || isSubmitting}
          className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white transition-all hover:shadow-lg disabled:cursor-not-allowed disabled:from-gray-300 disabled:to-gray-400 disabled:shadow-none"
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </button>
      </div>

      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}
    </form>
  );
}
