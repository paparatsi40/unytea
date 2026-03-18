"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { MessageCircle, Heart, Trash2, Clock } from "lucide-react";
import { CommentForm } from "./CommentForm";
import { deleteComment } from "@/app/actions/comments";
import { useCurrentUser } from "@/hooks/use-current-user";
import { toast } from "sonner";

type Comment = {
  id: string;
  content: string;
  createdAt: Date;
  author: {
    id: string;
    name: string | null;
    image: string | null;
  };
  replies?: Comment[];
  _count: {
    replies?: number;
    reactions: number;
  };
};

type CommentItemProps = {
  comment: Comment;
  postId: string;
  isReply?: boolean;
  onReplySuccess?: () => void;
};

export function CommentItem({
  comment,
  postId,
  isReply = false,
  onReplySuccess,
}: CommentItemProps) {
  const { user } = useCurrentUser();
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const authorName = comment.author.name || "Anonymous";
  const timeAgo = formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true });
  const isAuthor = user?.id === comment.author.id;

  const handleDelete = async () => {
    setIsDeleting(true);
    const result = await deleteComment(comment.id);

    if (result.success) {
      setConfirmDelete(false);
      onReplySuccess?.();
      return;
    }

    toast.error(result.error || "Failed to delete comment");
    setIsDeleting(false);
  };

  const handleReplySuccess = () => {
    setShowReplyForm(false);
    onReplySuccess?.();
  };

  return (
    <div className={`group ${isReply ? "ml-8" : ""}`}>
      <div className="flex space-x-3">
        {/* Avatar */}
        <div className="flex-shrink-0">
          <div className="relative h-8 w-8 overflow-hidden rounded-full border border-gray-100 bg-gradient-to-br from-purple-500 to-pink-500">
            {comment.author.image ? (
              <img
                src={comment.author.image}
                alt={authorName}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-white">
                {authorName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </div>

        {/* Comment Content */}
        <div className="flex-1 space-y-2">
          {/* Header */}
          <div className="flex items-center space-x-2">
            <span className="text-sm font-semibold text-gray-900">
              {authorName}
            </span>
            <span className="flex items-center space-x-1 text-xs text-gray-500">
              <Clock className="h-3 w-3" />
              <span>{timeAgo}</span>
            </span>
            {isAuthor && (
              <button
                onClick={() => setConfirmDelete((prev) => !prev)}
                disabled={isDeleting}
                className="ml-auto opacity-0 transition-opacity group-hover:opacity-100"
              >
                <Trash2 className="h-3.5 w-3.5 text-gray-400 hover:text-red-600" />
              </button>
            )}
          </div>

          {/* Content */}
          <p className="text-sm text-gray-700 leading-relaxed">
            {comment.content}
          </p>

          {/* Actions */}
          <div className="flex items-center space-x-3">
            {/* Like button */}
            <button className="flex items-center space-x-1 rounded-lg px-2 py-1 text-xs text-gray-500 transition-colors hover:bg-gray-50 hover:text-pink-600">
              <Heart className="h-3.5 w-3.5" />
              <span>{comment._count.reactions}</span>
            </button>

            {/* Reply button */}
            {!isReply && (
              <button
                onClick={() => setShowReplyForm(!showReplyForm)}
                className="flex items-center space-x-1 rounded-lg px-2 py-1 text-xs text-gray-500 transition-colors hover:bg-gray-50 hover:text-purple-600"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                <span>Reply</span>
              </button>
            )}
          </div>

          {confirmDelete && isAuthor && (
            <div className="mt-2 flex items-center justify-between gap-2 rounded-lg border border-red-200 bg-red-50 px-2.5 py-2">
              <p className="text-[11px] font-medium text-red-700">Delete this comment?</p>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="rounded-md px-2 py-1 text-[11px] font-medium text-gray-600 hover:bg-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="rounded-md bg-red-600 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-red-700 disabled:opacity-60"
                >
                  {isDeleting ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          )}

          {/* Reply Form */}
          {showReplyForm && !isReply && (
            <div className="mt-3">
              <CommentForm
                postId={postId}
                parentId={comment.id}
                onSuccess={handleReplySuccess}
                placeholder={`Reply to ${authorName}...`}
                autoFocus
              />
            </div>
          )}

          {/* Replies */}
          {!isReply && comment.replies && comment.replies.length > 0 && (
            <div className="mt-4 space-y-4">
              {comment.replies.map((reply) => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  postId={postId}
                  isReply
                  onReplySuccess={onReplySuccess}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
