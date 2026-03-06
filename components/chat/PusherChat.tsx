"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Send, Loader2, Users, Wifi, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { usePusher } from "@/hooks/use-pusher";
import { useCurrentUser } from "@/hooks/use-current-user";

interface Message {
  id: string;
  content: string;
  senderId: string;
  senderName: string;
  timestamp: string;
}

interface PusherChatProps {
  channelId: string;
  channelName: string;
}

export function PusherChat({ channelId, channelName }: PusherChatProps) {
  const { user } = useCurrentUser();
  const { sendMessage, onMessage, isConnected } = usePusher(
    channelId,
    user?.id || ""
  );

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Handle incoming messages
  useEffect(() => {
    const unsubscribe = onMessage((message) => {
      setMessages((prev) => [...prev, message]);
    });

    return unsubscribe;
  }, [onMessage]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Send message handler
  const handleSend = useCallback(async () => {
    if (!newMessage.trim() || !user?.id) return;

    setIsSending(true);
    try {
      await sendMessage(newMessage.trim(), user.name || "Anonymous");
      setNewMessage("");
      inputRef.current?.focus();
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setIsSending(false);
    }
  }, [newMessage, user, sendMessage]);

  // Handle Enter key
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  // Group messages by sender
  const groupedMessages = messages.reduce((acc, message, index) => {
    const prevMessage = messages[index - 1];
    const isSameSender = prevMessage?.senderId === message.senderId;
    const timeDiff = prevMessage
      ? new Date(message.timestamp).getTime() -
        new Date(prevMessage.timestamp).getTime()
      : Infinity;
    const isWithinTimeWindow = timeDiff < 5 * 60 * 1000; // 5 minutes

    if (isSameSender && isWithinTimeWindow) {
      acc[acc.length - 1].messages.push(message);
    } else {
      acc.push({
        senderId: message.senderId,
        senderName: message.senderName,
        messages: [message],
      });
    }
    return acc;
  }, [] as { senderId: string; senderName: string; messages: Message[] }[]);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-muted-foreground" />
          <div>
            <h3 className="font-semibold">{channelName}</h3>
            <p className="text-xs text-muted-foreground">
              {isConnected ? (
                <span className="flex items-center gap-1 text-green-500">
                  <Wifi className="h-3 w-3" />
                  Connected
                </span>
              ) : (
                <span className="flex items-center gap-1 text-yellow-500">
                  <WifiOff className="h-3 w-3" />
                  Connecting...
                </span>
              )}
            </p>
          </div>
        </div>
        <Badge variant="secondary">{messages.length} messages</Badge>
      </div>

      {/* Messages */}
      <ScrollArea ref={scrollRef} className="flex-1 p-4">
        <div className="space-y-4">
          {groupedMessages.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center text-muted-foreground">
              <Users className="mb-2 h-8 w-8 opacity-50" />
              <p>No messages yet</p>
              <p className="text-sm">Start the conversation!</p>
            </div>
          ) : (
            groupedMessages.map((group) => {
              const isOwnMessage = group.senderId === user?.id;
              const initials = group.senderName
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2);

              return (
                <div
                  key={`${group.senderId}-${group.messages[0].id}`}
                  className={`flex gap-3 ${
                    isOwnMessage ? "flex-row-reverse" : ""
                  }`}
                >
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div
                    className={`flex max-w-[80%] flex-col ${
                      isOwnMessage ? "items-end" : "items-start"
                    }`}
                  >
                    <span className="mb-1 text-xs text-muted-foreground">
                      {group.senderName}
                    </span>
                    <div className="space-y-1">
                      {group.messages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`rounded-lg px-3 py-2 text-sm ${
                            isOwnMessage
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          }`}
                        >
                          {msg.content}
                        </div>
                      ))}
                    </div>
                    <span className="mt-1 text-[10px] text-muted-foreground">
                      {(() => {
                        const date = new Date(group.messages[group.messages.length - 1].timestamp);
                        const now = new Date();
                        const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
                        
                        if (diffInMinutes < 1) return "just now";
                        if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
                        if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
                        return `${Math.floor(diffInMinutes / 1440)}d ago`;
                      })()}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t p-4">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!isConnected || isSending}
            className="flex-1"
          />
          <Button
            onClick={handleSend}
            disabled={!newMessage.trim() || !isConnected || isSending}
            size="icon"
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
