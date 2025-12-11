"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Check, CheckCheck, MoreVertical, Trash2, Image as ImageIcon } from "lucide-react";
import { deleteMessage } from "@/app/actions/messages";

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
  const [isDeleting, setIsDeleting] = useState(false);

  const attachments = message.attachments ? JSON.parse(message.attachments) : [];

  const handleDelete = async () => {
    if (!confirm("Delete this message?")) return;

    setIsDeleting(true);
    const result = await deleteMessage(message.id);
    
    if (result.success) {
      onDelete?.();
    } else {
      alert(result.error || "Failed to delete message");
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
                    className="max-w-xs rounded-lg border border-white/10"
                  />
                ) : (
                  <a 
                    href={url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
                      isOwnMessage 
                        ? "bg-gradient-to-r from-purple-600 to-pink-600 border-white/10 text-white" 
                        : "bg-white/5 border-white/10 text-white/90"
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
            : "bg-white/5 backdrop-blur-sm text-white/90 rounded-tl-none"
        }`}>
          <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
          
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
                <div className="absolute right-0 mt-1 w-32 bg-zinc-900 border border-white/10 rounded-lg shadow-xl overflow-hidden z-10">
                  <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                    {isDeleting ? "Deleting..." : "Delete"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Timestamp and read receipt */}
        <div className="flex items-center gap-1 mt-1 px-2">
          <span className="text-xs text-white/40">
            {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
          </span>
          {isOwnMessage && (
            message.isRead ? (
              <CheckCheck className="w-3 h-3 text-blue-400" />
            ) : (
              <Check className="w-3 h-3 text-white/40" />
            )
          )}
        </div>
      </div>
    </div>
  );
}
