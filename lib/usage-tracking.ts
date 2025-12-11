/**
 * Usage Tracking System
 * 
 * Tracks video hours, members, and storage for billing purposes
 */

import { prisma } from "@/lib/prisma";
import { SubscriptionPlan, getPlanLimits, calculateMonthlyCost } from "@/lib/subscription-limits";

/**
 * Initialize billing cycle for a user
 */
export async function initializeBillingCycle(userId: string) {
  const now = new Date();
  const cycleEnd = new Date(now);
  cycleEnd.setMonth(cycleEnd.getMonth() + 1);

  await prisma.user.update({
    where: { id: userId },
    data: {
      billingCycleStart: now,
      billingCycleEnd: cycleEnd,
      currentVideoMinutes: 0,
      currentMemberCount: 0,
      usageAlertSent: false,
    },
  });
}

/**
 * Track video session usage
 */
export async function trackVideoUsage(
  userId: string,
  durationMinutes: number
): Promise<{
  success: boolean;
  currentUsage: number;
  limit: number;
  overageMinutes: number;
  overageCost: number;
  shouldAlert: boolean;
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      subscriptionPlan: true,
      currentVideoMinutes: true,
      billingCycleStart: true,
      billingCycleEnd: true,
      usageAlertSent: true,
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  // Check if billing cycle needs reset
  const now = new Date();
  if (!user.billingCycleEnd || now > user.billingCycleEnd) {
    await initializeBillingCycle(userId);
    user.currentVideoMinutes = 0;
    user.usageAlertSent = false;
  }

  const plan = (user.subscriptionPlan as SubscriptionPlan) || "FREE";
  const limits = getPlanLimits(plan);
  const newUsage = (user.currentVideoMinutes || 0) + durationMinutes;

  // Update usage
  await prisma.user.update({
    where: { id: userId },
    data: {
      currentVideoMinutes: newUsage,
    },
  });

  const videoHours = newUsage / 60;
  const overageHours = Math.max(0, videoHours - limits.videoHoursPerMonth);
  const overageCost = overageHours * limits.videoOveragePrice;

  // Check if should alert (at 80% usage)
  const usagePercent = (videoHours / limits.videoHoursPerMonth) * 100;
  const shouldAlert = usagePercent >= 80 && !user.usageAlertSent;

  if (shouldAlert) {
    await prisma.user.update({
      where: { id: userId },
      data: { usageAlertSent: true },
    });
  }

  return {
    success: true,
    currentUsage: videoHours,
    limit: limits.videoHoursPerMonth,
    overageMinutes: overageHours * 60,
    overageCost,
    shouldAlert,
  };
}

/**
 * Update member count for a user
 */
export async function updateMemberCount(userId: string): Promise<void> {
  const communities = await prisma.community.findMany({
    where: { ownerId: userId },
    include: {
      _count: {
        select: { members: true },
      },
    },
  });

  const totalMembers = communities.reduce(
    (sum, community) => sum + community._count.members,
    0
  );

  await prisma.user.update({
    where: { id: userId },
    data: {
      currentMemberCount: totalMembers,
    },
  });
}

/**
 * Get current usage for a user
 */
export async function getUserUsage(userId: string): Promise<{
  plan: SubscriptionPlan;
  videoHours: number;
  videoLimit: number;
  videoOverage: number;
  memberCount: number;
  memberLimit: number;
  memberOverage: number;
  estimatedCost: {
    basePrice: number;
    memberOverage: number;
    videoOverage: number;
    storageOverage: number;
    totalCost: number;
    breakdown: string[];
  };
  usagePercent: {
    video: number;
    members: number;
  };
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      subscriptionPlan: true,
      currentVideoMinutes: true,
      currentMemberCount: true,
      billingCycleStart: true,
      billingCycleEnd: true,
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  // Check if billing cycle needs reset
  const now = new Date();
  if (!user.billingCycleEnd || now > user.billingCycleEnd) {
    await initializeBillingCycle(userId);
    user.currentVideoMinutes = 0;
    user.currentMemberCount = 0;
  }

  const plan = (user.subscriptionPlan as SubscriptionPlan) || "FREE";
  const limits = getPlanLimits(plan);
  const videoHours = (user.currentVideoMinutes || 0) / 60;
  const memberCount = user.currentMemberCount || 0;

  const videoOverage = Math.max(0, videoHours - limits.videoHoursPerMonth);
  const memberOverage = Math.max(0, memberCount - limits.membersPerCommunity);

  const estimatedCost = calculateMonthlyCost(plan, {
    members: memberCount,
    videoHours,
    storageGB: 0, // TODO: Implement storage tracking
  });

  return {
    plan,
    videoHours,
    videoLimit: limits.videoHoursPerMonth,
    videoOverage,
    memberCount,
    memberLimit: limits.membersPerCommunity,
    memberOverage,
    estimatedCost,
    usagePercent: {
      video: (videoHours / limits.videoHoursPerMonth) * 100,
      members: (memberCount / limits.membersPerCommunity) * 100,
    },
  };
}

