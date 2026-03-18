"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MessageBubble } from "./MessageBubble";
import { MessageInput } from "./MessageInput";
import { getConversationMessages, markMessagesAsRead } from "@/app/actions/messages";
import { ChevronLeft, Loader2, MoreVertical } from "lucide-react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { usePusher } from "@/hooks/use-pusher";

interface MessageThreadProps {
  conversationId: string;
  otherUser: {
    id: string;
    name: string | null;
    firstName: string | null;
    lastName: string | null;
    username: string | null;
    image: string | null;
  };
  subtitle?: string;
  onBack?: () => void;
  showBackButton?: boolean;
  onConversationRead?: () => void;
}

const formatDayLabel = (dateLike: string | Date) => {
  const date = new Date(dateLike);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";

  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
};

export function MessageThread({
  conversationId,
  otherUser,
  subtitle = "Direct conversation",
  onBack,
  showBackButton = false,
  onConversationRead,
}: MessageThreadProps) {
  const { user } = useCurrentUser();
  const [messages, setMessages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { onMessage } = usePusher(conversationId, user?.id || "");

  const displayName =
    otherUser.firstName || otherUser.name || otherUser.username || "User";

  const loadMessages = useCallback(async () => {
    const result = await getConversationMessages(conversationId);

    if (result.success && result.messages) {
      setMessages(result.messages);
      setError("");

      await markMessagesAsRead(conversationId);
      onConversationRead?.();
    } else {
      setError(result.error || "Failed to load messages");
    }

    setIsLoading(false);
  }, [conversationId, onConversationRead]);

  useEffect(() => {
    loadMessages();

    const interval = setInterval(loadMessages, 5000);
    return () => clearInterval(interval);
  }, [loadMessages]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: messages.length <= 2 ? "auto" : "smooth",
        block: "end",
      });
    }
  }, [messages]);

  useEffect(() => {
    const unsubscribe = onMessage((incomingMessage) => {
      if (incomingMessage.conversationId !== conversationId) return;
      loadMessages();
    });

    return () => unsubscribe();
  }, [onMessage, conversationId, loadMessages]);

  const handleMessageSent = () => {
    loadMessages();
  };

  const handleMessageDeleted = () => {
    loadMessages();
  };

  const isLowVolumeThread = messages.length > 0 && messages.length <= 8;

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
          <p className="text-sm text-gray-500">Loading conversation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-white">
      <div className="border-b border-gray-200 bg-white px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex min-w-0 items-center gap-3">
            {showBackButton && (
              <button
                type="button"
                onClick={onBack}
                className="-ml-2 rounded-lg p-2 text-gray-600 hover:bg-gray-100 md:hidden"
                aria-label="Back to conversations"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            )}

            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-sm font-semibold text-white shadow-sm">
              {otherUser.image ? (
                <img
                  src={otherUser.image}
                  alt={displayName}
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                displayName[0].toUpperCase()
              )}
            </div>

            <div className="min-w-0">
              <h2 className="truncate text-lg font-semibold text-gray-900">
                {displayName}
              </h2>
              <p className="truncate text-sm text-gray-500">{subtitle}</p>
            </div>
          </div>

          <button
            type="button"
            className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800"
            aria-label="Conversation actions"
          >
            <MoreVertical className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div
        className={`flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-5 pb-4 ${
          isLowVolumeThread ? "bg-white pt-1" : "bg-gray-50 pt-3"
        }`}
      >
        {error && (
          <div className="mb-4 flex justify-center">
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              <div className="flex items-center gap-3">
                <span>{error}</span>
                <button
                  type="button"
                  onClick={loadMessages}
                  className="font-medium text-red-700 underline underline-offset-2"
                >
                  Retry
                </button>
              </div>
            </div>
          </div>
        )}

        {messages.length === 0 && !error ? (
          <div className="flex min-h-full flex-col items-center justify-center p-8 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20">
              <span className="text-3xl">💬</span>
            </div>
            <h3 className="mb-2 text-lg font-semibold text-gray-900">
              Start the conversation
            </h3>
            <p className="max-w-sm text-gray-600">
              Say hi to {displayName}! Send your first message below.
            </p>
          </div>
        ) : (
          <div className="flex min-h-full flex-col">
            <div
              className={`mt-auto ${
                isLowVolumeThread
                  ? "mx-auto w-full max-w-[760px] rounded-2xl border border-gray-200/80 bg-gray-50/90 px-4 py-3 shadow-sm space-y-1.5"
                  : "space-y-2 pb-4"
              }`}
            >
              {messages.map((message, index) => {
                const currentDay = new Date(message.createdAt).toDateString();
                const previousDay =
                  index > 0
                    ? new Date(messages[index - 1].createdAt).toDateString()
                    : null;
                const showDaySeparator =
                  index === 0 || currentDay !== previousDay;

                return (
                  <div key={message.id} className="space-y-1">
                    {showDaySeparator && (
                      <div className={`flex justify-center ${isLowVolumeThread ? "py-0" : "py-0.5"}`}>
                        <span className="rounded-full bg-white px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-gray-500 shadow-sm ring-1 ring-gray-200">
                          {formatDayLabel(message.createdAt)}
                        </span>
                      </div>
                    )}

                    <MessageBubble
                      message={message}
                      isOwnMessage={message.sender.id === user?.id}
                      onDelete={handleMessageDeleted}
                    />
                  </div>
                );
              })}

              <div ref={messagesEndRef} className="h-1" />
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-gray-200 bg-white/95 backdrop-blur-sm">
        <MessageInput
          conversationId={conversationId}
          onMessageSent={handleMessageSent}
        />
      </div>
    </div>
  );
}