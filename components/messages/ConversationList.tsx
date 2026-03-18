"use client";

import { useEffect, useRef, useState } from "react";
import { Search, MessageSquarePlus, Loader2 } from "lucide-react";
import { getUserConversations } from "@/app/actions/messages";
import { formatDistanceToNow } from "date-fns";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useToast } from "@/hooks/use-toast";

interface ConversationListProps {
  activeConversationId?: string;
  onSelectConversation: (conversationId: string, otherUser: any) => void;
  onNewMessage: () => void;
  onUnreadTotalChange?: (count: number) => void;
  refreshToken?: number;
}

export function ConversationList({
  activeConversationId,
  onSelectConversation,
  onNewMessage,
  onUnreadTotalChange,
  refreshToken,
}: ConversationListProps) {
  const { user } = useCurrentUser();
  const [conversations, setConversations] = useState<any[]>([]);
  const [filteredConversations, setFilteredConversations] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [isLoading, setIsLoading] = useState(true);
  const previousUnreadByConversationRef = useRef<Record<string, number>>({});
  const isFirstLoadRef = useRef(true);
  const { toast } = useToast();

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

  const loadConversations = async () => {
    const result = await getUserConversations();

    if (result.success && result.conversations) {
      setConversations(result.conversations);
      setFilteredConversations(result.conversations);

      const unreadTotal = result.conversations.reduce(
        (sum: number, conv: any) => sum + (conv._count?.messages || 0),
        0
      );
      onUnreadTotalChange?.(unreadTotal);

      const nextUnreadByConversation = result.conversations.reduce(
        (acc: Record<string, number>, conv: any) => {
          acc[conv.id] = conv._count?.messages || 0;
          return acc;
        },
        {}
      );

      if (!isFirstLoadRef.current) {
        result.conversations.forEach((conv: any) => {
          if (conv.id === activeConversationId) return;

          const previousUnread = previousUnreadByConversationRef.current[conv.id] || 0;
          const currentUnread = nextUnreadByConversation[conv.id] || 0;

          if (currentUnread > previousUnread) {
            const otherUser = getOtherUser(conv);
            const displayName = otherUser.firstName || otherUser.name || otherUser.username || "User";
            const diff = currentUnread - previousUnread;

            toast({
              title: `New message from ${displayName}`,
              description: diff > 1 ? `${diff} new unread messages` : "1 new unread message",
            });
          }
        });
      }

      previousUnreadByConversationRef.current = nextUnreadByConversation;
      isFirstLoadRef.current = false;
    }

    setIsLoading(false);
  };

  useEffect(() => {
    loadConversations();

    const interval = setInterval(loadConversations, 10000);
    return () => clearInterval(interval);
  }, [refreshToken]);

  useEffect(() => {
    const query = searchQuery.trim().toLowerCase();

    let next = [...conversations];

    if (filter === "unread") {
      next = next.filter((conv) => getUnreadCount(conv) > 0);
    }

    if (query) {
      next = next.filter((conv) => {
        const otherUser = getOtherUser(conv);
        const fullName = `${otherUser.firstName || ""} ${otherUser.lastName || ""}`.trim();
        const name = (otherUser.name || "").toLowerCase();
        const username = (otherUser.username || "").toLowerCase();

        return (
          fullName.toLowerCase().includes(query) ||
          name.includes(query) ||
          username.includes(query)
        );
      });
    }

    setFilteredConversations(next);
  }, [searchQuery, conversations, filter]);

  const unreadTotal = conversations.reduce(
    (sum, conv) => sum + getUnreadCount(conv),
    0
  );

  return (
    <div className="flex w-full flex-col border-r border-gray-200 bg-white md:w-[310px]">
      {/* Header */}
      <div className="border-b border-gray-200 px-4 py-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h1 className="text-[2rem] font-semibold tracking-tight text-gray-950">
              Messages
            </h1>
            {unreadTotal > 0 && (
              <span className="rounded-full bg-purple-600 px-2 py-0.5 text-xs font-semibold text-white">
                {unreadTotal > 99 ? "99+" : unreadTotal}
              </span>
            )}
          </div>

          <button
            onClick={onNewMessage}
            className="inline-flex items-center gap-1.5 rounded-xl border border-purple-200 bg-purple-50 px-3 py-2 text-xs font-semibold text-purple-700 transition-colors hover:border-purple-300 hover:bg-purple-100"
            title="New message"
          >
            <MessageSquarePlus className="h-4 w-4" />
            <span>New</span>
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or username..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
          />
        </div>

        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === "all"
                ? "bg-purple-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            All
          </button>

          <button
            type="button"
            onClick={() => setFilter("unread")}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === "unread"
                ? "bg-purple-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Unread {unreadTotal > 0 ? `(${unreadTotal > 99 ? "99+" : unreadTotal})` : ""}
          </button>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center p-8 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20">
              <span className="text-3xl">💬</span>
            </div>
            <h3 className="mb-1 text-sm font-semibold text-gray-900">
              {searchQuery ? "No conversations found" : "No messages yet"}
            </h3>
            <p className="text-xs text-gray-500">
              {searchQuery ? "Try a different search" : "Start a new conversation"}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredConversations.map((conversation) => {
              const otherUser = getOtherUser(conversation);
              const lastMessage = getLastMessage(conversation);
              const unreadCount = getUnreadCount(conversation);
              const isActive = conversation.id === activeConversationId;
              const displayName =
                otherUser.firstName || otherUser.name || otherUser.username || "User";

              return (
                <button
                  key={conversation.id}
                  onClick={() => onSelectConversation(conversation.id, otherUser)}
                  className={`w-full px-4 py-3 text-left transition-colors ${
                    isActive
                      ? "border-r-2 border-purple-500 bg-purple-50/80 shadow-[inset_0_0_0_1px_rgba(168,85,247,0.14)]"
                      : "hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="relative shrink-0">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-sm font-semibold text-white">
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

                      {unreadCount > 0 && (
                        <div className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-purple-600 text-[10px] font-bold text-white">
                          {unreadCount > 9 ? "9+" : unreadCount}
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="mb-0.5 flex items-start justify-between gap-2">
                        <h3
                          className={`truncate text-sm font-semibold leading-5 ${
                            unreadCount > 0 ? "text-gray-950" : "text-gray-800"
                          }`}
                        >
                          {displayName}
                        </h3>

                        {lastMessage && (
                          <span
                            className={`shrink-0 pt-0.5 text-[11px] ${
                              isActive ? "text-purple-700" : "text-gray-500"
                            }`}
                          >
                            {formatDistanceToNow(new Date(lastMessage.createdAt), {
                              addSuffix: false,
                            })}
                          </span>
                        )}
                      </div>

                      {lastMessage ? (
                        <p
                          className={`truncate text-[13px] leading-5 ${
                            unreadCount > 0 ? "font-medium text-gray-800" : "text-gray-600"
                          }`}
                        >
                          {lastMessage.sender.id === user?.id ? (
                            <span className="text-gray-500">You: </span>
                          ) : null}
                          <span>{lastMessage.content || "Sent an attachment"}</span>
                        </p>
                      ) : (
                        <p className="text-sm italic text-gray-500">No messages yet</p>
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