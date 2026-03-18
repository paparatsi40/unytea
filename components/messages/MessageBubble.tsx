"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  Check,
  CheckCheck,
  MoreVertical,
  Trash2,
  Image as ImageIcon,
} from "lucide-react";
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

export function MessageBubble({
  message,
  isOwnMessage,
  onDelete,
}: MessageBubbleProps) {
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

  const senderInitial = (
    message.sender.firstName?.[0] ||
    message.sender.name?.[0] ||
    "U"
  ).toUpperCase();

  return (
    <div
      className={`group flex items-end gap-2 ${isOwnMessage ? "justify-end" : "justify-start"}`}
    >
      {!isOwnMessage && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-sm font-semibold text-white shadow-sm">
          {message.sender.image ? (
            <img
              src={message.sender.image}
              alt={message.sender.firstName || message.sender.name || "User"}
              className="h-full w-full rounded-full object-cover"
            />
          ) : (
            senderInitial
          )}
        </div>
      )}

      <div
        className={`relative flex max-w-[68%] flex-col ${isOwnMessage ? "items-end" : "items-start"}`}
      >
        {attachments.length > 0 && (
          <div className="mb-1.5 space-y-1.5">
            {attachments.map((url: string, index: number) => (
              <div key={index} className="relative">
                {url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                  <img
                    src={url}
                    alt="Attachment"
                    className="max-w-xs rounded-2xl border border-gray-200 shadow-sm"
                  />
                ) : (
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm shadow-sm ${
                      isOwnMessage
                        ? "border-white/10 bg-gradient-to-r from-purple-600 to-pink-600 text-white"
                        : "border-gray-200 bg-white text-gray-800"
                    }`}
                  >
                    <ImageIcon className="h-4 w-4" />
                    <span>View attachment</span>
                  </a>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="relative">
          <div
            className={`relative px-4 py-2.5 shadow-sm ${
              isOwnMessage
                ? "rounded-2xl rounded-br-md bg-gradient-to-r from-purple-600 to-pink-600 text-white"
                : "rounded-2xl rounded-bl-md border border-gray-200 bg-white text-gray-900"
            }`}
          >
            {message.content ? (
              <p className="whitespace-pre-wrap break-words text-sm leading-6">
                {message.content}
              </p>
            ) : (
              <p
                className={`text-xs italic ${
                  isOwnMessage ? "text-white/80" : "text-gray-500"
                }`}
              >
                Attachment
              </p>
            )}

            {isOwnMessage && (
              <div className="absolute -left-9 top-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  type="button"
                  onClick={() => setShowMenu(!showMenu)}
                  className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-white hover:text-gray-600"
                  aria-label="Message actions"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>

                {showMenu && (
                  <div className="absolute left-0 z-10 mt-1 w-36 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        setShowDeleteConfirm(true);
                      }}
                      disabled={isDeleting}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div
            className={`mt-1 flex items-center gap-1 px-1 ${
              isOwnMessage ? "justify-end" : "justify-start"
            }`}
          >
            <span className="text-[11px] leading-none text-gray-500">
              {formatDistanceToNow(new Date(message.createdAt), {
                addSuffix: true,
              })}
            </span>

            {isOwnMessage &&
              (message.isRead ? (
                <CheckCheck className="h-3 w-3 text-blue-500" />
              ) : (
                <Check className="h-3 w-3 text-gray-400" />
              ))}
          </div>
        </div>

        {showDeleteConfirm && (
          <div className="mt-2 w-full max-w-xs rounded-2xl border border-red-200 bg-red-50 p-3 shadow-sm">
            <p className="text-xs text-red-700">
              Delete this message permanently?
            </p>

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