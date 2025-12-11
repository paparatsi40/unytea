"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import {
  createConnectAccount,
  createOnboardingLink,
  getConnectAccountStatus,
  createLoginLink,
  createMembershipCheckout,
  cancelMemberSubscription,
  getCreatorEarnings,
} from "@/lib/stripe-connect";

// =====================================================
// CREATOR ACTIONS
// =====================================================

/**
 * Enable paid community for creator
 */
export async function enablePaidCommunity(communityId: string, priceInCents: number) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    // Verify user owns the community
    const community = await prisma.community.findUnique({
      where: { id: communityId },
      select: { creatorId: true },
    });

    if (!community || community.creatorId !== session.user.id) {
      return { success: false, error: "Unauthorized" };
    }

    // Verify user has completed Stripe onboarding
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { stripeConnectAccountId: true },
    });

    if (!user?.stripeConnectAccountId) {
      return {
        success: false,
        error: "Complete Stripe onboarding first",
        needsOnboarding: true,
      };
    }

    // Update community to paid
    await prisma.community.update({
      where: { id: communityId },
      data: {
        isPaid: true,
        membershipPrice: priceInCents,
      },
    });

    revalidatePath(`/dashboard/communities/${communityId}`);
    return { success: true };
  } catch (error: any) {
    console.error("Error enabling paid community:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Disable paid community
 */
export async function disablePaidCommunity(communityId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    // Verify ownership
    const community = await prisma.community.findUnique({
      where: { id: communityId },
      select: { creatorId: true },
    });

    if (!community || community.creatorId !== session.user.id) {
      return { success: false, error: "Unauthorized" };
    }

    // Update to free
    await prisma.community.update({
      where: { id: communityId },
      data: {
        isPaid: false,
        membershipPrice: null,
      },
    });

    revalidatePath(`/dashboard/communities/${communityId}`);
    return { success: true };
  } catch (error: any) {
    console.error("Error disabling paid community:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Start Stripe Connect onboarding
 */
export async function startStripeOnboarding() {
  try {
    const session = await auth();
    if (!session?.user?.id || !session?.user?.email) {
      return { success: false, error: "Unauthorized" };
    }

    // Check if already has account
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { stripeConnectAccountId: true },
    });

    let accountId = user?.stripeConnectAccountId;

    // Create account if doesn't exist
    if (!accountId) {
      const result = await createConnectAccount(session.user.id, session.user.email);
      if (!result.success || !result.accountId) {
        return { success: false, error: result.error };
      }

      accountId = result.accountId;

      // Save to database
      await prisma.user.update({
        where: { id: session.user.id },
        data: { stripeConnectAccountId: accountId },
      });
    }

    // Create onboarding link
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const refreshUrl = `${baseUrl}/dashboard/settings/payments`;
    const returnUrl = `${baseUrl}/dashboard/settings/payments?onboarding=success`;

    const linkResult = await createOnboardingLink(accountId, refreshUrl, returnUrl);

    if (!linkResult.success || !linkResult.url) {
      return { success: false, error: linkResult.error };
    }

    return { success: true, url: linkResult.url };
  } catch (error: any) {
    console.error("Error starting onboarding:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Get Stripe Connect status
 */
export async function getStripeConnectStatus() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { stripeConnectAccountId: true },
    });

    if (!user?.stripeConnectAccountId) {
      return {
        success: true,
        status: {
          hasAccount: false,
          chargesEnabled: false,
          payoutsEnabled: false,
          detailsSubmitted: false,
        },
      };
    }

    const statusResult = await getConnectAccountStatus(user.stripeConnectAccountId);

    if (!statusResult.success) {
      return { success: false, error: statusResult.error };
    }

    return {
      success: true,
      status: {
        hasAccount: true,
        chargesEnabled: statusResult.chargesEnabled,
        payoutsEnabled: statusResult.payoutsEnabled,
        detailsSubmitted: statusResult.detailsSubmitted,
        requirements: statusResult.requirements,
      },
    };
  } catch (error: any) {
    console.error("Error getting Stripe status:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Get Stripe dashboard login link
 */
export async function getStripeDashboardLink() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { stripeConnectAccountId: true },
    });

    if (!user?.stripeConnectAccountId) {
      return { success: false, error: "Stripe account not connected" };
    }

    const result = await createLoginLink(user.stripeConnectAccountId);

    if (!result.success || !result.url) {
      return { success: false, error: result.error };
    }

    return { success: true, url: result.url };
  } catch (error: any) {
    console.error("Error getting dashboard link:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Get creator earnings
 */
export async function getEarnings() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { stripeConnectAccountId: true },
    });

    if (!user?.stripeConnectAccountId) {
      return {
        success: true,
        earnings: {
          totalCents: 0,
          totalUSD: 0,
          count: 0,
        },
      };
    }

    const result = await getCreatorEarnings(user.stripeConnectAccountId);

    return result;
  } catch (error: any) {
    console.error("Error getting earnings:", error);
    return { success: false, error: error.message };
  }
}

