/**
 * Subscription Limits System
 * 
 * Manages plan-based restrictions for Unytea platform
 * 
 * HYBRID REVENUE MODEL:
 * - Community Memberships (recurring): 0% platform fee 
 * - Course Sales (one-time): 1-5% platform fee (tiered by plan)
 * - Rationale: 0% on memberships = differentiator, fees on courses = sustainable
 */

import { prisma } from "./prisma";

// Plan type - exported for use across the app
export type SubscriptionPlan = "FREE" | "PROFESSIONAL" | "SCALE" | "ENTERPRISE";

// Plan limits interface
export interface PlanLimits {
  name: string;
  price: number; // Base price per month in USD
  communities: number;
  membersPerCommunity: number;
  videoHoursPerMonth: number;
  storageGB: number;
  
  // Overage pricing
  memberOveragePrice: number; // Price per additional member
  videoOveragePrice: number;  // Price per additional hour
  storageOveragePrice: number; // Price per additional GB
  
  // Transaction fees (NEW - Hybrid Model)
  membershipFeePercent: number; // Fee on recurring memberships (0% for all )
  courseFeePercent: number;     // Fee on one-time course sales (tiered 1-5%)
  
  // Features
  features: {
    aiTranscription: boolean;
    aiSummaries: boolean;
    recording: boolean;
    buddySystem: boolean;
    analytics: boolean;
    whiteLabel: boolean;
    prioritySupport: boolean;
    apiAccess: boolean;
    customIntegrations: boolean;
    dedicatedManager: boolean;
    sla: boolean;
    // Payment features
    canSellMemberships: boolean;  // Can create paid communities
    canSellCourses: boolean;      // Can create paid courses
  };
}

// Plan definitions with limits
export const SUBSCRIPTION_LIMITS: Record<SubscriptionPlan, PlanLimits> = {
  FREE: {
    name: "Trial",
    price: 0,
    communities: 1,
    membersPerCommunity: 50,
    videoHoursPerMonth: 2, // 2 hours trial
    storageGB: 1,
    memberOveragePrice: 0, // Must upgrade
    videoOveragePrice: 0, // Must upgrade
    storageOveragePrice: 0,
    membershipFeePercent: 0, // 0% fee on memberships
    courseFeePercent: 0, // No course sales on free plan
    features: {
      aiTranscription: true, // Full experience in trial
      aiSummaries: true,
      recording: true,
      buddySystem: true,
      analytics: false,
      whiteLabel: false,
      prioritySupport: false,
      apiAccess: false,
      customIntegrations: false,
      dedicatedManager: false,
      sla: false,
      canSellMemberships: false,
      canSellCourses: false,
    },
  },
  
  PROFESSIONAL: {
    name: "Professional",
    price: 99,
    communities: 3,
    membersPerCommunity: 500,
    videoHoursPerMonth: 20,
    storageGB: 50,
    memberOveragePrice: 0.15, // $0.15 per additional member
    videoOveragePrice: 0.30,  // $0.30 per additional hour
    storageOveragePrice: 0.20, // $0.20 per GB
    membershipFeePercent: 0, // 0% fee on memberships
    courseFeePercent: 5, // 5% fee on course sales
    features: {
      aiTranscription: true,
      aiSummaries: true,
      recording: true,
      buddySystem: true,
      analytics: true,
      whiteLabel: false,
      prioritySupport: false,
      apiAccess: false,
      customIntegrations: false,
      dedicatedManager: false,
      sla: false,
      canSellMemberships: true,
      canSellCourses: true,
    },
  },
  
  SCALE: {
    name: "Scale",
    price: 249,
    communities: 6,
    membersPerCommunity: 2000,
    videoHoursPerMonth: 60,
    storageGB: 200,
    memberOveragePrice: 0.10, // $0.10 per additional member
    videoOveragePrice: 0.20,  // $0.20 per additional hour
    storageOveragePrice: 0.15, // $0.15 per GB
    membershipFeePercent: 0, // 0% fee on memberships
    courseFeePercent: 3, // 3% fee on course sales
    features: {
      aiTranscription: true,
      aiSummaries: true,
      recording: true,
      buddySystem: true,
      analytics: true,
      whiteLabel: true,
      prioritySupport: true,
      apiAccess: false,
      customIntegrations: true,
      dedicatedManager: false,
      sla: false,
      canSellMemberships: true,
      canSellCourses: true,
    },
  },
  
  ENTERPRISE: {
    name: "Enterprise",
    price: 499,
    communities: 10,
    membersPerCommunity: 5000,
    videoHoursPerMonth: 150,
    storageGB: 500,
    memberOveragePrice: 0.08, // $0.08 per additional member
    videoOveragePrice: 0.15,  // $0.15 per additional hour
    storageOveragePrice: 0.10, // $0.10 per GB
    membershipFeePercent: 0, // 0% fee on memberships
    courseFeePercent: 1, // 1% fee on course sales
    features: {
      aiTranscription: true,
      aiSummaries: true,
      recording: true,
      buddySystem: true,
      analytics: true,
      whiteLabel: true,
      prioritySupport: true,
      apiAccess: true,
      customIntegrations: true,
      dedicatedManager: true,
      sla: true,
      canSellMemberships: true,
      canSellCourses: true,
    },
  },
};

