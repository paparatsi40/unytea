"use client";

import { useEffect, useState } from "react";
import { Search, MessageSquarePlus, Loader2 } from "lucide-react";
import { getUserConversations } from "@/app/actions/messages";
import { formatDistanceToNow } from "date-fns";
import { useCurrentUser } from "@/hooks/use-current-user";

interface ConversationListProps {
  activeConversationId?: string;
  onSelectConversation: (conversationId: string, otherUser: any) => void;
  onNewMessage: () => void;
}

export function ConversationList({ 
  activeConversationId, 
  onSelectConversation,
  onNewMessage 
}: ConversationListProps) {
  const { user } = useCurrentUser();
  const [conversations, setConversations] = useState<any[]>([]);
  const [filteredConversations, setFilteredConversations] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const loadConversations = async () => {
    const result = await getUserConversations();
    
    if (result.success && result.conversations) {
      setConversations(result.conversations);
      setFilteredConversations(result.conversations);
    }
    
    setIsLoading(false);
  };

  useEffect(() => {
    loadConversations();

    // Auto-refresh every 10 seconds
    const interval = setInterval(loadConversations, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = conversations.filter((conv) => {
        const otherUser = getOtherUser(conv);
        const name = otherUser.firstName || otherUser.name || otherUser.username || "";
        return name.toLowerCase().includes(searchQuery.toLowerCase());
      });
      setFilteredConversations(filtered);
    } else {
      setFilteredConversations(conversations);
    }
  }, [searchQuery, conversations]);

  const getOtherUser = (conversation: any) => {
    return conversation.participant1.id === user?.id
      ? conversation.participant2
      : conversation.participant1;
  };

  const getLastMessage = (conversation: any) => {
    return conversation.messages?.[0];
  };

  const getUnreadCount = (conversation: any) => {
    return conversation._count?.messages || 0;
  };

  return (
    <div className="w-80 border-r border-white/10 flex flex-col bg-zinc-900/30">
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-white">Messages</h1>
          <button
            onClick={onNewMessage}
            className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white/90 transition-colors"
            title="New message"
          >
            <MessageSquarePlus className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
          />
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center mb-4">
              <span className="text-3xl">💬</span>
            </div>
            <h3 className="text-sm font-semibold text-white mb-1">
              {searchQuery ? "No conversations found" : "No messages yet"}
            </h3>
            <p className="text-xs text-white/60">
              {searchQuery ? "Try a different search" : "Start a new conversation"}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {filteredConversations.map((conversation) => {
              const otherUser = getOtherUser(conversation);
              const lastMessage = getLastMessage(conversation);
              const unreadCount = getUnreadCount(conversation);
              const isActive = conversation.id === activeConversationId;
              const displayName = otherUser.firstName || otherUser.name || otherUser.username || "User";

              return (
                <button
                  key={conversation.id}
                  onClick={() => onSelectConversation(conversation.id, otherUser)}
                  className={`w-full p-4 text-left hover:bg-white/5 transition-colors ${
                    isActive ? "bg-white/5 border-r-2 border-purple-500" : ""
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold">
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
                      {unreadCount > 0 && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center text-xs font-bold text-white">
                          {unreadCount > 9 ? "9+" : unreadCount}
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2 mb-1">
                        <h3 className={`font-semibold truncate ${
                          unreadCount > 0 ? "text-white" : "text-white/90"
                        }`}>
                          {displayName}
                        </h3>
                        {lastMessage && (
                          <span className="text-xs text-white/40 flex-shrink-0">
                            {formatDistanceToNow(new Date(lastMessage.createdAt), { 
                              addSuffix: false 
                            })}
                          </span>
                        )}
                      </div>

                      {lastMessage ? (
                        <p className={`text-sm truncate ${
                          unreadCount > 0 ? "text-white/90 font-medium" : "text-white/60"
                        }`}>
                          {lastMessage.sender.id === user?.id && "You: "}
                          {lastMessage.content}
                        </p>
                      ) : (
                        <p className="text-sm text-white/40 italic">No messages yet</p>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