// =====================================================
// MEMBER ACTIONS
// =====================================================

/**
 * Join paid community (create checkout session)
 */
export async function joinPaidCommunity(communityId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session?.user?.email) {
      return { success: false, error: "Unauthorized" };
    }

    // Get community details
    const community = await prisma.community.findUnique({
      where: { id: communityId },
      include: {
        creator: {
          select: {
            stripeConnectAccountId: true,
          },
        },
      },
    });

    if (!community) {
      return { success: false, error: "Community not found" };
    }

    if (!community.isPaid || !community.membershipPrice) {
      return { success: false, error: "Community is not paid" };
    }

    if (!community.creator.stripeConnectAccountId) {
      return { success: false, error: "Creator hasn't set up payments" };
    }

    // Check if already member
    const existingMember = await prisma.communityMember.findUnique({
      where: {
        communityId_userId: {
          communityId,
          userId: session.user.id,
        },
      },
    });

    if (existingMember) {
      return { success: false, error: "Already a member" };
    }

    // Create checkout session
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const successUrl = `${baseUrl}/dashboard/communities/${communityId}?payment=success`;
    const cancelUrl = `${baseUrl}/dashboard/communities/${communityId}?payment=canceled`;

    const checkoutResult = await createMembershipCheckout({
      communityId,
      communityName: community.name,
      creatorAccountId: community.creator.stripeConnectAccountId,
      memberEmail: session.user.email,
      priceInCents: community.membershipPrice,
      successUrl,
      cancelUrl,
    });

    if (!checkoutResult.success || !checkoutResult.url) {
      return { success: false, error: checkoutResult.error };
    }

    return { success: true, checkoutUrl: checkoutResult.url };
  } catch (error: any) {
    console.error("Error joining paid community:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Cancel membership subscription
 */
export async function cancelMembership(communityId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    // Get membership subscription
    const subscription = await prisma.membershipSubscription.findUnique({
      where: {
        communityId_userId: {
          communityId,
          userId: session.user.id,
        },
      },
      include: {
        community: {
          include: {
            creator: {
              select: {
                stripeConnectAccountId: true,
              },
            },
          },
        },
      },
    });

    if (!subscription) {
      return { success: false, error: "Subscription not found" };
    }

    if (!subscription.community.creator.stripeConnectAccountId) {
      return { success: false, error: "Invalid creator account" };
    }

    // Cancel in Stripe
    const cancelResult = await cancelMemberSubscription(
      subscription.stripeSubscriptionId,
      subscription.community.creator.stripeConnectAccountId
    );

    if (!cancelResult.success) {
      return { success: false, error: cancelResult.error };
    }

    // Update in database
    await prisma.membershipSubscription.update({
      where: {
        communityId_userId: {
          communityId,
          userId: session.user.id,
        },
      },
      data: {
        status: "canceled",
        canceledAt: new Date(),
      },
    });

    revalidatePath(`/dashboard/communities/${communityId}`);
    return { success: true };
  } catch (error: any) {
    console.error("Error canceling membership:", error);
    return { success: false, error: error.message };
  }
}