/**
 * Get limits for a subscription plan
 */
export function getPlanLimits(plan: SubscriptionPlan): PlanLimits {
  return SUBSCRIPTION_LIMITS[plan];
}

/**
 * Check if user can create a new community
 */
export async function canCreateCommunity(
  userId: string
): Promise<{
  allowed: boolean;
  reason?: string;
  currentCount?: number;
  limit?: number;
}> {
  const plan = await getUserPlan(userId);
  const limits = getPlanLimits(plan);

  // Count user's current communities
  const currentCount = await prisma.community.count({
    where: { ownerId: userId },
  });

  const allowed = currentCount < limits.communities;

  return {
    allowed,
    reason: allowed
      ? undefined
      : `Your ${limits.name} plan allows ${limits.communities} ${limits.communities === 1 ? "community" : "communities"}. Upgrade to create more.`,
    currentCount,
    limit: limits.communities,
  };
}

/**
 * Check if community can accept new members
 */
export async function canAddMember(
  communityId: string
): Promise<{
  allowed: boolean;
  reason?: string;
  currentCount?: number;
  limit?: number;
  willIncurOverage?: boolean;
  overageCost?: number;
}> {
  const community = await prisma.community.findUnique({
    where: { id: communityId },
    include: {
      owner: {
        select: { subscriptionPlan: true },
      },
      _count: {
        select: { members: true },
      },
    },
  });

  if (!community) {
    return {
      allowed: false,
      reason: "Community not found",
    };
  }

  const plan = (community.owner.subscriptionPlan as SubscriptionPlan) || "FREE";
  const limits = getPlanLimits(plan);
  const currentCount = community._count.members;

  // Paid plans can exceed limits with overage charges
  if (currentCount >= limits.membersPerCommunity) {
    const overage = currentCount + 1 - limits.membersPerCommunity;
    const overageCost = overage * limits.memberOveragePrice;
    
    return {
      allowed: true,
      willIncurOverage: true,
      overageCost,
      reason: `This member will incur an additional $${limits.memberOveragePrice.toFixed(2)} charge.`,
      currentCount,
      limit: limits.membersPerCommunity,
    };
  }
  
  const allowed = currentCount < limits.membersPerCommunity;

  return {
    allowed,
    reason: allowed
      ? undefined
      : `This community has reached its member limit (${limits.membersPerCommunity} members on ${limits.name} plan). The creator needs to upgrade.`,
    currentCount,
    limit: limits.membersPerCommunity,
  };
}

/**
 * Check if user can start a video call
 */
