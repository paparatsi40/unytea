"use client";

import { useEffect, useRef, useState } from "react";
import { MessageBubble } from "./MessageBubble";
import { MessageInput } from "./MessageInput";
import { getConversationMessages, markMessagesAsRead } from "@/app/actions/messages";
import { Loader2, MoreVertical } from "lucide-react";
import { useCurrentUser } from "@/hooks/use-current-user";

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
}

export function MessageThread({ conversationId, otherUser }: MessageThreadProps) {
  const { user } = useCurrentUser();
  const [messages, setMessages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const loadMessages = async () => {
    const result = await getConversationMessages(conversationId);
    
    if (result.success && result.messages) {
      setMessages(result.messages);
      setError("");
      
      // Mark messages as read
      await markMessagesAsRead(conversationId);
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
      <div className="border-b border-white/10 bg-zinc-900/50 backdrop-blur-sm p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
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
              <h2 className="text-lg font-semibold text-white">{displayName}</h2>
              {otherUser.username && (
                <p className="text-sm text-white/60">@{otherUser.username}</p>
              )}
            </div>
          </div>

          {/* Actions */}
          <button className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white/90 transition-colors">
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {error && (
          <div className="text-center p-4">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {messages.length === 0 && !error ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center mb-4">
              <span className="text-3xl">💬</span>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              Start the conversation
            </h3>
            <p className="text-white/60 max-w-sm">
              Say hi to {displayName}! Send your first message below.
            </p>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                isOwnMessage={message.sender.id === user?.id}
                onDelete={handleMessageDeleted}
              />
            ))}
            <div ref={messagesEndRef} />
          </>
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
