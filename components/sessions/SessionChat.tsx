"use client";

import { useState } from "react";
import { Send, MessageSquare, Pin, Smile } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useChat, useRoomContext } from "@livekit/components-react";

interface SessionChatProps {
  sessionId: string;
  onPinQuestion?: (author: string, content: string) => void;
}

interface ChatMessage {
  id: string;
  from: {
    identity: string;
    name?: string;
  };
  message: string;
  timestamp: number;
}

const REACTIONS = ["👍", "❤️", "🔥", "👏", "💡", "🎉"];

export function SessionChat({ sessionId: _sessionId, onPinQuestion }: SessionChatProps) {
  const { chatMessages, send } = useChat();
  const room = useRoomContext();
  const [message, setMessage] = useState("");
  const [showReactionsFor, setShowReactionsFor] = useState<string | null>(null);
  const [messageReactions, setMessageReactions] = useState<Record<string, string[]>>({});

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    await send(message);
    setMessage("");
  };

  const handleReaction = (messageId: string, emoji: string) => {
    setMessageReactions(prev => ({
      ...prev,
      [messageId]: [...(prev[messageId] || []), emoji],
    }));
    setShowReactionsFor(null);
  };

  const handlePin = (msg: ChatMessage) => {
    if (onPinQuestion) {
      onPinQuestion(msg.from.name || msg.from.identity || "Unknown", msg.message);
    }
  };

  return (
    <div className="flex h-full flex-col bg-zinc-900/30">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-zinc-800 px-4 py-3">
        <MessageSquare className="h-4 w-4 text-blue-400" />
        <span className="text-sm font-medium text-zinc-300">Chat</span>
        <span className="ml-auto text-xs text-zinc-500">
          {chatMessages.length} messages
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {chatMessages.map((msg, idx) => {
          const isMe = msg.from?.identity === room.localParticipant.identity;
          const messageId = `${msg.from?.identity}-${idx}`;
          const reactions = messageReactions[messageId] || [];

          return (
            <div
              key={idx}
              className={cn(
                "group flex flex-col",
                isMe ? "items-end" : "items-start"
              )}
            >
              {/* Message Bubble */}
              <div
                className={cn(
                  "relative max-w-[85%] rounded-lg px-3 py-2",
                  isMe
                    ? "bg-blue-600/90 text-white"
                    : "bg-zinc-800 text-zinc-100"
                )}
              >
                {/* Sender Name */}
                {!isMe && (
                  <p className="mb-1 text-xs font-medium text-zinc-400">
                    {msg.from?.name || msg.from?.identity || "Unknown"}
                  </p>
                )}

                {/* Message Content */}
                <p className="text-sm">{msg.message}</p>

                {/* Hover Actions */}
                <div className="absolute -top-2 right-0 hidden gap-1 rounded-full bg-zinc-800 p-1 shadow-lg group-hover:flex">
                  {/* Pin Button (host only) */}
                  {onPinQuestion && !isMe && (
                    <button
                      onClick={() => handlePin(msg as ChatMessage)}
                      className="flex h-6 w-6 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-700 hover:text-white"
                      title="Pin question"
                    >
                      <Pin className="h-3 w-3" />
                    </button>
                  )}

                  {/* Reaction Button */}
                  <button
                    onClick={() => setShowReactionsFor(showReactionsFor === messageId ? null : messageId)}
                    className="flex h-6 w-6 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-700 hover:text-white"
                  >
                    <Smile className="h-3 w-3" />
                  </button>
                </div>

                {/* Reactions Popup */}
                {showReactionsFor === messageId && (
                  <div className="absolute -top-10 right-0 flex gap-1 rounded-full bg-zinc-800 p-1.5 shadow-xl">
                    {REACTIONS.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => handleReaction(messageId, emoji)}
                        className="flex h-7 w-7 items-center justify-center rounded-full text-lg transition-transform hover:scale-110 hover:bg-zinc-700"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Reactions Display */}
              {reactions.length > 0 && (
                <div className="mt-1 flex gap-1">
                  {reactions.map((reaction, i) => (
                    <span key={i} className="text-sm">{reaction}</span>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {chatMessages.length === 0 && (
          <div className="flex h-32 flex-col items-center justify-center gap-2 text-center">
            <MessageSquare className="h-8 w-8 text-zinc-600" />
            <p className="text-sm text-zinc-500">No messages yet</p>
            <p className="text-xs text-zinc-600">Start the conversation!</p>
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="border-t border-zinc-800 p-3">
        <div className="flex gap-2">
          <Input
            type="text"
            placeholder="Type a message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="flex-1 border-zinc-700 bg-zinc-800 text-white placeholder:text-zinc-500"
          />
          <Button
            type="submit"
            size="icon"
            className="bg-blue-600 hover:bg-blue-700"
            disabled={!message.trim()}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}
