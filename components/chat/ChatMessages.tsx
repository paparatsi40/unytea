"use client";

import { useState, useEffect, useRef } from "react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { getChannelMessages, updateChannelPresence } from "@/app/actions/channels";
import { formatDistanceToNow } from "date-fns";
import { Trash2, Loader2 } from "lucide-react";
import { deleteChannelMessage } from "@/app/actions/channels";
import { useSocket } from "@/hooks/use-socket";

type Message = {
  id: string;
  content: string;
  createdAt: Date;
  author: {
    id: string;
    name: string | null;
    image: string | null;
    level: number;
  };
};

type Props = {
  channelId: string;
};

export function ChatMessages({ channelId }: Props) {
  const { user } = useCurrentUser();
  const [messages, setMessages] = useState<Message[]>([]);
  const [typingUsers, setTypingUsers] = useState<Array<{ id: string; name: string | null }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { socket, isConnected } = useSocket();

  // Load initial messages
  useEffect(() => {
    loadMessages();
    
    // Mark presence as online
    if (user?.id) {
      updateChannelPresence(channelId, true);
    }

    // Cleanup: mark as offline
    return () => {
      if (user?.id) {
        updateChannelPresence(channelId, false);
      }
    };
  }, [channelId, user?.id]);

  // WebSocket: Real-time message updates
  useEffect(() => {
    if (!socket || !isConnected || !channelId) return;

    // Listen for new messages
    const handleNewMessage = (message: Message) => {
      setMessages((prev) => [...prev, message]);
    };

    // Listen for deleted messages
    const handleDeletedMessage = ({ messageId }: { messageId: string }) => {
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    };

    // Listen for typing indicators
    const handleUserTyping = ({ userId, userName }: { userId: string; userName: string }) => {
      if (userId !== user?.id) {
        setTypingUsers((prev) => {
          if (prev.find((u) => u.id === userId)) return prev;
          return [...prev, { id: userId, name: userName }];
        });

        // Remove typing indicator after 3 seconds
        setTimeout(() => {
          setTypingUsers((prev) => prev.filter((u) => u.id !== userId));
        }, 3000);
      }
    };

    const handleUserStoppedTyping = ({ userId }: { userId: string }) => {
      setTypingUsers((prev) => prev.filter((u) => u.id !== userId));
    };

    socket.on("message:new", handleNewMessage);
    socket.on("message:deleted", handleDeletedMessage);
    socket.on("user:typing", handleUserTyping);
    socket.on("user:stopped-typing", handleUserStoppedTyping);

    return () => {
      socket.off("message:new", handleNewMessage);
      socket.off("message:deleted", handleDeletedMessage);
      socket.off("user:typing", handleUserTyping);
      socket.off("user:stopped-typing", handleUserStoppedTyping);
    };
  }, [socket, isConnected, channelId, user?.id]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMessages = async (silent = false) => {
    if (!silent) setIsLoading(true);
    
    const result = await getChannelMessages(channelId);
    
    if (result.success) {
      setMessages(result.messages as Message[]);
    }
    
    if (!silent) setIsLoading(false);
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!confirm("Delete this message?")) return;

    const result = await deleteChannelMessage(messageId);
    if (result.success) {
      // Message will be removed via WebSocket event
      // But keep this as fallback
      setMessages(prev => prev.filter(m => m.id !== messageId));
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const getLevelBadge = (level: number) => {
    if (level >= 10) return { emoji: "🥇", color: "text-yellow-600", bg: "bg-yellow-50" };
    if (level >= 5) return { emoji: "🥈", color: "text-gray-600", bg: "bg-gray-50" };
    return { emoji: "🥉", color: "text-orange-600", bg: "bg-orange-50" };
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-6">
      {messages.length === 0 ? (
        <div className="flex h-full items-center justify-center">
          <div className="text-center">
            <p className="text-lg font-medium text-gray-900">No messages yet</p>
            <p className="text-sm text-gray-500">Be the first to say something!</p>
          </div>
        </div>
      ) : (
        messages.map((message, index) => {
          const isAuthor = user?.id === message.author.id;
          const showAvatar = index === 0 || messages[index - 1].author.id !== message.author.id;
          const levelBadge = getLevelBadge(message.author.level);

          return (
            <div
              key={message.id}
              className={`group flex items-start space-x-3 ${!showAvatar && "ml-11"}`}
            >
              {showAvatar && (
                <div className="relative h-8 w-8 flex-shrink-0 overflow-hidden rounded-full border border-gray-200 bg-gradient-to-br from-purple-500 to-pink-500">
                  {message.author.image ? (
                    <img
                      src={message.author.image}
                      alt={message.author.name || "User"}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-white">
                      {message.author.name?.charAt(0).toUpperCase() || "?"}
                    </div>
                  )}
                  {/* Level Badge */}
                  <div className={`absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full ${levelBadge.bg} border border-white text-[10px]`}>
                    {levelBadge.emoji}
                  </div>
                </div>
              )}

              <div className="min-w-0 flex-1">
                {showAvatar && (
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-semibold text-gray-900">
                      {message.author.name || "Anonymous"}
                    </span>
                    <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${levelBadge.color} ${levelBadge.bg}`}>
                      Lv{message.author.level}
                    </span>
                    <span className="text-xs text-gray-400">
                      {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                )}

                <div className="group/message relative mt-0.5 flex items-start space-x-2">
                  <p className="flex-1 whitespace-pre-wrap break-words text-sm text-gray-700">
                    {message.content}
                  </p>

                  {/* Delete button (only for author) */}
                  {isAuthor && (
                    <button
                      onClick={() => handleDeleteMessage(message.id)}
                      className="opacity-0 transition-opacity group-hover/message:opacity-100 rounded p-1 text-red-500 hover:bg-red-50"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })
      )}

      {/* Typing Indicator */}
      {typingUsers.length > 0 && (
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <div className="flex space-x-1">
            <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: "0ms" }} />
            <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: "150ms" }} />
            <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: "300ms" }} />
          </div>
          <span>
            {typingUsers.length === 1
              ? `${typingUsers[0].name} is typing...`
              : `${typingUsers.length} people are typing...`}
          </span>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}
