"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { MessageSquare, Users, Send } from "lucide-react";
import { useParams } from "next/navigation";

interface Message {
  id: string;
  content: string;
  userId: string;
  userName: string;
  userImage?: string;
  createdAt: string;
}

export default function CommunityChatClient({ slug, communityName }: { slug: string; communityName: string }) {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [community, setCommunity] = useState<any>(null);

  useEffect(() => {
    fetchCommunity();
    fetchMessages();
    
    // TODO: Setup WebSocket connection for real-time updates
    // const ws = connectToWebSocket(slug);
    // return () => ws.disconnect();
  }, [slug]);

  const fetchCommunity = async () => {
    try {
      const response = await fetch(`/api/communities/${slug}`);
      const data = await response.json();
      if (data.success) {
        setCommunity(data.community);
      }
    } catch (error) {
      console.error("Error fetching community:", error);
    }
  };

  const fetchMessages = async () => {
    try {
      setIsLoading(true);
      // TODO: Implement API endpoint for community messages
      // const response = await fetch(`/api/communities/${slug}/messages`);
      // const data = await response.json();
      // setMessages(data.messages || []);
      
      // For now, show empty state
      setMessages([]);
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !session?.user) return;

    setIsSending(true);
    
    try {
      // TODO: Implement send message API
      // const response = await fetch(`/api/communities/${slug}/messages`, {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify({ content: newMessage }),
      // });

      // Optimistic update
      const tempMessage: Message = {
        id: Date.now().toString(),
        content: newMessage,
        userId: session.user.id || "",
        userName: session.user.name || "You",
        userImage: session.user.image || undefined,
        createdAt: new Date().toISOString(),
      };

      setMessages([...messages, tempMessage]);
      setNewMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)]">
      {/* Header */}
      <div className="border-b border-border bg-card/50 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10">
            <MessageSquare className="h-5 w-5 text-purple-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">
              {communityName} Chat
            </h1>
            <p className="text-sm text-muted-foreground">
              Community-wide conversation
            </p>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-background">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="rounded-full bg-primary/10 p-6 mb-4">
              <MessageSquare className="h-12 w-12 text-primary" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">
              No messages yet
            </h3>
            <p className="text-muted-foreground max-w-sm mb-6">
              Be the first to start the conversation in this community!
            </p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>All community members can see messages here</span>
            </div>
          </div>
        ) : (
          messages.map((message) => {
            const isOwn = message.userId === session?.user?.id;
            
            return (
              <div
                key={message.id}
                className={`flex gap-3 ${isOwn ? "flex-row-reverse" : ""}`}
              >
                {/* Avatar */}
                <div className="flex-shrink-0">
                  {message.userImage ? (
                    <img
                      src={message.userImage}
                      alt={message.userName}
                      className="h-8 w-8 rounded-full"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-semibold text-primary">
                        {message.userName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>

                {/* Message */}
                <div className={`flex flex-col max-w-[70%] ${isOwn ? "items-end" : ""}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-foreground">
                      {message.userName}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(message.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <div
                    className={`rounded-2xl px-4 py-2 ${
                      isOwn
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Message Input */}
      <div className="border-t border-border bg-card/50 p-4">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            disabled={isSending}
            className="flex-1 rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || isSending}
            className="rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Send className="h-4 w-4" />
            Send
          </button>
        </form>
        <p className="text-xs text-muted-foreground mt-2">
          💡 Real-time chat coming soon! For now, refresh to see new messages.
        </p>
      </div>
    </div>
  );
}
