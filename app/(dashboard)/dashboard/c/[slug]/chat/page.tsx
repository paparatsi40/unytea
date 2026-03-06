"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { PusherChat } from "@/components/chat/PusherChat";
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
  const [activeChannelName, setActiveChannelName] = useState<string>("");
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
      const loadedChannels = result.channels as Channel[];
      setChannels(loadedChannels);
      setActiveChannelId(loadedChannels[0].id);
      setActiveChannelName(loadedChannels[0].name);
    }
    
    setIsLoading(false);
  };

  const handleChannelChange = (channelId: string) => {
    const channel = channels.find((c) => c.id === channelId);
    if (channel) {
      setActiveChannelId(channel.id);
      setActiveChannelName(channel.name);
    }
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

  // Get active channel name
  const activeChannel = channels.find((c) => c.id === activeChannelId);
  const currentChannelName = activeChannel?.name || activeChannelName || "General";

  return (
    <div className="relative h-full">
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

      {/* Channel Selector */}
      {viewMode === "chat" && channels.length > 1 && (
        <div className="absolute left-4 top-4 z-10">
          <select
            value={activeChannelId}
            onChange={(e) => handleChannelChange(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium shadow-sm"
          >
            {channels.map((channel) => (
              <option key={channel.id} value={channel.id}>
                {channel.emoji} {channel.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Content */}
      {viewMode === "chat" ? (
        <div className="h-full pt-16">
          <PusherChat
            channelId={activeChannelId}
            channelName={currentChannelName}
          />
        </div>
      ) : (
        <div className="min-h-screen bg-gray-50 p-8">
          <AuditoriumSpace channelId={activeChannelId} communitySlug={slug} />
        </div>
      )}
    </div>
  );
}
