"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { subDays, addDays } from "date-fns";

export interface TodayCommunity {
  id: string;
  slug: string;
  name: string;
  imageUrl: string | null;
  memberCount: number;
  role: "owner" | "member";
}

export interface TodayActivity {
  type: "new_member" | "new_post";
  at: Date;
  actorName: string;
  communityName: string;
  href: string;
}

export interface TodayDashboardData {
  user: { name: string };
  nextLiveSession: {
    id: string;
    slug: string | null;
    title: string;
    scheduledAt: Date;
    duration: number;
    communitySlug: string;
    communityName: string;
  } | null;
  communities: TodayCommunity[];
  weeklyStats: {
    sessionsThisWeek: number;
    newMembersThisWeek: number;
    postsThisWeek: number;
  };
  recentActivity: TodayActivity[];
}

/**
 * Slim data source for the Today-focused dashboard home (Sub-Phase E Commit 4).
 * Fetches only what the new home view needs via parallel queries. Activity
 * labels are returned as structured fields (actor/community) so the client
 * view can localize them — onboarding is loaded separately via
 * getOnboardingProgress (see dashboard/page.tsx).
 */
export async function getTodayDashboard(): Promise<TodayDashboardData | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const userId = session.user.id;
  const now = new Date();
  const weekAgo = subDays(now, 7);
  const sevenDaysFromNow = addDays(now, 7);

  const [
    user,
    ownedCommunities,
    memberCommunities,
    nextSession,
    sessionsThisWeek,
    newMembersThisWeek,
    postsThisWeek,
    recentMembers,
    recentPosts,
  ] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    }),

    prisma.community.findMany({
      where: { ownerId: userId, deletedAt: null },
      select: { id: true, slug: true, name: true, imageUrl: true, memberCount: true },
      take: 6,
      orderBy: { updatedAt: "desc" },
    }),

    prisma.member.findMany({
      where: { userId, status: "ACTIVE" },
      include: {
        community: {
          select: { id: true, slug: true, name: true, imageUrl: true, memberCount: true },
        },
      },
      take: 6,
      orderBy: { joinedAt: "desc" },
    }),

    prisma.mentorSession.findFirst({
      where: {
        OR: [
          { community: { ownerId: userId } },
          { community: { members: { some: { userId, status: "ACTIVE" } } } },
        ],
        scheduledAt: { gte: now, lt: sevenDaysFromNow },
        status: { notIn: ["CANCELLED", "COMPLETED"] },
      },
      select: {
        id: true,
        slug: true,
        title: true,
        scheduledAt: true,
        duration: true,
        community: { select: { slug: true, name: true } },
      },
      orderBy: { scheduledAt: "asc" },
    }),

    prisma.mentorSession.count({
      where: { community: { ownerId: userId }, scheduledAt: { gte: weekAgo } },
    }),

    prisma.member.count({
      where: { community: { ownerId: userId }, joinedAt: { gte: weekAgo } },
    }),

    prisma.post.count({
      where: { community: { ownerId: userId }, createdAt: { gte: weekAgo }, deletedAt: null },
    }),

    prisma.member.findMany({
      where: { community: { ownerId: userId }, joinedAt: { gte: weekAgo } },
      include: {
        user: { select: { name: true } },
        community: { select: { slug: true, name: true } },
      },
      orderBy: { joinedAt: "desc" },
      take: 5,
    }),

    prisma.post.findMany({
      where: { community: { ownerId: userId }, createdAt: { gte: weekAgo }, deletedAt: null },
      include: {
        author: { select: { name: true } },
        community: { select: { slug: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  // Owned communities first, then memberships not already owned, capped at 6.
  const communities: TodayCommunity[] = [
    ...ownedCommunities.map((c) => ({ ...c, role: "owner" as const })),
    ...memberCommunities
      .filter((m) => !ownedCommunities.some((c) => c.id === m.community.id))
      .map((m) => ({ ...m.community, role: "member" as const })),
  ].slice(0, 6);

  const recentActivity: TodayActivity[] = [
    ...recentMembers.map((m) => ({
      type: "new_member" as const,
      at: m.joinedAt,
      actorName: m.user?.name ?? "Someone",
      communityName: m.community.name,
      href: `/dashboard/c/${m.community.slug}/members`,
    })),
    ...recentPosts.map((p) => ({
      type: "new_post" as const,
      at: p.createdAt,
      actorName: p.author?.name ?? "Someone",
      communityName: p.community.name,
      href: `/dashboard/c/${p.community.slug}/feed`,
    })),
  ]
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, 10);

  return {
    user: { name: user?.name ?? "there" },
    nextLiveSession:
      nextSession && nextSession.community
        ? {
            id: nextSession.id,
            slug: nextSession.slug,
            title: nextSession.title,
            scheduledAt: nextSession.scheduledAt,
            duration: nextSession.duration,
            communitySlug: nextSession.community.slug,
            communityName: nextSession.community.name,
          }
        : null,
    communities,
    weeklyStats: { sessionsThisWeek, newMembersThisWeek, postsThisWeek },
    recentActivity,
  };
}
