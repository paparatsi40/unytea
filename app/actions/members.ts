"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import type { MemberStatus, Prisma } from "@prisma/client";
import { defineAction } from "@/lib/actions/define-action";
import { communityById } from "@/lib/actions/resolvers";

/**
 * Member directory.
 *
 * SEC-02a: `getCommunityMembers` and `getMemberProfile` had no authentication at
 * all, and the projection below includes `email`. Since Next.js exposes every
 * "use server" export as a public POST endpoint, an unauthenticated caller who
 * knew a communityId — they are returned by the public /explore listing — could
 * pull the full roster of any private, paid community: every member's address,
 * real name, location, bio and last-active time, unpaginated. Both now require
 * ACTIVE membership of the community being read.
 */

const communityIdSchema = z.string().min(1).max(64);
const userIdSchema = z.string().min(1).max(64);

/**
 * `email` is deliberately absent. A member directory needs a display identity,
 * not a contact address; exposing it turned any membership into a mailing list.
 * Direct messaging goes through app/actions/messages.ts, which never needs the
 * address either.
 */
const memberSelect = {
  id: true,
  role: true,
  status: true,
  joinedAt: true,
  user: {
    select: {
      id: true,
      name: true,
      image: true,
      username: true,
      bio: true,
      tagline: true,
      skills: true,
      interests: true,
      availabilityStatus: true,
      location: true,
      lastActiveAt: true,
    },
  },
} satisfies Prisma.MemberSelect;

export const getCommunityMembers = defineAction(
  {
    name: "getCommunityMembers",
    auth: "member",
    args: [
      communityIdSchema,
      z
        .object({
          search: z.string().max(200).optional(),
          status: z.string().max(50).optional(),
          sortBy: z.enum(["recent", "name"]).optional(),
        })
        .optional(),
    ],
    community: ([communityId]) => communityById(communityId),
  },
  async (_ctx, communityId, filters) => {
    // Search runs in SQL rather than over a full unbounded fetch filtered in JS,
    // which previously transferred every member row on each keystroke (PERF-01).
    const where: Prisma.MemberWhereInput = {
      communityId,
      status: "ACTIVE" as MemberStatus,
      ...(filters?.search
        ? {
            user: {
              OR: [
                { name: { contains: filters.search, mode: "insensitive" } },
                { bio: { contains: filters.search, mode: "insensitive" } },
                { tagline: { contains: filters.search, mode: "insensitive" } },
                { skills: { has: filters.search } },
                { interests: { has: filters.search } },
              ],
            },
          }
        : {}),
      ...(filters?.status ? { user: { availabilityStatus: filters.status } } : {}),
    };

    const members = await prisma.member.findMany({
      where,
      select: memberSelect,
      orderBy: filters?.sortBy === "recent" ? { joinedAt: "desc" } : { user: { name: "asc" } },
      take: 200,
    });

    return { success: true as const, members };
  }
);

export const getMemberProfile = defineAction(
  {
    name: "getMemberProfile",
    auth: "member",
    args: [userIdSchema, communityIdSchema],
    // Scoped to the community the profile is being viewed within, so a caller
    // can only read profiles of people in a community they belong to.
    community: ([, communityId]) => communityById(communityId),
  },
  async (_ctx, userId, communityId) => {
    // Only surface a profile if the subject actually belongs to this community —
    // otherwise the action becomes a lookup of any user by id.
    const membership = await prisma.member.findUnique({
      where: { userId_communityId: { userId, communityId } },
      select: { role: true, joinedAt: true, status: true },
    });

    if (!membership || membership.status !== "ACTIVE") {
      return { success: false as const, error: "Member not found" };
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        image: true,
        username: true,
        bio: true,
        tagline: true,
        skills: true,
        interests: true,
        website: true,
        location: true,
        timezone: true,
        availabilityStatus: true,
        createdAt: true,
        lastActiveAt: true,
        _count: { select: { posts: true, comments: true, channelMessages: true } },
      },
    });

    if (!user) {
      return { success: false as const, error: "Member not found" };
    }

    const { _count, ...profile } = user;
    return {
      success: true as const,
      user: profile,
      membership: { role: membership.role, joinedAt: membership.joinedAt },
      stats: _count,
    };
  }
);

export const updateUserProfile = defineAction(
  {
    name: "updateUserProfile",
    auth: "user",
    args: [
      z.object({
        name: z.string().min(1).max(100).optional(),
        bio: z.string().max(2000).optional(),
        tagline: z.string().max(200).optional(),
        skills: z.array(z.string().max(50)).max(30).optional(),
        interests: z.array(z.string().max(50)).max(30).optional(),
        website: z.string().url().max(500).optional().or(z.literal("")),
        location: z.string().max(120).optional(),
        availabilityStatus: z.enum(["AVAILABLE", "BUSY", "DO_NOT_DISTURB", "MENTORING"]).optional(),
      }),
    ],
  },
  async (ctx, data) => {
    const user = await prisma.user.update({
      where: { id: ctx.userId },
      data: { ...data, updatedAt: new Date() },
    });

    revalidatePath("/dashboard/settings/profile");
    revalidatePath("/dashboard/c/[slug]/members", "page");

    return { success: true as const, user };
  }
);

export const getOnlineMembersCount = defineAction(
  {
    name: "getOnlineMembersCount",
    auth: "member",
    args: [communityIdSchema],
    community: ([communityId]) => communityById(communityId),
  },
  async (_ctx, communityId) => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const count = await prisma.member.count({
      where: {
        communityId,
        status: "ACTIVE",
        user: { lastActiveAt: { gte: fiveMinutesAgo } },
      },
    });
    return { success: true as const, count };
  }
);

export const updateLastActive = defineAction(
  { name: "updateLastActive", auth: "user", args: [], rateLimit: "general" },
  async (ctx) => {
    await prisma.user.update({
      where: { id: ctx.userId },
      data: { lastActiveAt: new Date() },
    });
    return { success: true as const };
  }
);
