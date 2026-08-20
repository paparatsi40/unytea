"use server";

import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { defineAction } from "@/lib/actions/define-action";
import { communityBySlug } from "@/lib/actions/resolvers";
import { readCommunityVideoUsage } from "@/lib/usage/video-usage";

/**
 * The browser-callable slice of the video usage counter.
 *
 * Read-only, both of them. Nothing here creates a `community_video_usage` row,
 * refuses anyone, or touches the accrual — a dashboard visit must not open a
 * billing period, and B1 has no gate at all.
 *
 * The counter is per community, and a Pro owner may run three, so both actions
 * are scoped to a community rather than to the caller: there is no single
 * "your usage" number to return.
 */

// Slug, not id: every dashboard page under `c/[slug]` has the slug in its
// route params and none of them has the id. Asking for the id would mean a
// lookup at every call site to hand back what the resolver looks up anyway.
const communitySlugSchema = z.string().min(1).max(120);

/**
 * What this DTO is for: the read function returns `Date` objects and a plan
 * enum, and this crosses the server/client boundary. ISO strings survive that;
 * a `Date` arrives as one anyway and then lies about its type.
 */
export interface VideoUsageView {
  communityId: string;
  communityName: string;
  communitySlug: string;
  plan: string;
  usedHours: number;
  capHours: number;
  percent: number;
  /** ISO — the client formats it in the reader's locale. */
  resetsAt: string;
  state: "normal" | "warn" | "over";
}

/**
 * One community's usage. Admin-gated: this is the owner's allowance, not a
 * member's business.
 */
export const getCommunityVideoUsage = defineAction(
  {
    name: "getCommunityVideoUsage",
    auth: "admin",
    roles: ["OWNER", "ADMIN"],
    args: [communitySlugSchema],
    community: ([slug]) => communityBySlug(slug),
    rateLimit: "general",
  },
  async (ctx, _slug) => {
    // Non-null by the time the handler runs: `community` resolved it and
    // `defineAction` refused the call otherwise. Narrowed rather than cast.
    if (!ctx.communityId) {
      return { success: false as const, error: "Community not found." };
    }

    const community = await prisma.community.findUnique({
      where: { id: ctx.communityId },
      select: { id: true, name: true, slug: true },
    });
    if (!community) {
      return { success: false as const, error: "Community not found." };
    }

    const usage = await readCommunityVideoUsage(community.id);

    return {
      success: true as const,
      usage: {
        communityId: community.id,
        communityName: community.name,
        communitySlug: community.slug,
        plan: usage.plan,
        usedHours: usage.usedHours,
        capHours: usage.capHours,
        percent: usage.percent,
        resetsAt: usage.resetsAt.toISOString(),
        state: usage.state,
      } satisfies VideoUsageView,
    };
  }
);

/**
 * Every community the caller owns, with its usage.
 *
 * For the billing screen, which is user-scoped while the counter is not. A
 * single number there would have to pick one of a Pro owner's communities and
 * call it "your usage", which is the same category error that keeps this out of
 * `/api/user/subscription-state`.
 */
export const getMyVideoUsage = defineAction(
  { name: "getMyVideoUsage", auth: "user", args: [], rateLimit: "general" },
  async (ctx) => {
    const owned = await prisma.community.findMany({
      where: { ownerId: ctx.userId, deletedAt: null },
      select: { id: true, name: true, slug: true },
      orderBy: { createdAt: "asc" },
      take: 20,
    });

    const usages: VideoUsageView[] = [];
    for (const community of owned) {
      const usage = await readCommunityVideoUsage(community.id);
      usages.push({
        communityId: community.id,
        communityName: community.name,
        communitySlug: community.slug,
        plan: usage.plan,
        usedHours: usage.usedHours,
        capHours: usage.capHours,
        percent: usage.percent,
        resetsAt: usage.resetsAt.toISOString(),
        state: usage.state,
      });
    }

    return { success: true as const, usages };
  }
);
