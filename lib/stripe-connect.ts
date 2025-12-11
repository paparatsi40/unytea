/**
 * Stripe Connect Integration
 * 
 * Enables community creators to receive payments from members
 * 0% transaction fee model - creators keep 100% (minus Stripe fees)
 */

import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("Missing STRIPE_SECRET_KEY");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-12-18.acacia",
});

// =====================================================
// CREATOR ONBOARDING
// =====================================================

/**
 * Create Stripe Connect account for creator
 */
export async function createConnectAccount(userId: string, email: string) {
  try {
    const account = await stripe.accounts.create({
      type: "express",
      country: "US",
      email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_type: "individual",
      metadata: {
        userId,
      },
    });

    return {
      success: true,
      accountId: account.id,
    };
  } catch (error: any) {
    console.error("Error creating Connect account:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Create onboarding link for creator to complete Stripe setup
 */
export async function createOnboardingLink(
  accountId: string,
  refreshUrl: string,
  returnUrl: string
) {
  try {
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: "account_onboarding",
    });

    return {
      success: true,
      url: accountLink.url,
    };
  } catch (error: any) {
    console.error("Error creating onboarding link:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Get Connect account status
 */
export async function getConnectAccountStatus(accountId: string) {
  try {
    const account = await stripe.accounts.retrieve(accountId);

    return {
      success: true,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
      requirements: account.requirements,
    };
  } catch (error: any) {
    console.error("Error getting account status:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Create login link for creator to access Stripe dashboard
 */
export async function createLoginLink(accountId: string) {
  try {
    const loginLink = await stripe.accounts.createLoginLink(accountId);

    return {
      success: true,
      url: loginLink.url,
    };
  } catch (error: any) {
    console.error("Error creating login link:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

// =====================================================
// MEMBER SUBSCRIPTIONS
// =====================================================

/**
 * Create subscription checkout session for member
 */
export async function createMembershipCheckout({
  communityId,
  communityName,
  creatorAccountId,
  memberEmail,
  priceInCents,
  successUrl,
  cancelUrl,
}: {
  communityId: string;
  communityName: string;
  creatorAccountId: string;
  memberEmail: string;
  priceInCents: number;
  successUrl: string;
  cancelUrl: string;
}) {
  try {
    // Create price (one-time, will be linked to subscription)
    const price = await stripe.prices.create(
      {
        unit_amount: priceInCents,
        currency: "usd",
        recurring: {
          interval: "month",
        },
        product_data: {
          name: `${communityName} Membership`,
          description: `Monthly membership to ${communityName}`,
        },
      },
      {
        stripeAccount: creatorAccountId,
      }
    );

    // Create checkout session
    const session = await stripe.checkout.sessions.create(
      {
        mode: "subscription",
        payment_method_types: ["card"],
        line_items: [
          {
            price: price.id,
            quantity: 1,
          },
        ],
        customer_email: memberEmail,
        success_url: successUrl,
        cancel_url: cancelUrl,
        subscription_data: {
          metadata: {
            communityId,
          },
        },
        metadata: {
          communityId,
        },
      },
      {
        stripeAccount: creatorAccountId,
      }
    );

    return {
      success: true,
      sessionId: session.id,
      url: session.url,
    };
  } catch (error: any) {
    console.error("Error creating checkout session:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Cancel member subscription
 */
export async function cancelMemberSubscription(
  subscriptionId: string,
  creatorAccountId: string
) {
  try {
    const subscription = await stripe.subscriptions.cancel(subscriptionId, {
      stripeAccount: creatorAccountId,
    });

    return {
      success: true,
      status: subscription.status,
    };
  } catch (error: any) {
    console.error("Error canceling subscription:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Get subscription details
 */
export async function getSubscription(
  subscriptionId: string,
  creatorAccountId: string
) {
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
      stripeAccount: creatorAccountId,
    });

    return {
      success: true,
      subscription: {
        id: subscription.id,
        status: subscription.status,
        currentPeriodEnd: subscription.current_period_end,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      },
    };
  } catch (error: any) {
    console.error("Error getting subscription:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

// =====================================================
// WEBHOOKS
// =====================================================

/**
 * Construct webhook event from request
 */
export async function constructWebhookEvent(
  payload: string | Buffer,
  signature: string,
  webhookSecret: string
) {
  try {
    const event = stripe.webhooks.constructEvent(
      payload,
      signature,
      webhookSecret
    );

    return {
      success: true,
      event,
    };
  } catch (error: any) {
    console.error("Webhook signature verification failed:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

// =====================================================
// ANALYTICS
// =====================================================

/**
 * Get creator earnings (last 30 days)
 */
export async function getCreatorEarnings(accountId: string) {
  try {
    const now = Math.floor(Date.now() / 1000);
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60;

    const charges = await stripe.charges.list(
      {
        created: {
          gte: thirtyDaysAgo,
        },
        limit: 100,
      },
      {
        stripeAccount: accountId,
      }
    );

    const total = charges.data.reduce((sum, charge) => {
      return sum + (charge.amount - charge.amount_refunded);
    }, 0);

    return {
      success: true,
      earnings: {
        totalCents: total,
        totalUSD: total / 100,
        count: charges.data.length,
      },
    };
  } catch (error: any) {
    console.error("Error getting earnings:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}