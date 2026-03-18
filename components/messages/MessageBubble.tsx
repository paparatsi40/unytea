"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Check, CheckCheck, MoreVertical, Trash2, Image as ImageIcon } from "lucide-react";
import { deleteMessage } from "@/app/actions/messages";
import { useToast } from "@/hooks/use-toast";

interface MessageBubbleProps {
  message: {
    id: string;
    content: string;
    createdAt: Date;
    isRead: boolean;
    attachments?: string;
    sender: {
      id: string;
      name: string | null;
      firstName: string | null;
      image: string | null;
    };
  };
  isOwnMessage: boolean;
  onDelete?: () => void;
}

export function MessageBubble({ message, isOwnMessage, onDelete }: MessageBubbleProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const attachments = (() => {
    if (!message.attachments) return [];

    try {
      return typeof message.attachments === "string"
        ? JSON.parse(message.attachments)
        : message.attachments;
    } catch {
      return [];
    }
  })();

  const handleDelete = async () => {
    setIsDeleting(true);
    const result = await deleteMessage(message.id);

    if (result.success) {
      onDelete?.();
      setShowDeleteConfirm(false);
    } else {
      toast({
        title: "Delete failed",
        description: result.error || "Failed to delete message",
        variant: "destructive",
      });
    }

    setIsDeleting(false);
    setShowMenu(false);
  };

  return (
    <div className={`flex items-end gap-2 group ${isOwnMessage ? "flex-row-reverse" : ""}`}>
      {/* Avatar (only for received messages) */}
      {!isOwnMessage && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-semibold">
          {message.sender.image ? (
            <img 
              src={message.sender.image} 
              alt={message.sender.firstName || message.sender.name || "User"}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            (message.sender.firstName?.[0] || message.sender.name?.[0] || "U").toUpperCase()
          )}
        </div>
      )}

      {/* Message content */}
      <div className={`flex flex-col max-w-[70%] ${isOwnMessage ? "items-end" : "items-start"}`}>
        {/* Attachments */}
        {attachments.length > 0 && (
          <div className="mb-1 space-y-1">
            {attachments.map((url: string, index: number) => (
              <div key={index} className="relative">
                {url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                  <img 
                    src={url} 
                    alt="Attachment" 
                    className="max-w-xs rounded-lg border border-gray-200"
                  />
                ) : (
                  <a 
                    href={url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
                      isOwnMessage 
                        ? "bg-gradient-to-r from-purple-600 to-pink-600 border-white/10 text-white" 
                        : "bg-white border-gray-200 text-gray-800"
                    }`}
                  >
                    <ImageIcon className="w-4 h-4" />
                    <span className="text-sm">View attachment</span>
                  </a>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Message bubble */}
        <div className={`relative px-4 py-2 rounded-2xl ${
          isOwnMessage 
            ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-tr-none" 
            : "bg-white border border-gray-200 text-gray-900 rounded-tl-none"
        }`}>
          {message.content ? (
            <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
          ) : (
            <p className={`text-xs italic ${isOwnMessage ? "text-white/80" : "text-gray-500"}`}>
              Attachment
            </p>
          )}
          
          {/* Actions menu (only for own messages) */}
          {isOwnMessage && (
            <div className="absolute -right-8 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1 rounded hover:bg-white/10 transition-colors"
              >
                <MoreVertical className="w-4 h-4 text-white/60" />
              </button>

              {showMenu && (
                <div className="absolute right-0 mt-1 w-36 bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden z-10">
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      setShowDeleteConfirm(true);
                    }}
                    disabled={isDeleting}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Timestamp and read receipt */}
        <div className="flex items-center gap-1 mt-0.5 px-2">
          <span className="text-[10px] text-gray-500/90">
            {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
          </span>
          {isOwnMessage && (
            message.isRead ? (
              <CheckCheck className="w-3 h-3 text-blue-500" />
            ) : (
              <Check className="w-3 h-3 text-gray-400" />
            )
          )}
        </div>

        {showDeleteConfirm && (
          <div className="mt-2 w-full rounded-lg border border-red-200 bg-red-50 p-3">
            <p className="text-xs text-red-700">Delete this message permanently?</p>
            <div className="mt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="rounded-md px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="rounded-md bg-red-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-60"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
