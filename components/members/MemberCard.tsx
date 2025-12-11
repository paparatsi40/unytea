"use client";

import { useState } from "react";
import Link from "next/link";
import { MessageCircle, Video, MapPin, Clock, Sparkles } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type Member = {
  id: string;
  user: {
    id: string;
    name: string | null;
    image: string | null;
    bio: string | null;
    tagline: string | null;
    skills: string[];
    interests: string[];
    location: string | null;
    availabilityStatus: string | null;
    level: number;
    points: number;
    lastActiveAt: Date | null;
  };
};

const STATUS_CONFIG = {
  AVAILABLE: { emoji: "💚", label: "Available", color: "bg-green-50 text-green-700" },
  BUSY: { emoji: "💛", label: "Busy", color: "bg-yellow-50 text-yellow-700" },
  DO_NOT_DISTURB: { emoji: "❤️", label: "Do Not Disturb", color: "bg-red-50 text-red-700" },
  MENTORING: { emoji: "💜", label: "Mentoring", color: "bg-purple-50 text-purple-700" },
};

const getLevelBadge = (level: number) => {
  if (level >= 20) return { emoji: "💎", label: "Diamond", color: "text-cyan-600", bg: "bg-cyan-50" };
  if (level >= 10) return { emoji: "🥇", label: "Gold", color: "text-yellow-600", bg: "bg-yellow-50" };
  if (level >= 5) return { emoji: "🥈", label: "Silver", color: "text-gray-600", bg: "bg-gray-50" };
  return { emoji: "🥉", label: "Bronze", color: "text-orange-600", bg: "bg-orange-50" };
};

export function MemberCard({ member }: { member: Member }) {
  const [imageError, setImageError] = useState(false);
  const levelBadge = getLevelBadge(member.user.level);
  const status = STATUS_CONFIG[member.user.availabilityStatus as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.AVAILABLE;
  const isOnline = member.user.lastActiveAt 
    ? new Date().getTime() - new Date(member.user.lastActiveAt).getTime() < 5 * 60 * 1000 
    : false;

  return (
    <div className="group relative overflow-hidden rounded-xl border border-gray-100 bg-white p-6 shadow-sm transition-all hover:border-purple-200 hover:shadow-md">
      {/* Background Gradient */}
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-br from-purple-50 via-pink-50 to-purple-50 opacity-50" />

      {/* Content */}
      <div className="relative">
        {/* Avatar & Status */}
        <div className="mb-4 flex items-start justify-between">
          <div className="relative">
            <div className="relative h-16 w-16 overflow-hidden rounded-full border-2 border-white bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg">
              {member.user.image && !imageError ? (
                <img
                  src={member.user.image}
                  alt={member.user.name || "Member"}
                  className="h-full w-full object-cover"
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xl font-bold text-white">
                  {member.user.name?.charAt(0).toUpperCase() || "?"}
                </div>
              )}
              {/* Online Indicator */}
              {isOnline && (
                <div className="absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-white bg-green-500" />
              )}
            </div>
            {/* Level Badge */}
            <div className={`absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full ${levelBadge.bg} border-2 border-white text-xs`}>
              {levelBadge.emoji}
            </div>
          </div>

          {/* Status Badge */}
          <div className={`flex items-center space-x-1 rounded-full px-2 py-1 text-xs font-medium ${status.color}`}>
            <span>{status.emoji}</span>
            <span>{status.label}</span>
          </div>
        </div>

        {/* Name & Tagline */}
        <div className="mb-3">
          <h3 className="text-lg font-semibold text-gray-900">
            {member.user.name || "Anonymous"}
          </h3>
          {member.user.tagline && (
            <p className="text-sm text-gray-600">{member.user.tagline}</p>
          )}
          <div className="mt-1 flex items-center space-x-2">
            <span className={`rounded px-2 py-0.5 text-xs font-medium ${levelBadge.color} ${levelBadge.bg}`}>
              Lv{member.user.level}
            </span>
            <span className="text-xs text-gray-500">{member.user.points} pts</span>
          </div>
        </div>

        {/* Bio */}
        {member.user.bio && (
          <p className="mb-3 line-clamp-2 text-sm text-gray-600">
            {member.user.bio}
          </p>
        )}

        {/* Skills */}
        {member.user.skills && member.user.skills.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {member.user.skills.slice(0, 3).map((skill, i) => (
              <span
                key={i}
                className="rounded-full bg-purple-50 px-2 py-1 text-xs font-medium text-purple-700"
              >
                {skill}
              </span>
            ))}
            {member.user.skills.length > 3 && (
              <span className="rounded-full bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600">
                +{member.user.skills.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Location & Last Active */}
        <div className="mb-4 flex items-center space-x-3 text-xs text-gray-500">
          {member.user.location && (
            <div className="flex items-center space-x-1">
              <MapPin className="h-3 w-3" />
              <span>{member.user.location}</span>
            </div>
          )}
          {member.user.lastActiveAt && (
            <div className="flex items-center space-x-1">
              <Clock className="h-3 w-3" />
              <span>
                {isOnline ? "Online now" : `Active ${formatDistanceToNow(new Date(member.user.lastActiveAt), { addSuffix: true })}`}
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-2">
          <Link
            href={`/dashboard/messages?user=${member.user.id}`}
            className="flex flex-1 items-center justify-center space-x-1 rounded-lg bg-purple-50 px-3 py-2 text-sm font-medium text-purple-600 transition-colors hover:bg-purple-100"
          >
            <MessageCircle className="h-4 w-4" />
            <span>Message</span>
          </Link>
          <button
            disabled
            className="flex flex-1 items-center justify-center space-x-1 rounded-lg bg-gray-50 px-3 py-2 text-sm font-medium text-gray-400 transition-colors cursor-not-allowed opacity-50"
          >
            <Video className="h-4 w-4" />
            <span>Call</span>
          </button>
        </div>

        {/* View Profile Link */}
        <Link
          href={`/profile/${member.user.id}`}
          className="mt-3 flex items-center justify-center space-x-1 text-xs font-medium text-purple-600 transition-colors hover:text-purple-700"
        >
          <Sparkles className="h-3 w-3" />
          <span>View Full Profile</span>
        </Link>
      </div>
    </div>
  );
}
