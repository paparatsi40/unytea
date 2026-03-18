"use client";

import { useState } from "react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { PostReactions } from "@/components/community/PostReactions";
import { CommentSection } from "@/components/community/CommentSection";
import { SessionAnnouncementCard } from "@/components/community/SessionAnnouncementCard";
import { deletePost, togglePostPin, updatePost } from "@/app/actions/posts";
import { MessageCircle, Share2, MoreHorizontal, Clock, Edit2, Trash2, X, Check, Pin } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

type PostAttachment = {
  url: string;
  name: string;
  type: "image" | "document" | "media";
};

type Post = {
  id: string;
  title: string | null;
  content: string;
  contentType?: string;
  isPinned?: boolean;
  createdAt: Date;
  author: {
    id: string;
    name: string | null;
    image: string | null;
  };
  attachments?: PostAttachment[] | null;
  _count?: {
    comments: number;
    reactions: number;
  };
};

export function PremiumPostCard({ post, canModeratePost = false }: { post: Post; canModeratePost?: boolean }) {
  const { user } = useCurrentUser();
  
  // If this is a session announcement, render the special card
  if (post.contentType === "SESSION_ANNOUNCEMENT") {
    return <SessionAnnouncementCard post={post} />;
  }
  
  const [showMenu, setShowMenu] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(post.title || "");
  const [editContent, setEditContent] = useState(post.content);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isPinned, setIsPinned] = useState(Boolean(post.isPinned));
  const [isPinToggling, setIsPinToggling] = useState(false);
  const [commentCount, setCommentCount] = useState(post._count?.comments ?? 0);
  
  const authorName = post.author.name || "Anonymous";
  const timeAgo = formatDistanceToNow(new Date(post.createdAt), { addSuffix: true });
  const isAuthor = user?.id === post.author.id;

  const handleDelete = async () => {
    setIsDeleting(true);
    const result = await deletePost(post.id);

    if (result.success) {
      // Post will be removed by revalidation
      return;
    }

    toast.error(result.error || "Failed to delete post");
    setIsDeleting(false);
  };

  const handleSave = async () => {
    if (!editContent.trim()) {
      toast.error("Content cannot be empty");
      return;
    }

    setIsSaving(true);
    const formData = new FormData();
    if (editTitle) formData.append("title", editTitle);
    formData.append("content", editContent);
    
    const result = await updatePost(post.id, formData);

    if (result.success) {
      setIsEditing(false);
      setShowMenu(false);
      setConfirmDelete(false);
      toast.success("Post updated");
      return;
    }

    toast.error(result.error || "Failed to update post");
    setIsSaving(false);
  };

  const handleCancelEdit = () => {
    setEditTitle(post.title || "");
    setEditContent(post.content);
    setIsEditing(false);
    setShowMenu(false);
    setConfirmDelete(false);
  };

  const handleShare = async () => {
    if (isSharing) return;
    setIsSharing(true);

    try {
      const postUrl = `${window.location.origin}${window.location.pathname}#post-${post.id}`;
      await navigator.clipboard.writeText(postUrl);
      toast.success("Link copied", { description: "Post link is ready to share." });
    } catch {
      toast.error("Couldn't copy link", { description: "Please copy URL from your browser." });
    } finally {
      setIsSharing(false);
    }
  };

  const handleTogglePin = async () => {
    if (isPinToggling) return;
    setIsPinToggling(true);

    const result = await togglePostPin(post.id);

    if (!result.success) {
      toast.error(result.error || "Failed to update pin state");
      setIsPinToggling(false);
      return;
    }

    setIsPinned(Boolean(result.isPinned));
    setShowMenu(false);
    toast.success(result.isPinned ? "Post pinned" : "Post unpinned");
    setIsPinToggling(false);
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
      {isPinned && (
        <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-purple-50 px-2.5 py-1 text-[11px] font-semibold text-purple-700">
          <Pin className="h-3.5 w-3.5" />
          Pinned
        </div>
      )}

      {/* Author Header */}
      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-center space-x-3">
          {/* Avatar */}
          <div className="relative h-10 w-10 overflow-hidden rounded-full border border-gray-100 bg-gradient-to-br from-purple-500 to-pink-500">
            {post.author.image ? (
              <img
                src={post.author.image}
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

        {/* Menu Button - show for author or moderators */}
        {(isAuthor || canModeratePost) && (
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
                  {canModeratePost && (
                    <button
                      onClick={handleTogglePin}
                      disabled={isPinToggling}
                      className="flex w-full items-center space-x-2 px-4 py-2.5 text-left text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-60"
                    >
                      <Pin className="h-4 w-4" />
                      <span>{isPinToggling ? "Updating..." : isPinned ? "Unpin post" : "Pin post"}</span>
                    </button>
                  )}
                  {isAuthor && (
                    <>
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
                        onClick={() => {
                          setConfirmDelete(true);
                          setShowMenu(false);
                        }}
                        className="flex w-full items-center space-x-2 px-4 py-2.5 text-left text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span>Delete post</span>
                      </button>
                    </>
                  )}
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

          {Array.isArray(post.attachments) && post.attachments.length > 0 && (
            <div className="mb-4 grid gap-2 sm:grid-cols-2">
              {post.attachments.map((attachment: any, index: number) => {
                const isImage = attachment?.type === "image" || /\.(png|jpe?g|gif|webp|svg)$/i.test(attachment?.url || "");
                return (
                  <a
                    key={`${attachment?.url || "file"}-${index}`}
                    href={attachment?.url}
                    target="_blank"
                    rel="noreferrer"
                    className="overflow-hidden rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100"
                  >
                    {isImage ? (
                      <img
                        src={attachment?.url}
                        alt={attachment?.name || "Attachment"}
                        className="h-36 w-full object-cover"
                      />
                    ) : (
                      <div className="flex items-center gap-2 px-3 py-3 text-sm text-gray-700">
                        <span className="truncate">{attachment?.name || "Attachment"}</span>
                      </div>
                    )}
                  </a>
                );
              })}
            </div>
          )}
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
          {commentCount > 0 && (
            <div className="flex items-center space-x-1.5 text-xs text-gray-500">
              <MessageCircle className="h-4 w-4" />
              <span>{commentCount} comments</span>
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
            <span>{commentCount}</span>
          </button>

          {/* Share Button */}
          <button
            onClick={handleShare}
            disabled={isSharing}
            className="flex items-center space-x-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900 disabled:opacity-60"
          >
            <Share2 className="h-4 w-4" />
            <span>{isSharing ? "Copying..." : "Share"}</span>
          </button>
        </div>
      )}

      {confirmDelete && !isEditing && (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
          <p className="text-xs font-medium text-red-700">Delete this post permanently?</p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setConfirmDelete(false)}
              className="rounded-md px-2 py-1 text-xs font-medium text-gray-600 hover:bg-white"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              className="rounded-md bg-red-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-red-700"
            >
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Comment Section */}
      {showComments && !isEditing && (
        <div className="mt-6 border-t border-gray-50 pt-6">
          <CommentSection postId={post.id} onCountChange={setCommentCount} />
        </div>
      )}
    </article>
  );
}