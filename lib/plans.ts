export type PlatformPlan = "START" | "CREATOR" | "BUSINESS" | "PRO";

export interface PlanLimits {
  maxCommunities: number;
  maxMembers: number;
  transactionFee: number;
  customDomain: boolean;
  whiteLabel: boolean;
  apiAccess: boolean;
  maxAdmins: number;
  advancedAnalytics: boolean;
  paidCommunity: boolean;
  paidCourses: boolean;
}

export const PLAN_LIMITS: Record<PlatformPlan, PlanLimits> = {
  START: {
    maxCommunities: 1,
    maxMembers: 50,
    transactionFee: 0.08,
    customDomain: false,
    whiteLabel: false,
    apiAccess: false,
    maxAdmins: 1,
    advancedAnalytics: false,
    paidCommunity: false,
    paidCourses: false,
  },
  CREATOR: {
    maxCommunities: 1,
    maxMembers: Infinity,
    transactionFee: 0.05,
    customDomain: false,
    whiteLabel: false,
    apiAccess: false,
    maxAdmins: 3,
    advancedAnalytics: false,
    paidCommunity: true,
    paidCourses: true,
  },
  BUSINESS: {
    maxCommunities: 1,
    maxMembers: Infinity,
    transactionFee: 0.02,
    customDomain: true,
    whiteLabel: false,
    apiAccess: false,
    maxAdmins: 5,
    advancedAnalytics: true,
    paidCommunity: true,
    paidCourses: true,
  },
  PRO: {
    maxCommunities: 3,
    maxMembers: Infinity,
    transactionFee: 0,
    customDomain: true,
    whiteLabel: true,
    apiAccess: true,
    maxAdmins: Infinity,
    advancedAnalytics: true,
    paidCommunity: true,
    paidCourses: true,
  },
};

export function getPlanFromPriceId(priceId: string): PlatformPlan | null {
  const priceMap: Record<string, PlatformPlan> = {
    [process.env.NEXT_PUBLIC_STRIPE_CREATOR_PRICE_ID ?? ""]:  "CREATOR",
    [process.env.NEXT_PUBLIC_STRIPE_BUSINESS_PRICE_ID ?? ""]: "BUSINESS",
    [process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID ?? ""]:      "PRO",
  };
  return priceMap[priceId] ?? null;
}

export function getLimitsForPlan(plan: string | null | undefined): PlanLimits {
  const normalized = (plan ?? "START") as PlatformPlan;
  return PLAN_LIMITS[normalized] ?? PLAN_LIMITS.START;
}