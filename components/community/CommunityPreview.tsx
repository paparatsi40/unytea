"use client";

import { Users, BookOpen, MessageSquare, Crown, Lock } from "lucide-react";
import { JoinCommunityBanner } from "./JoinCommunityBanner";

type Community = {
  slug: string;
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  coverImageUrl: string | null;
  isPaid: boolean;
  membershipPrice: number | null;
  isPrivate: boolean;
  requireApproval: boolean;
  owner: {
    id: string;
    name: string | null;
    image: string | null;
  };
  _count: {
    members: number;
    posts: number;
    courses: number;
  };
};

interface CommunityPreviewProps {
  community: Community;
  locale: string;
}

export function CommunityPreview({ community, locale }: CommunityPreviewProps) {
  return (
    <div className="min-h-screen">
      {/* Hero Section with Cover */}
      <div className="relative h-80 overflow-hidden rounded-3xl border border-border/50 bg-gradient-to-br from-primary/20 via-purple-500/20 to-pink-500/20 mb-8">
        {community.coverImageUrl ? (
          <img
            src={community.coverImageUrl}
            alt={community.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary via-purple-500 to-pink-500" />
        )}
        
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        
        {/* Community Info Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-8">
          <div className="flex items-end gap-6">
            {/* Community Logo */}
            <div className="relative -mb-16 shrink-0">
              <div className="h-32 w-32 overflow-hidden rounded-2xl border-4 border-background bg-card shadow-2xl">
                {community.imageUrl ? (
                  <img
                    src={community.imageUrl}
                    alt={community.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary to-purple-600">
                    <Users className="h-16 w-16 text-white" />
                  </div>
                )}
              </div>
            </div>

            {/* Community Name */}
            <div className="flex-1 pb-2">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-4xl font-bold text-white">{community.name}</h1>
                {community.isPrivate && (
                  <div className="rounded-full bg-amber-500/90 px-3 py-1 text-sm font-semibold text-white backdrop-blur-xl flex items-center gap-1">
                    <Lock className="h-4 w-4" />
                    Private
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 text-white/90">
                <img
                  src={community.owner.image || "/default-avatar.png"}
                  alt={community.owner.name || "Owner"}
                  className="h-6 w-6 rounded-full border-2 border-white/20"
                />
                <span className="text-sm">
                  Created by <span className="font-semibold">{community.owner.name}</span>
                </span>
                <Crown className="h-4 w-4 text-amber-400" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Join Banner */}
      <JoinCommunityBanner
        communitySlug={community.slug}
        communityName={community.name}
        isPaid={community.isPaid}
        membershipPrice={community.membershipPrice}
        requireApproval={community.requireApproval || community.isPrivate}
        locale={locale}
      />

      {/* Private Community Notice */}
      {community.isPrivate && (
        <div className="rounded-2xl border-2 border-amber-500/20 bg-amber-500/10 p-6 backdrop-blur-xl">
          <div className="flex items-start gap-3">
            <Lock className="h-6 w-6 text-amber-500 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-lg font-bold text-foreground mb-2">Private Community</h3>
              <p className="text-muted-foreground">
                This is a private community. You need to request access and be approved by the owner to join.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid gap-6 sm:grid-cols-3 mb-8">
        <div className="rounded-2xl border border-border/50 bg-gradient-to-br from-card to-primary/5 p-6 shadow-lg backdrop-blur-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="rounded-xl bg-primary/10 p-3">
              <Users className="h-6 w-6 text-primary" />
            </div>
          </div>
          <p className="text-3xl font-bold text-foreground">{community._count.members}</p>
          <p className="text-sm text-muted-foreground">Members</p>
        </div>

        <div className="rounded-2xl border border-border/50 bg-gradient-to-br from-card to-purple-500/5 p-6 shadow-lg backdrop-blur-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="rounded-xl bg-purple-500/10 p-3">
              <MessageSquare className="h-6 w-6 text-purple-500" />
            </div>
          </div>
          <p className="text-3xl font-bold text-foreground">{community._count.posts}</p>
          <p className="text-sm text-muted-foreground">Posts</p>
        </div>

        <div className="rounded-2xl border border-border/50 bg-gradient-to-br from-card to-green-500/5 p-6 shadow-lg backdrop-blur-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="rounded-xl bg-green-500/10 p-3">
              <BookOpen className="h-6 w-6 text-green-500" />
            </div>
          </div>
          <p className="text-3xl font-bold text-foreground">{community._count.courses}</p>
          <p className="text-sm text-muted-foreground">Courses</p>
        </div>
      </div>

      {/* About Section */}
      <div className="rounded-2xl border border-border/50 bg-card p-8 shadow-lg backdrop-blur-xl">
        <h2 className="text-2xl font-bold text-foreground mb-4">About this Community</h2>
        {community.description ? (
          <p className="text-muted-foreground text-lg leading-relaxed">
            {community.description}
          </p>
        ) : (
          <p className="text-muted-foreground italic">
            No description provided yet.
          </p>
        )}
      </div>

      {/* What You'll Get Section */}
      <div className="mt-8 rounded-2xl border border-border/50 bg-gradient-to-br from-card to-primary/5 p-8 shadow-lg backdrop-blur-xl">
        <h2 className="text-2xl font-bold text-foreground mb-6">What you'll get as a member</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-primary/10 p-2 mt-1">
              <MessageSquare className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-1">Community Discussions</h3>
              <p className="text-sm text-muted-foreground">
                Participate in conversations and connect with {community._count.members} members
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-green-500/10 p-2 mt-1">
              <BookOpen className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-1">Exclusive Courses</h3>
              <p className="text-sm text-muted-foreground">
                Access {community._count.courses} course{community._count.courses !== 1 ? 's' : ''} created by the community
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-purple-500/10 p-2 mt-1">
              <Users className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-1">Networking</h3>
              <p className="text-sm text-muted-foreground">
                Connect with like-minded people and grow together
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-amber-500/10 p-2 mt-1">
              <Crown className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-1">Direct Access to Owner</h3>
              <p className="text-sm text-muted-foreground">
                Learn directly from {community.owner.name}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="mt-8">
        <JoinCommunityBanner
          communitySlug={community.slug}
          communityName={community.name}
          isPaid={community.isPaid}
          membershipPrice={community.membershipPrice}
          requireApproval={community.requireApproval || community.isPrivate}
          locale={locale}
        />
      </div>
    </div>
  );
}