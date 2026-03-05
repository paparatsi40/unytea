"use client";

import { useState, useEffect } from "react";
import { Hash, Menu, X } from "lucide-react";
import { ChatMessages } from "./ChatMessages";
import { ChatInput } from "./ChatInput";
import { updateChannelPresence } from "@/app/actions/channels";
import { useSocket } from "@/hooks/use-socket";

type Channel = {
  id: string;
  name: string;
  slug: string;
  emoji: string | null;
  description: string | null;
};

type Props = {
  channels: Channel[];
  activeChannelId: string;
  communitySlug: string;
  onChannelChange: (channelId: string) => void;
};

export function ChatContainer({ channels, activeChannelId, communitySlug: _communitySlug, onChannelChange }: Props) {
  const [onlineCount, setOnlineCount] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { socket, isConnected } = useSocket();

  // WebSocket: Join/leave channel rooms
  useEffect(() => {
    if (!socket || !isConnected || !activeChannelId) return;

    // Join the channel room
    socket.emit("join:channel", activeChannelId);

    // Listen for online count updates (you can add this event to server)
    const handleOnlineUpdate = ({ count }: { count: number }) => {
      setOnlineCount(count);
    };

    socket.on("channel:online-count", handleOnlineUpdate);

    return () => {
      socket.emit("leave:channel", activeChannelId);
      socket.off("channel:online-count", handleOnlineUpdate);
    };
  }, [socket, isConnected, activeChannelId]);

  // Fallback: Still update presence in database for persistence
  useEffect(() => {
    if (activeChannelId) {
      updateChannelPresence(activeChannelId, true);

      const heartbeat = setInterval(() => {
        updateChannelPresence(activeChannelId, true);
      }, 30000); // Every 30s (less frequent since we have WebSockets)

      return () => clearInterval(heartbeat);
    }
    return undefined;
  }, [activeChannelId]);

  const activeChannel = channels.find(c => c.id === activeChannelId);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Channels List */}
      <div className={`${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } fixed inset-y-0 left-0 z-50 w-64 transform bg-gray-900 transition-transform duration-300 lg:relative lg:translate-x-0`}>
        {/* Sidebar Header */}
        <div className="flex h-14 items-center justify-between border-b border-gray-800 px-4">
          <h2 className="font-semibold text-white">Channels</h2>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-gray-400 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Channel List */}
        <div className="space-y-0.5 p-2">
          {channels.map((channel) => (
            <button
              key={channel.id}
              onClick={() => {
                onChannelChange(channel.id);
                setSidebarOpen(false); // Close sidebar on mobile after selection
              }}
              className={`flex w-full items-center space-x-2 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                channel.id === activeChannelId
                  ? "bg-purple-600 text-white"
                  : "text-gray-300 hover:bg-gray-800"
              }`}
            >
              <span className="text-lg">{channel.emoji || "#"}</span>
              <span className="font-medium">{channel.name}</span>
            </button>
          ))}
        </div>

        {/* Online Count */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-gray-800 bg-gray-900 p-4">
          <div className="flex items-center space-x-2 text-sm text-gray-400">
            <div className="h-2 w-2 rounded-full bg-green-500" />
            <span>{onlineCount} online</span>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex flex-1 flex-col">
        {/* Mobile Header with Menu Button */}
        <div className="flex h-14 items-center border-b border-gray-200 bg-white px-4 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="mr-3 text-gray-600 hover:text-gray-900"
          >
            <Menu className="h-6 w-6" />
          </button>
          <Hash className="h-5 w-5 text-gray-400" />
          <h2 className="ml-2 font-semibold text-gray-900">{activeChannel?.name || "Chat"}</h2>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-hidden">
          <ChatMessages channelId={activeChannelId} />
        </div>

        {/* Input */}
        <div className="border-t border-gray-200 bg-white p-4">
          <ChatInput channelId={activeChannelId} channelName={activeChannel?.name || ''} />
        </div>
      </div>
    </div>
  );
}
