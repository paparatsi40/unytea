"use client";

import { useState, useEffect } from "react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Users, Maximize2, Minimize2 } from "lucide-react";
import { getChannelOnlineMembers } from "@/app/actions/channels";
import { useSocket } from "@/hooks/use-socket";

type OnlineMember = {
  id: string;
  user: {
    id: string;
    name: string | null;
    image: string | null;
    level: number;
  };
  isTyping: boolean;
};

type Props = {
  channelId: string;
  communitySlug: string;
};

export function AuditoriumSpace({ channelId, communitySlug: _communitySlug }: Props) {
  const { user: currentUser } = useCurrentUser();
  const [members, setMembers] = useState<OnlineMember[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hoveredMember, setHoveredMember] = useState<string | null>(null);
  const { socket, isConnected } = useSocket();

  // Load initial members
  useEffect(() => {
    loadOnlineMembers();
  }, [channelId]);

  // WebSocket: Real-time presence updates
  useEffect(() => {
    if (!socket || !isConnected || !channelId) return;

    // Join channel for presence updates
    socket.emit("join:channel", channelId);

    // Listen for user coming online
    const handleUserOnline = () => {
      // Reload members to get the new user
      loadOnlineMembers();
    };

    // Listen for user going offline
    const handleUserOffline = ({ userId }: { userId: string }) => {
      setMembers((prev) => prev.filter((m) => m.user.id !== userId));
    };

    socket.on("user:online", handleUserOnline);
    socket.on("user:offline", handleUserOffline);

    return () => {
      socket.emit("leave:channel", channelId);
      socket.off("user:online", handleUserOnline);
      socket.off("user:offline", handleUserOffline);
    };
  }, [socket, isConnected, channelId]);

  const loadOnlineMembers = async () => {
    const result = await getChannelOnlineMembers(channelId);
    if (result.success) {
      setMembers(result.members as OnlineMember[]);
    }
  };

  // Dynamic sizing based on member count
  const getAvatarSize = (count: number) => {
    if (count <= 4) return { size: 'w-20 h-20 md:w-24 md:h-24', text: 'text-2xl md:text-3xl', gap: 'gap-8 md:gap-16', cols: 'grid-cols-2 md:grid-cols-4' };
    if (count <= 8) return { size: 'w-16 h-16 md:w-20 md:h-20', text: 'text-xl md:text-2xl', gap: 'gap-6 md:gap-12', cols: 'grid-cols-3 md:grid-cols-4' };
    if (count <= 16) return { size: 'w-14 h-14 md:w-16 md:h-16', text: 'text-lg md:text-xl', gap: 'gap-4 md:gap-8', cols: 'grid-cols-4 md:grid-cols-5' };
    if (count <= 24) return { size: 'w-12 h-12 md:w-14 md:h-14', text: 'text-base md:text-lg', gap: 'gap-3 md:gap-6', cols: 'grid-cols-4 md:grid-cols-6' };
    return { size: 'w-10 h-10 md:w-12 md:h-12', text: 'text-sm md:text-base', gap: 'gap-2 md:gap-4', cols: 'grid-cols-5 md:grid-cols-8' };
  };

  const avatarConfig = getAvatarSize(members.length);

  return (
    <div className={`relative overflow-hidden rounded-xl border border-gray-200 bg-gradient-to-b from-purple-50 via-white to-pink-50 ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 bg-white/80 backdrop-blur-sm p-4">
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500">
            <Users className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Auditorium View</h3>
            <p className="text-sm text-gray-600">
              {members.length} {members.length === 1 ? 'person' : 'people'} online
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsFullscreen(!isFullscreen)}
          className="rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-100"
        >
          {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
        </button>
      </div>

      {/* Stage */}
      <div className="relative bg-gradient-to-b from-purple-100 to-transparent p-8">
        <div className="mx-auto max-w-4xl">
          <div className="flex items-center justify-center space-x-2 rounded-xl border-2 border-purple-300 bg-gradient-to-r from-purple-500 to-pink-500 p-6 shadow-lg">
            <span className="text-2xl">🎤</span>
            <span className="text-lg font-bold text-white">Live Session</span>
          </div>
        </div>
      </div>

      {/* Auditorium Seating */}
      <div className="relative min-h-[500px] p-8">
        {members.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center">
            <Users className="h-16 w-16 text-gray-300" />
            <p className="mt-4 text-lg font-medium text-gray-600">No one here yet</p>
            <p className="text-sm text-gray-500">Be the first to join!</p>
          </div>
        ) : (
          <div className={`mx-auto grid ${avatarConfig.cols} ${avatarConfig.gap} max-w-4xl`}>
            {members.map((member, index) => {
              const isCurrentUser = member.user.id === currentUser?.id;
              const isHovered = hoveredMember === member.id;
              const initial = member.user.name?.charAt(0).toUpperCase() || "?";
              
              // Generate unique gradient colors
              let hash = 0;
              for (let i = 0; i < member.user.id.length; i++) {
                hash = member.user.id.charCodeAt(i) + ((hash << 5) - hash);
              }
              const hue = Math.abs(hash % 360);

              return (
                <div
                  key={member.id}
                  className="flex flex-col items-center transition-transform hover:scale-110 cursor-pointer"
                  onMouseEnter={() => setHoveredMember(member.id)}
                  onMouseLeave={() => setHoveredMember(null)}
                  style={{
                    animation: `fadeIn 0.5s ease-out ${index * 0.1}s both`,
                  }}
                >
                  {/* Avatar */}
                  <div className="relative">
                    {/* Outer glow for current user */}
                    {isCurrentUser && (
                      <div className="absolute inset-0 rounded-full bg-purple-500 opacity-20 animate-pulse scale-125" />
                    )}
                    
                    {/* Main avatar circle */}
                    <div
                      className={`relative ${avatarConfig.size} rounded-full flex items-center justify-center text-white ${avatarConfig.text} font-bold ${
                        isCurrentUser ? 'ring-4 ring-purple-500' : isHovered ? 'ring-3 ring-pink-500' : 'ring-2 ring-gray-200'
                      }`}
                      style={{
                        background: `linear-gradient(135deg, hsl(${hue}, 70%, 60%), hsl(${(hue + 60) % 360}, 70%, 60%))`,
                      }}
                    >
                      {initial}
                      
                      {/* Online indicator */}
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white" />
                      
                      {/* Level badge */}
                      <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-indigo-500 rounded-full border-2 border-white flex items-center justify-center">
                        <span className="text-xs font-bold">{member.user.level}</span>
                      </div>
                    </div>
                  </div>

                  {/* Name */}
                  <p className={`mt-3 text-sm font-medium ${isCurrentUser ? 'text-purple-600 font-bold' : 'text-gray-700'}`}>
                    {member.user.name || 'Anonymous'}
                  </p>

                  {/* Hover tooltip */}
                  {isHovered && (
                    <div className="absolute -top-16 bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg z-10">
                      <p className="text-sm font-semibold">{member.user.name}</p>
                      <p className="text-xs text-purple-300">Level {member.user.level}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="border-t border-gray-200 bg-white/80 backdrop-blur-sm p-4">
        <div className="mx-auto flex max-w-4xl items-center justify-center space-x-6 text-sm">
          <div className="flex items-center space-x-2">
            <div className="h-3 w-3 rounded-full bg-green-500" />
            <span className="text-gray-600">Online</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="h-3 w-3 animate-pulse rounded-full bg-blue-500" />
            <span className="text-gray-600">Typing</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="h-3 w-3 rounded-full bg-purple-500 ring-2 ring-purple-200" />
            <span className="text-gray-600">You</span>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
