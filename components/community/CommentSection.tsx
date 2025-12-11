"use client";

import { useEffect, useState } from "react";
import { CommentForm } from "./CommentForm";
import { CommentItem } from "./CommentItem";
import { getPostComments } from "@/app/actions/comments";
import { MessageCircle, Loader2 } from "lucide-react";

type Comment = {
  id: string;
  content: string;
  createdAt: Date;
  author: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    image: string | null;
  };
  replies?: Comment[];
  _count: {
    replies: number;
    reactions: number;
  };
};

type CommentSectionProps = {
  postId: string;
  initialComments?: Comment[];
};

export function CommentSection({ postId, initialComments = [] }: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadComments = async () => {
    setIsLoading(true);
    setError(null);

    const result = await getPostComments(postId);

    if (result.success && result.comments) {
      setComments(result.comments);
    } else {
      setError(result.error || "Failed to load comments");
    }

    setIsLoading(false);
  };

  useEffect(() => {
    // Load comments on mount if no initial comments provided
    if (initialComments.length === 0) {
      loadComments();
    }
  }, [postId]);

  const handleCommentSuccess = () => {
    loadComments(); // Reload comments after new comment
  };

  return (
    <div className="space-y-6">
      {/* Comment Form */}
      <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <CommentForm postId={postId} onSuccess={handleCommentSuccess} />
      </div>

      {/* Comments List */}
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center space-x-2 text-sm font-semibold text-gray-900">
          <MessageCircle className="h-4 w-4" />
          <span>{comments.length} Comments</span>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Comments */}
        {!isLoading && !error && comments.length > 0 && (
          <div className="space-y-6">
            {comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                postId={postId}
                onReplySuccess={handleCommentSuccess}
              />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && comments.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <MessageCircle className="mb-3 h-12 w-12 text-gray-300" />
            <p className="text-sm text-gray-500">No comments yet</p>
            <p className="text-xs text-gray-400">Be the first to comment!</p>
          </div>
        )}
      </div>
    </div>
  );
}
