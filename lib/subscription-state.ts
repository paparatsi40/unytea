import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export type SubscriptionState =
  | { status: "trialing"; trialEndsAt: Date; daysRemaining: number; planName: string }
  | { status: "active"; planName: string }
  | { status: "paywall_locked"; reason: "paused" | "past_due" | "canceled" }
  | { status: "no_subscription" };

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Returns the current user's platform subscription state for in-app UX:
 * - trialing: TrialBanner with countdown
 * - active: no banner (happy path)
 * - paywall_locked: PaywallBanner (host) or PaywallLockedView (members)
 * - no_subscription: user hasn't subscribed yet; new signup, redirect to /upgrade
 *
 * Called server-side from dashboard layout + community page gating.
 *
 * Edge case — multiple subscriptions: a user can have several Subscription
 * rows (historic + current). We pick the most-recent and use its status as
 * the source of truth, because the webhook always updates the active row.
 * Older terminated subs are ignored.
 */
export async function getCurrentSubscriptionState(): Promise<SubscriptionState | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const sub = await prisma.subscription.findFirst({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: { plan: { select: { name: true } } },
  });

  if (!sub) return { status: "no_subscription" };

  switch (sub.status) {
    case "TRIALING": {
      const now = new Date();
      // Stripe sets currentPeriodEnd to trial_end for subscriptions in trial.
      const trialEndsAt = sub.currentPeriodEnd;
      const daysRemaining = Math.max(
        0,
        Math.ceil((trialEndsAt.getTime() - now.getTime()) / DAY_MS)
      );
      return {
        status: "trialing",
        trialEndsAt,
        daysRemaining,
        planName: sub.plan.name,
      };
    }
    case "ACTIVE":
      return { status: "active", planName: sub.plan.name };
    case "PAUSED":
      return { status: "paywall_locked", reason: "paused" };
    case "PAST_DUE":
    case "UNPAID":
      return { status: "paywall_locked", reason: "past_due" };
    case "CANCELED":
      return { status: "paywall_locked", reason: "canceled" };
    default:
      return null;
  }
}

/**
 * For per-community paywall check. Returns true if the community's owner has
 * paywall locked, regardless of who is viewing (host or member).
 */
export async function isCommunityPaywallLocked(communityId: string): Promise<boolean> {
  const community = await prisma.community.findUnique({
    where: { id: communityId },
    select: { paywallLocked: true },
  });
  return Boolean(community?.paywallLocked);
}
