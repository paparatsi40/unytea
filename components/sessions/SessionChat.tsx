"use client";

import { useState } from "react";
import { Send, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useChat, useRoomContext } from "@livekit/components-react";

interface SessionChatProps {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  sessionId: string;
}

export function SessionChat({ sessionId: _sessionId }: SessionChatProps) {
  const { chatMessages, send } = useChat();
  const room = useRoomContext();
  const [message, setMessage] = useState("");

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    await send(message);
    setMessage("");
  };

  return (
    <div className="flex h-full flex-col rounded-xl border border-zinc-200 bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-zinc-200 px-4 py-3">
        <MessageSquare className="h-4 w-4 text-purple-600" />
        <span className="text-sm font-semibold text-zinc-900">Chat</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {chatMessages.map((msg, idx) => {
          const isMe = msg.from?.identity === room.localParticipant.identity;
          
          return (
            <div
              key={idx}
              className={cn(
                "flex flex-col",
                isMe ? "items-end" : "items-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[85%] rounded-lg px-3 py-2",
                  isMe
                    ? "bg-purple-600 text-white"
                    : "bg-zinc-100 text-zinc-900"
                )}
              >
                {!isMe && (
                  <p className="mb-1 text-xs font-medium opacity-80">
                    {msg.from?.name || msg.from?.identity || "Unknown"}
                  </p>
                )}
                <p className="text-sm">{msg.message}</p>
              </div>
            </div>
          );
        })}

        {chatMessages.length === 0 && (
          <div className="flex h-32 items-center justify-center text-center">
            <p className="text-sm text-zinc-500">No messages yet</p>
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="border-t border-zinc-200 p-3">
        <div className="flex gap-2">
          <Input
            type="text"
            placeholder="Type a message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" size="icon">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}
