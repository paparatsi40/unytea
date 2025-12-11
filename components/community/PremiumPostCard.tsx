"use client";

import { useState } from "react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { PostReactions } from "@/components/community/PostReactions";
import { CommentSection } from "@/components/community/CommentSection";
import { deletePost, updatePost } from "@/app/actions/posts";
import { MessageCircle, Share2, MoreHorizontal, Clock, Edit2, Trash2, X, Check } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

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
  _count?: {
    comments: number;
    reactions: number;
  };
};

export function PremiumPostCard({ post }: { post: Post }) {
  const { user } = useCurrentUser();
  const [showMenu, setShowMenu] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(post.title || "");
  const [editContent, setEditContent] = useState(post.content);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const authorName = `${post.author.firstName || ""} ${post.author.lastName || ""}`.trim() || "Anonymous";
  const timeAgo = formatDistanceToNow(new Date(post.createdAt), { addSuffix: true });
  const isAuthor = user?.id === post.author.id;

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this post?")) return;
    
    setIsDeleting(true);
    const result = await deletePost(post.id);
    
    if (result.success) {
      // Post will be removed by revalidation
    } else {
      alert(result.error || "Failed to delete post");
      setIsDeleting(false);
    }
  };

  const handleSave = async () => {
    if (!editContent.trim()) {
      alert("Content cannot be empty");
      return;
    }

    setIsSaving(true);
    const result = await updatePost(post.id, {
      title: editTitle || undefined,
      content: editContent,
    });

    if (result.success) {
      setIsEditing(false);
      setShowMenu(false);
      // Refresh will happen via revalidation
    } else {
      alert(result.error || "Failed to update post");
    }
    setIsSaving(false);
  };

  const handleCancelEdit = () => {
    setEditTitle(post.title || "");
    setEditContent(post.content);
    setIsEditing(false);
    setShowMenu(false);
  };

  if (isDeleting) {
    return (
      <article className="rounded-xl border border-gray-100 bg-gray-50 p-6 opacity-50">
        <p className="text-center text-sm text-gray-500">Deleting post...</p>
      </article>
    );
  }

  return (
    <article className="group/card rounded-xl border border-gray-100 bg-white p-6 shadow-sm transition-all hover:border-gray-200 hover:shadow-md">
      {/* Author Header */}
      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-center space-x-3">
          {/* Avatar */}
          <div className="relative h-10 w-10 overflow-hidden rounded-full border border-gray-100 bg-gradient-to-br from-purple-500 to-pink-500">
            {post.author.imageUrl ? (
              <img
                src={post.author.imageUrl}
                alt={authorName}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-white">
                {authorName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          {/* Author Info */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900">
              {authorName}
            </h3>
            <div className="flex items-center space-x-1 text-xs text-gray-500">
              <Clock className="h-3 w-3" />
              <span>{timeAgo}</span>
            </div>
          </div>
        </div>

        {/* Menu Button - Only show for author */}
        {isAuthor && (
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-600"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>

            {/* Dropdown Menu */}
            {showMenu && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 top-full z-20 mt-1 w-48 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg animate-in fade-in slide-in-from-top-2 duration-200">
                  <button
                    onClick={() => {
                      setIsEditing(true);
                      setShowMenu(false);
                    }}
                    className="flex w-full items-center space-x-2 px-4 py-2.5 text-left text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    <Edit2 className="h-4 w-4" />
                    <span>Edit post</span>
                  </button>
                  <button
                    onClick={handleDelete}
                    className="flex w-full items-center space-x-2 px-4 py-2.5 text-left text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Delete post</span>
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {isEditing ? (
        /* Edit Mode */
        <div className="space-y-3">
          {/* Title Input */}
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            placeholder="Title (optional)"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-900 placeholder-gray-400 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
          />

          {/* Content Textarea */}
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            rows={4}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
          />

          {/* Edit Actions */}
          <div className="flex items-center justify-end space-x-2">
            <button
              onClick={handleCancelEdit}
              disabled={isSaving}
              className="flex items-center space-x-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 disabled:opacity-50"
            >
              <X className="h-4 w-4" />
              <span>Cancel</span>
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || !editContent.trim()}
              className="flex items-center space-x-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-3 py-1.5 text-sm font-medium text-white transition-all hover:from-purple-700 hover:to-pink-700 disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
              <span>{isSaving ? "Saving..." : "Save"}</span>
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Title */}
          {post.title && (
            <h2 className="mb-3 text-lg font-semibold text-gray-900">
              {post.title}
            </h2>
          )}

          {/* Content */}
          <div className="mb-4 text-sm leading-relaxed text-gray-700 whitespace-pre-wrap">
            {post.content}
          </div>
        </>
      )}

      {/* Engagement Stats */}
      {!isEditing && (post._count?.reactions || post._count?.comments) && (
        <div className="mb-4 flex items-center space-x-4 border-t border-gray-50 pt-3">
          {post._count.reactions > 0 && (
            <div className="flex items-center space-x-1.5 text-xs text-gray-500">
              <div className="h-4 w-4" />
              <span>{post._count.reactions} reactions</span>
            </div>
          )}
          {post._count.comments > 0 && (
            <div className="flex items-center space-x-1.5 text-xs text-gray-500">
              <MessageCircle className="h-4 w-4" />
              <span>{post._count.comments} comments</span>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      {!isEditing && (
        <div className="flex items-center space-x-2 border-t border-gray-50 pt-3">
          {/* Reactions */}
          <div className="flex-1">
            <PostReactions postId={post.id} />
          </div>

          {/* Comment Button */}
          <button 
            onClick={() => setShowComments(!showComments)}
            className={`flex items-center space-x-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              showComments 
                ? 'bg-purple-50 text-purple-600' 
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <MessageCircle className="h-4 w-4" />
            <span>{post._count?.comments || 0}</span>
          </button>

          {/* Share Button */}
          <button className="flex items-center space-x-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900">
            <Share2 className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Comment Section */}
      {showComments && !isEditing && (
        <div className="mt-6 border-t border-gray-50 pt-6">
          <CommentSection postId={post.id} />
        </div>
      )}
    </article>
  );
}