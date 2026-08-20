export type PlatformPlan = "START" | "CREATOR" | "BUSINESS" | "PRO";

/**
 * The platform commission, as the whole-number percent Stripe wants.
 *
 * THE single source. It was three, and they disagreed:
 *
 *   - the marketing cards said Creator 8% / Business 5% / Pro 3%;
 *   - `PLAN_LIMITS.transactionFee` said 0.05 / 0.02 / 0;
 *   - `PLATFORM_FEE_BY_PLAN`, duplicated verbatim in three Stripe routes, said
 *     5 / 2 / 0 — and that one is the truth, because it is what reaches
 *     `application_fee_percent` on the subscription.
 *
 * So the cards advertised a Pro host 3% and charged them 0%, and advertised a
 * Creator 8% and charged 5%. Everything now derives from here: the routes read
 * it directly, PLAN_LIMITS converts it once through `percentToRate`, and the
 * pricing cards render it. A number can still be wrong, but it can no longer be
 * wrong in one place and right in another.
 */
export const PLATFORM_FEE_PERCENT: Record<PlatformPlan, number> = {
  START: 8,
  CREATOR: 5,
  BUSINESS: 2,
  PRO: 0,
};

/**
 * The one conversion between the two representations.
 *
 * Stripe takes a percent (`application_fee_percent: 5`); `PlanLimits` has
 * always stored a rate (`0.05`). Both forms are legitimate, so the fix is not
 * to pick one but to make sure only one line ever performs the arithmetic.
 */
export function percentToRate(percent: number): number {
  return percent / 100;
}

/**
 * Resolve the commission for a subscription plan name as it appears in the
 * database (`plan.name`, lower-cased on the way in).
 *
 * Shared by every Stripe checkout route. Each of them used to carry its own
 * copy of the table and this lookup — three identical copies, which is three
 * chances for a pricing change to land in two of them.
 *
 * The 5% fallback for an unknown or absent plan name is the pre-existing
 * behaviour, preserved deliberately: it is a billing decision, not a bug, and
 * changing it is not part of an integrity pass.
 */
export function getPlatformFeePercent(planName: string | null | undefined): number {
  const normalized = planName?.toLowerCase()?.trim();
  if (!normalized) return PLATFORM_FEE_PERCENT.CREATOR;

  const match = (Object.keys(PLATFORM_FEE_PERCENT) as PlatformPlan[]).find(
    (plan) => plan.toLowerCase() === normalized
  );

  return match ? PLATFORM_FEE_PERCENT[match] : PLATFORM_FEE_PERCENT.CREATOR;
}

export interface PlanLimits {
  maxCommunities: number;
  maxMembers: number;
  transactionFee: number;
  /**
   * DEFERRED — false on every plan, deliberately.

   * Nothing reads this and nothing serves a custom domain.
   *
   * `proxy.ts` resolves the request host only to redirect www to the apex; no
   * code maps a host to a community. Every plan is now `false` so that a future
   * reader of this flag cannot render the perk by accident — a `true` sitting
   * here waiting for someone to wire a checkmark to it is how a promise comes
   * back without anyone deciding to make it.
   *
   * The intent is recorded here instead: this was designed as a Business and
   * Pro perk. Set BUSINESS and PRO back to `true` when `proxy.ts` resolves a
   * community from the request host.
   *
   * The claim used to appear in three places, all removed:
   * `billing.tiers.business.features`, `dashboard.billing.plans.BUSINESS.features`,
   * and a teaser card in the community-creation wizard.
   * Roadmap: Pro / white-label.
   */
  customDomain: boolean;
  whiteLabel: boolean;
  apiAccess: boolean;
  maxAdmins: number;
  /**
   * Live-video allowance per billing period, in participant-hours.
   *
   * One hour with six people in the room is six. The host counts: they occupy a
   * connection with the same cost as anyone else.
   *
   * Here rather than in a config module of its own, for the reason the file
   * header already gives at length about the commission: a second place a
   * tier's entitlements live is a second place they can be right while the
   * first is wrong. `getLimitsForPlan()` resolves it like everything else.
   */
  videoParticipantHours: number;
  advancedAnalytics: boolean;
  paidCommunity: boolean;
  paidCourses: boolean;
}