export async function canStartVideoCall(
  userId: string
): Promise<{
  allowed: boolean;
  reason?: string;
  currentCount?: number;
  limit?: number;
  willIncurOverage?: boolean;
  overageCost?: number;
}> {
  const plan = await getUserPlan(userId);
  const limits = getPlanLimits(plan);

  // If unlimited, allow
  if (limits.videoHoursPerMonth === Infinity) {
    return { allowed: true };
  }

  // Count video calls this month
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const currentCount = await prisma.mentorSession.count({
    where: {
      mentorId: userId,
      scheduledAt: {
        gte: startOfMonth,
        lte: endOfMonth,
      },
      status: {
        in: ["SCHEDULED", "IN_PROGRESS", "COMPLETED"],
      },
    },
  });

  // Paid plans can exceed limits with overage charges
  if (currentCount >= limits.videoHoursPerMonth) {
    const overage = currentCount + 1 - limits.videoHoursPerMonth;
    const overageCost = overage * limits.videoOveragePrice;
    
    return {
      allowed: true,
      willIncurOverage: true,
      overageCost,
      reason: `This session will incur an additional $${limits.videoOveragePrice.toFixed(2)} charge.`,
      currentCount,
      limit: limits.videoHoursPerMonth,
    };
  }
  
  const allowed = currentCount < limits.videoHoursPerMonth;

  return {
    allowed,
    reason: allowed
      ? undefined
      : `You've used all ${limits.videoHoursPerMonth} video hours for this month on the ${limits.name} plan. Upgrade to get more hours.`,
    currentCount,
    limit: limits.videoHoursPerMonth,
  };
}

/**
 * Check if user has access to a feature
 */
export async function hasFeatureAccess(
  userId: string,
  feature: keyof PlanLimits["features"]
): Promise<boolean> {
  const plan = await getUserPlan(userId);
  const limits = getPlanLimits(plan);

  return limits.features[feature] === true;
}

/**
 * Get usage stats for a user
 */
export async function getUserUsageStats(userId: string) {
  const plan = await getUserPlan(userId);
  const limits = getPlanLimits(plan);

  // Count communities
  const communitiesCount = await prisma.community.count({
    where: { ownerId: userId },
  });

  // Count video calls this month
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const videoCallsThisMonth = await prisma.mentorSession.count({
    where: {
      mentorId: userId,
      scheduledAt: {
        gte: startOfMonth,
        lte: endOfMonth,
      },
      status: {
        in: ["SCHEDULED", "IN_PROGRESS", "COMPLETED"],
      },
    },
  });

  // Get member counts for each community
  const communities = await prisma.community.findMany({
    where: { ownerId: userId },
    include: {
      _count: {
        select: { members: true },
      },
    },
  });

  return {
    plan,
    limits,
    usage: {
      communities: {
        current: communitiesCount,
        limit: limits.communities,
        percentage: (communitiesCount / limits.communities) * 100,
      },
      videoCallsThisMonth: {
        current: videoCallsThisMonth,
        limit: limits.videoHoursPerMonth === Infinity ? undefined : limits.videoHoursPerMonth,
        percentage:
          limits.videoHoursPerMonth === Infinity
            ? 0
            : (videoCallsThisMonth / limits.videoHoursPerMonth) * 100,
      },
      communitiesDetails: communities.map((c) => ({
        id: c.id,
        name: c.name,
        members: c._count.members,
        limit: limits.membersPerCommunity === Infinity ? undefined : limits.membersPerCommunity,
        percentage:
          limits.membersPerCommunity === Infinity
            ? 0
            : (c._count.members / limits.membersPerCommunity) * 100,
      })),
    },
  };
}

/**
 * Check if upgrade is needed for an action
 */
export function getUpgradeMessage(
  currentPlan: SubscriptionPlan,
  feature: string
): string {
  if (currentPlan === "FREE") {
    return `Upgrade to Professional ($99/month) to unlock ${feature}`;
  }
  if (currentPlan === "PROFESSIONAL") {
    return `Upgrade to Scale ($249/month) to unlock ${feature}`;
  }
  if (currentPlan === "SCALE") {
    return `Upgrade to Enterprise ($499/month) to unlock ${feature}`;
  }
  return "";
}