/**
 * Create end-of-cycle usage record for billing
 */
export async function createUsageRecord(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      subscriptionPlan: true,
      currentVideoMinutes: true,
      currentMemberCount: true,
      billingCycleStart: true,
      billingCycleEnd: true,
    },
  });

  if (!user || !user.billingCycleStart || !user.billingCycleEnd) {
    throw new Error("User or billing cycle not found");
  }

  const plan = (user.subscriptionPlan as SubscriptionPlan) || "FREE";
  const limits = getPlanLimits(plan);
  const videoHours = (user.currentVideoMinutes || 0) / 60;
  const memberCount = user.currentMemberCount || 0;

  // Calculate overages
  const videoOverageHours = Math.max(0, videoHours - limits.videoHoursPerMonth);
  const memberOverageCount = Math.max(0, memberCount - limits.membersPerCommunity);

  const videoOverageCost = videoOverageHours * limits.videoOveragePrice;
  const memberOverageCost = memberOverageCount * limits.memberOveragePrice;

  const totalCharge = limits.price + videoOverageCost + memberOverageCost;

  // Create usage record
  await prisma.usageRecord.create({
    data: {
      userId,
      videoMinutes: user.currentVideoMinutes || 0,
      memberCount: memberCount,
      storageGB: 0, // TODO: Implement storage tracking
      baseCharge: limits.price,
      videoOverage: videoOverageCost,
      memberOverage: memberOverageCost,
      storageOverage: 0,
      totalCharge,
      billingPeriodStart: user.billingCycleStart,
      billingPeriodEnd: user.billingCycleEnd,
      status: "pending",
    },
  });

  // Reset current usage for new cycle
  await initializeBillingCycle(userId);
}

/**
 * Get usage records for a user
 */
export async function getUserUsageRecords(
  userId: string,
  limit: number = 12
) {
  return prisma.usageRecord.findMany({
    where: { userId },
    orderBy: { billingPeriodStart: "desc" },
    take: limit,
  });
}

/**
 * Check if usage alert should be sent
 */
export async function checkUsageAlerts(userId: string): Promise<{
  shouldAlert: boolean;
  alertType?: "video" | "members";
  message?: string;
  currentUsage?: number;
  limit?: number;
}> {
  const usage = await getUserUsage(userId);

  // Alert at 80% usage
  if (usage.usagePercent.video >= 80 && usage.usagePercent.video < 100) {
    return {
      shouldAlert: true,
      alertType: "video",
      message: `You've used ${usage.usagePercent.video.toFixed(0)}% of your video hours this month.`,
      currentUsage: usage.videoHours,
      limit: usage.videoLimit,
    };
  }

  if (usage.usagePercent.members >= 80 && usage.usagePercent.members < 100) {
    return {
      shouldAlert: true,
      alertType: "members",
      message: `You're approaching your member limit (${usage.memberCount}/${usage.memberLimit} members).`,
      currentUsage: usage.memberCount,
      limit: usage.memberLimit,
    };
  }

  // Alert when exceeded (overage charges)
  if (usage.videoOverage > 0) {
    return {
      shouldAlert: true,
      alertType: "video",
      message: `You've exceeded your video hours limit by ${usage.videoOverage.toFixed(1)} hours. Additional charges: $${(usage.videoOverage * getPlanLimits(usage.plan).videoOveragePrice).toFixed(2)}`,
      currentUsage: usage.videoHours,
      limit: usage.videoLimit,
    };
  }

  if (usage.memberOverage > 0) {
    return {
      shouldAlert: true,
      alertType: "members",
      message: `You have ${usage.memberOverage} members over your plan limit. Additional charges: $${(usage.memberOverage * getPlanLimits(usage.plan).memberOveragePrice).toFixed(2)}`,
      currentUsage: usage.memberCount,
      limit: usage.memberLimit,
    };
  }

  return { shouldAlert: false };
}