export const PLAN_LIMITS: Record<PlatformPlan, PlanLimits> = {
  START: {
    maxCommunities: 1,
    maxMembers: 50,
    transactionFee: percentToRate(PLATFORM_FEE_PERCENT.START),
    customDomain: false,
    whiteLabel: false,
    apiAccess: false,
    maxAdmins: 1,
    videoParticipantHours: 15,
    advancedAnalytics: false,
    paidCommunity: false,
    paidCourses: false,
  },
  CREATOR: {
    maxCommunities: 1,
    maxMembers: Infinity,
    transactionFee: percentToRate(PLATFORM_FEE_PERCENT.CREATOR),
    customDomain: false,
    whiteLabel: false,
    apiAccess: false,
    maxAdmins: 3,
    videoParticipantHours: 150,
    advancedAnalytics: false,
    paidCommunity: true,
    paidCourses: true,
  },
  BUSINESS: {
    maxCommunities: 1,
    maxMembers: Infinity,
    transactionFee: percentToRate(PLATFORM_FEE_PERCENT.BUSINESS),
    customDomain: false,
    whiteLabel: false,
    apiAccess: false,
    maxAdmins: 5,
    videoParticipantHours: 500,
    advancedAnalytics: true,
    paidCommunity: true,
    paidCourses: true,
  },
  PRO: {
    maxCommunities: 3,
    maxMembers: Infinity,
    transactionFee: percentToRate(PLATFORM_FEE_PERCENT.PRO),
    customDomain: false,
    whiteLabel: true,
    apiAccess: true,
    maxAdmins: Infinity,
    videoParticipantHours: 2000,
    advancedAnalytics: true,
    paidCommunity: true,
    paidCourses: true,
  },
};

/** The paid tiers, in the order they are shown. START is the implicit free plan. */
export const PAID_PLANS = ["CREATOR", "BUSINESS", "PRO"] as const;
export type PaidPlan = (typeof PAID_PLANS)[number];

export interface PlanPricing {
  /** Dollars per month, as displayed. */
  monthly: number;
  /** Dollars per year, as displayed. */
  annual: number;
  stripePriceIdMonthly: string;
  /** Empty when the yearly price has not been configured in this environment. */
  stripePriceIdAnnual: string;
}

/**
 * The prices shown to a host, in one place.
 *
 * These were hardcoded twice — in the marketing cards and again in the
 * dashboard billing page — with no link between them, so the two could drift
 * apart before either drifted from Stripe. They are still internal literals
 * rather than values read from Stripe (that would need an API call on every
 * render), but there is now exactly one copy.
 *
 * What Stripe actually charges is defined by the price IDs below and can only
 * be confirmed in the Stripe dashboard. If these numbers and those prices
 * disagree, these numbers are the ones that are wrong.
 */
export const PLAN_PRICING: Record<PaidPlan, PlanPricing> = {
  CREATOR: {
    monthly: 15,
    annual: 150,
    stripePriceIdMonthly: process.env.NEXT_PUBLIC_STRIPE_CREATOR_PRICE_ID ?? "",
    stripePriceIdAnnual: process.env.NEXT_PUBLIC_STRIPE_CREATOR_PRICE_ID_YEARLY ?? "",
  },
  BUSINESS: {
    monthly: 49,
    annual: 490,
    stripePriceIdMonthly: process.env.NEXT_PUBLIC_STRIPE_BUSINESS_PRICE_ID ?? "",
    stripePriceIdAnnual: process.env.NEXT_PUBLIC_STRIPE_BUSINESS_PRICE_ID_YEARLY ?? "",
  },
  PRO: {
    monthly: 149,
    annual: 1490,
    stripePriceIdMonthly: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID ?? "",
    stripePriceIdAnnual: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID_YEARLY ?? "",
  },
};

/**
 * Is annual billing offered at all in this environment?
 *
 * The yearly price IDs are separate environment variables and may simply not be
 * set. Rendering an annual price that cannot be bought is worse than not
 * offering it: the visitor picks it, clicks, and gets "Stripe price ID not
 * configured".
 */
export function hasAnyAnnualPricing(): boolean {
  return PAID_PLANS.some((plan) => PLAN_PRICING[plan].stripePriceIdAnnual !== "");
}

export function getPlanFromPriceId(priceId: string): PlatformPlan | null {
  // Defensive construction: filter undefined/empty env vars before building
  // the map. The previous `[env ?? ""]: "PLAN"` pattern would have collapsed
  // every unset env var to the same `""` key, leaving the last `""` mapping
  // win — and a lookup of "" would have returned a plan name.
  const priceMap: Record<string, PlatformPlan> = {};
  const entries: Array<[string | undefined, PlatformPlan]> = [
    [process.env.NEXT_PUBLIC_STRIPE_CREATOR_PRICE_ID, "CREATOR"],
    [process.env.NEXT_PUBLIC_STRIPE_BUSINESS_PRICE_ID, "BUSINESS"],
    [process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID, "PRO"],
    // Annual variants (added 2026-05-29 — Fase C pre-merge fix B1). Without
    // these, invoice.payment_succeeded for annual subscribers never triggers
    // the platformPlan update or paywall unlock shortcut.
    [process.env.NEXT_PUBLIC_STRIPE_CREATOR_PRICE_ID_YEARLY, "CREATOR"],
    [process.env.NEXT_PUBLIC_STRIPE_BUSINESS_PRICE_ID_YEARLY, "BUSINESS"],
    [process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID_YEARLY, "PRO"],
  ];
  for (const [id, plan] of entries) {
    if (id) priceMap[id] = plan;
  }
  return priceMap[priceId] ?? null;
}

export function getLimitsForPlan(plan: string | null | undefined): PlanLimits {
  const normalized = (plan ?? "START") as PlatformPlan;
  return PLAN_LIMITS[normalized] ?? PLAN_LIMITS.START;
}
