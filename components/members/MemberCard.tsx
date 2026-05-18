"use client";

import { useState } from "react";
import Link from "next/link";
import { MessageCircle, Video, MapPin, Sparkles } from "lucide-react";

type Member = {
  id: string;
  communityId?: string;
  user: {
    id: string;
    name: string | null;
    image: string | null;
    bio: string | null;
    tagline: string | null;
    skills: string[];
    interests: string[];
    location: string | null;
  };
};

export function MemberCard({ member }: { member: Member }) {
  const [imageError, setImageError] = useState(false);

  return (
    <div className="group relative overflow-hidden rounded-xl border border-gray-100 bg-white p-6 shadow-sm transition-all hover:border-purple-200 hover:shadow-md">
      {/* Background Gradient */}
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-br from-purple-50 via-pink-50 to-purple-50 opacity-50" />

      {/* Content */}
      <div className="relative">
        {/* Avatar */}
        <div className="mb-4">
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

        {/* Location */}
        {member.user.location && (
          <div className="mb-4 flex items-center space-x-1 text-xs text-gray-500">
            <MapPin className="h-3 w-3" />
            <span>{member.user.location}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center space-x-2">
          <Link
            href={`/dashboard/messages?user=${member.user.id}${member.communityId ? `&community=${member.communityId}` : ""}`}
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

        {/* TODO Sprint 4: profile page at /profile/[userId] */}
        {/* Investigation 2026-05-16 confirmed route missing. */}
        {/* Disabled until Phase 3.4 schema migration completes */}
        {/* (gamification columns get dropped, profile page built on clean schema). */}
        <button
          disabled
          type="button"
          className="mt-3 flex items-center justify-center space-x-1 text-xs font-medium text-purple-600 opacity-50 cursor-not-allowed"
          aria-label="Profile page coming soon"
          title="Profile page coming in Sprint 4"
        >
          <Sparkles className="h-3 w-3" />
          <span>View Full Profile</span>
        </button>
      </div>
    </div>
  );
}
