"use client";

import { useEffect, useRef, useState } from "react";
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

export function MessageThread({ conversationId, otherUser, subtitle = "Direct conversation", onBack, showBackButton = false, onConversationRead }: MessageThreadProps) {
  const { user } = useCurrentUser();
  const [messages, setMessages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { onMessage } = usePusher(conversationId, user?.id || "");

  const loadMessages = async () => {
    const result = await getConversationMessages(conversationId);
    
    if (result.success && result.messages) {
      setMessages(result.messages);
      setError("");
      
      // Mark messages as read
      await markMessagesAsRead(conversationId);
      onConversationRead?.();
    } else {
      setError(result.error || "Failed to load messages");
    }
    
    setIsLoading(false);
  };

  useEffect(() => {
    loadMessages();

    // Auto-refresh messages every 5 seconds
    const interval = setInterval(loadMessages, 5000);
    return () => clearInterval(interval);
  }, [conversationId]);

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    const unsubscribe = onMessage((incomingMessage) => {
      if (incomingMessage.conversationId !== conversationId) return;
      loadMessages();
    });

    return () => unsubscribe();
  }, [onMessage, conversationId]);

  const handleMessageSent = () => {
    loadMessages();
  };

  const handleMessageDeleted = () => {
    loadMessages();
  };

  const displayName = otherUser.firstName || otherUser.name || otherUser.username || "User";

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {showBackButton && (
              <button
                type="button"
                onClick={onBack}
                className="md:hidden p-2 -ml-2 rounded-lg hover:bg-gray-100 text-gray-600"
                aria-label="Back to conversations"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}

            {/* Avatar */}
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold">
              {otherUser.image ? (
                <img 
                  src={otherUser.image} 
                  alt={displayName}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                displayName[0].toUpperCase()
              )}
            </div>

            {/* Name */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{displayName}</h2>
              <p className="text-xs text-gray-500">{subtitle}</p>
            </div>
          </div>

          {/* Actions */}
          <button className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition-colors">
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden p-4 bg-gray-50"
      >
        {error && (
          <div className="text-center p-4">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {messages.length === 0 && !error ? (
          <div className="min-h-full flex flex-col items-center justify-center text-center p-8">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center mb-4">
              <span className="text-3xl">💬</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Start the conversation
            </h3>
            <p className="text-gray-600 max-w-sm">
              Say hi to {displayName}! Send your first message below.
            </p>
          </div>
        ) : (
          <div className="min-h-full flex flex-col justify-end gap-3">
            {messages.map((message, index) => {
              const currentDay = new Date(message.createdAt).toDateString();
              const previousDay = index > 0 ? new Date(messages[index - 1].createdAt).toDateString() : null;
              const showDaySeparator = index === 0 || currentDay !== previousDay;

              return (
                <div key={message.id} className="space-y-2">
                  {showDaySeparator && (
                    <div className="flex items-center gap-3 py-2">
                      <div className="h-px flex-1 bg-gray-200" />
                      <span className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
                        {formatDayLabel(message.createdAt)}
                      </span>
                      <div className="h-px flex-1 bg-gray-200" />
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
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <MessageInput 
        conversationId={conversationId}
        onMessageSent={handleMessageSent}
      />
    </div>
  );
}
