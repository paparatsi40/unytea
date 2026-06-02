"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Users, Maximize2, Minimize2 } from "lucide-react";
import { getChannelOnlineMembers } from "@/app/actions/channels";

type OnlineMember = {
  id: string;
  user: {
    id: string;
    name: string | null;
    image: string | null;
  };
  isTyping: boolean;
};

type Props = {
  channelId: string;
  communitySlug: string;
};

export function AuditoriumSpace({ channelId, communitySlug: _communitySlug }: Props) {
  const t = useTranslations("liveSession.auditorium");
  const { user: currentUser } = useCurrentUser();
  const [members, setMembers] = useState<OnlineMember[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hoveredMember, setHoveredMember] = useState<string | null>(null);

  // Load members with polling
  useEffect(() => {
    loadOnlineMembers();

    // Poll every 10 seconds for updates
    const interval = setInterval(loadOnlineMembers, 10000);

    return () => clearInterval(interval);
  }, [channelId]);

  const loadOnlineMembers = async () => {
    const result = await getChannelOnlineMembers(channelId);
    if (result.success) {
      setMembers(result.members as OnlineMember[]);
    }
  };

  // Dynamic sizing based on member count
  const getAvatarSize = (count: number) => {
    if (count <= 4)
      return {
        size: "w-20 h-20 md:w-24 md:h-24",
        text: "text-2xl md:text-3xl",
        gap: "gap-8 md:gap-16",
        cols: "grid-cols-2 md:grid-cols-4",
      };
    if (count <= 8)
      return {
        size: "w-16 h-16 md:w-20 md:h-20",
        text: "text-xl md:text-2xl",
        gap: "gap-6 md:gap-12",
        cols: "grid-cols-3 md:grid-cols-4",
      };
    if (count <= 16)
      return {
        size: "w-14 h-14 md:w-16 md:h-16",
        text: "text-lg md:text-xl",
        gap: "gap-4 md:gap-8",
        cols: "grid-cols-4 md:grid-cols-5",
      };
    if (count <= 24)
      return {
        size: "w-12 h-12 md:w-14 md:h-14",
        text: "text-base md:text-lg",
        gap: "gap-3 md:gap-6",
        cols: "grid-cols-4 md:grid-cols-6",
      };
    return {
      size: "w-10 h-10 md:w-12 md:h-12",
      text: "text-sm md:text-base",
      gap: "gap-2 md:gap-4",
      cols: "grid-cols-5 md:grid-cols-8",
    };
  };

  const avatarConfig = getAvatarSize(members.length);

  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-gray-200 bg-gradient-to-b from-purple-50 via-white to-pink-50 ${isFullscreen ? "fixed inset-0 z-50" : ""}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 bg-white/80 p-4 backdrop-blur-sm">
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500">
            <Users className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">{t("title")}</h3>
            <p className="text-sm text-gray-600">{t("online", { count: members.length })}</p>
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
            <span className="text-lg font-bold text-white">{t("liveSession")}</span>
          </div>
        </div>
      </div>

      {/* Auditorium Seating */}
      <div className="relative min-h-[500px] p-8">
        {members.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center">
            <Users className="h-16 w-16 text-gray-300" />
            <p className="mt-4 text-lg font-medium text-gray-600">{t("emptyTitle")}</p>
            <p className="text-sm text-gray-500">{t("emptySubtitle")}</p>
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
                  className="flex cursor-pointer flex-col items-center transition-transform hover:scale-110"
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
                      <div className="absolute inset-0 scale-125 animate-pulse rounded-full bg-purple-500 opacity-20" />
                    )}

                    {/* Main avatar circle */}
                    <div
                      className={`relative ${avatarConfig.size} flex items-center justify-center rounded-full text-white ${avatarConfig.text} font-bold ${
                        isCurrentUser
                          ? "ring-4 ring-purple-500"
                          : isHovered
                            ? "ring-3 ring-pink-500"
                            : "ring-2 ring-gray-200"
                      }`}
                      style={{
                        background: `linear-gradient(135deg, hsl(${hue}, 70%, 60%), hsl(${(hue + 60) % 360}, 70%, 60%))`,
                      }}
                    >
                      {initial}

                      {/* Online indicator */}
                      <div className="absolute -right-1 -top-1 h-4 w-4 rounded-full border-2 border-white bg-green-500" />
                    </div>
                  </div>

                  {/* Name */}
                  <p
                    className={`mt-3 text-sm font-medium ${isCurrentUser ? "font-bold text-purple-600" : "text-gray-700"}`}
                  >
                    {member.user.name || t("anonymous")}
                  </p>

                  {/* Hover tooltip */}
                  {isHovered && (
                    <div className="absolute -top-16 z-10 rounded-lg bg-gray-900 px-4 py-2 text-white shadow-lg">
                      <p className="text-sm font-semibold">{member.user.name}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="border-t border-gray-200 bg-white/80 p-4 backdrop-blur-sm">
        <div className="mx-auto flex max-w-4xl items-center justify-center space-x-6 text-sm">
          <div className="flex items-center space-x-2">
            <div className="h-3 w-3 rounded-full bg-green-500" />
            <span className="text-gray-600">{t("legendOnline")}</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="h-3 w-3 animate-pulse rounded-full bg-blue-500" />
            <span className="text-gray-600">{t("legendTyping")}</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="h-3 w-3 rounded-full bg-purple-500 ring-2 ring-purple-200" />
            <span className="text-gray-600">{t("legendYou")}</span>
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
