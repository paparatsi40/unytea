"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { ChatContainer } from "@/components/chat/ChatContainer";
import { AuditoriumSpace } from "@/components/auditorium/AuditoriumSpace";
import { getOrCreateDefaultChannels, updateChannelPresence } from "@/app/actions/channels";
import { Loader2, LayoutList, Users } from "lucide-react";

type Channel = {
  id: string;
  name: string;
  slug: string;
  emoji: string | null;
  description: string | null;
};

export default function CommunityChat() {
  const params = useParams();
  const slug = (params?.slug as string) || "";
  
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"chat" | "auditorium">("chat");

  useEffect(() => {
    loadChannels();
  }, [slug]);

  // Update presence with heartbeat
  useEffect(() => {
    if (activeChannelId) {
      updateChannelPresence(activeChannelId, true);

      // Heartbeat every 5 seconds
      const heartbeat = setInterval(() => {
        updateChannelPresence(activeChannelId, true);
      }, 5000);

      return () => {
        clearInterval(heartbeat);
        // Server determines offline based on lastSeenAt
      };
    }
    return undefined;
  }, [activeChannelId]);

  const loadChannels = async () => {
    setIsLoading(true);
    
    // First get community ID from slug
    const response = await fetch(`/api/communities/${slug}`);
    const data = await response.json();
    
    if (!data || !data.id) {
      setIsLoading(false);
      return;
    }

    // Get or create channels
    const result = await getOrCreateDefaultChannels(data.id);
    
    if (result.success && result.channels.length > 0) {
      setChannels(result.channels as Channel[]);
      setActiveChannelId(result.channels[0].id);
    }
    
    setIsLoading(false);
  };

  const handleChannelChange = (channelId: string) => {
    setActiveChannelId(channelId);
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-purple-600" />
          <p className="mt-2 text-sm text-gray-500">Loading chat...</p>
        </div>
      </div>
    );
  }

  if (!channels.length) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-medium text-gray-900">No channels found</p>
          <p className="text-sm text-gray-500">Failed to create default channels</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* View Toggle Button */}
      <div className="absolute right-4 top-4 z-10 flex items-center space-x-2 rounded-lg border border-gray-200 bg-white p-1 shadow-sm">
        <button
          onClick={() => setViewMode("chat")}
          className={`flex items-center space-x-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            viewMode === "chat"
              ? "bg-purple-600 text-white"
              : "text-gray-600 hover:bg-gray-50"
          }`}
        >
          <LayoutList className="h-4 w-4" />
          <span>Chat</span>
        </button>
        <button
          onClick={() => setViewMode("auditorium")}
          className={`flex items-center space-x-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            viewMode === "auditorium"
              ? "bg-purple-600 text-white"
              : "text-gray-600 hover:bg-gray-50"
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Auditorium</span>
        </button>
      </div>

      {/* Content */}
      {viewMode === "chat" ? (
        <ChatContainer
          channels={channels}
          activeChannelId={activeChannelId}
          communitySlug={slug}
          onChannelChange={handleChannelChange}
        />
      ) : (
        <div className="min-h-screen bg-gray-50 p-8">
          <AuditoriumSpace channelId={activeChannelId} communitySlug={slug} />
        </div>
      )}
    </div>
  );
}