/**
 * Helper to get user's current plan
 */
export async function getUserPlan(userId: string): Promise<SubscriptionPlan> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { subscriptionPlan: true },
  });

  return (user?.subscriptionPlan as SubscriptionPlan) || "FREE";
}

/**
 * Calculate total monthly cost including overages
 */
export function calculateMonthlyCost(
  plan: SubscriptionPlan,
  usage: {
    members: number;
    videoHours: number;
    storageGB: number;
  }
): {
  basePrice: number;
  memberOverage: number;
  videoOverage: number;
  storageOverage: number;
  totalCost: number;
  breakdown: string[];
} {
  const limits = getPlanLimits(plan);
  
  let memberOverage = 0;
  let videoOverage = 0;
  let storageOverage = 0;
  const breakdown: string[] = [];
  
  // Calculate member overage
  if (usage.members > limits.membersPerCommunity) {
    const extraMembers = usage.members - limits.membersPerCommunity;
    memberOverage = extraMembers * limits.memberOveragePrice;
    breakdown.push(`${extraMembers} extra members: $${memberOverage.toFixed(2)}`);
  }
  
  // Calculate video overage
  if (usage.videoHours > limits.videoHoursPerMonth) {
    const extraHours = usage.videoHours - limits.videoHoursPerMonth;
    videoOverage = extraHours * limits.videoOveragePrice;
    breakdown.push(`${extraHours.toFixed(1)} extra video hours: $${videoOverage.toFixed(2)}`);
  }
  
  // Calculate storage overage
  if (usage.storageGB > limits.storageGB) {
    const extraGB = usage.storageGB - limits.storageGB;
    storageOverage = extraGB * limits.storageOveragePrice;
    breakdown.push(`${extraGB.toFixed(1)} GB extra storage: $${storageOverage.toFixed(2)}`);
  }
  
  const totalCost = limits.price + memberOverage + videoOverage + storageOverage;
  
  return {
    basePrice: limits.price,
    memberOverage,
    videoOverage,
    storageOverage,
    totalCost,
    breakdown,
  };
}

/**
 * Get upgrade recommendation based on usage
 */
export function getUpgradeRecommendation(
  currentPlan: SubscriptionPlan,
  usage: {
    communities: number;
    members: number;
    videoHours: number;
  }
): { shouldUpgrade: boolean; recommendedPlan?: SubscriptionPlan; reason?: string } {
  if (currentPlan === "ENTERPRISE") {
    return { shouldUpgrade: false };
  }
  
  const plans: SubscriptionPlan[] = ["FREE", "PROFESSIONAL", "SCALE", "ENTERPRISE"];
  const currentIndex = plans.indexOf(currentPlan);
  
  for (let i = currentIndex + 1; i < plans.length; i++) {
    const nextPlan = plans[i];
    const nextLimits = getPlanLimits(nextPlan);
    
    // Prepare usage object with storageGB for calculateMonthlyCost
    const usageWithStorage = {
      ...usage,
      storageGB: 0, // Default to 0 if not provided
    };
    
    // Check if next plan would be more cost-effective
    const currentCost = calculateMonthlyCost(currentPlan, usageWithStorage);
    const nextCost = calculateMonthlyCost(nextPlan, usageWithStorage);
    
    if (nextCost.totalCost < currentCost.totalCost) {
      return {
        shouldUpgrade: true,
        recommendedPlan: nextPlan,
        reason: `Save $${(currentCost.totalCost - nextCost.totalCost).toFixed(2)}/month with ${nextLimits.name}`,
      };
    }
    
    // Check if approaching limits frequently
    if (
      usage.members > nextLimits.membersPerCommunity * 0.8 ||
      usage.videoHours > nextLimits.videoHoursPerMonth * 0.8
    ) {
      return {
        shouldUpgrade: true,
        recommendedPlan: nextPlan,
        reason: `Get ${nextLimits.communities}x communities and higher limits with ${nextLimits.name}`,
      };
    }
  }
  
  return { shouldUpgrade: false };
}
