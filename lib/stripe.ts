import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-02-24.acacia",
  typescript: true,
});

/**
 * Checks if the Stripe customer has any prior subscription history.
 * Used to gate trial eligibility — new customers get 14-day trial,
 * returning customers (upgrades, re-activations) do NOT get fresh trial.
 *
 * Note: this is the simple v1 check. The PD V1 §6 re-trial goodwill
 * policy (7-day re-trial for hosts returning after 30+ days lapse)
 * is implemented separately in the webhook handler (Commit 4).
 */
export const hasPriorSubscription = async (customerId: string): Promise<boolean> => {
  const subs = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 1,
  });
  return subs.data.length > 0;
};

export const getStripeSession = async ({
  priceId,
  userId,
  userEmail,
  userName,
  applyTrial,
}: {
  priceId: string;
  userId: string;
  userEmail: string;
  userName?: string | null;
  /** Explicit override. If undefined, eligibility is auto-detected via hasPriorSubscription. */
  applyTrial?: boolean;
}) => {
  // Resolve (or create) the Stripe customer up front so we can:
  //   1. Reference it by id on the Checkout Session (instead of customer_email),
  //      which keeps the resulting subscription linked to the same Customer
  //      across upgrades and re-activations.
  //   2. Auto-detect trial eligibility from prior subscription history.
  const customer = await getOrCreateStripeCustomer({
    userId,
    email: userEmail,
    name: userName,
  });

  const shouldApplyTrial = applyTrial ?? !(await hasPriorSubscription(customer.id));

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: "subscription",
    billing_address_collection: "auto",
    customer: customer.id,
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/billing?success=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/upgrade?canceled=true`,
    metadata: {
      userId,
    },
    subscription_data: {
      metadata: {
        userId,
      },
    },
  };

  // Apply trial mechanics per PD V1 §6 (decided 2026-05-28):
  //   - 14-day trial, no payment method required at checkout.
  //   - At day 14, if no payment method, PAUSE the subscription. Status
  //     becomes 'paused' → webhook toggles Community.paywallLocked=true.
  //     Host can re-enable any time by adding payment via the Stripe
  //     Customer Portal; Stripe auto-resumes → webhook toggles
  //     paywallLocked=false.
  if (shouldApplyTrial) {
    sessionParams.payment_method_collection = "if_required";
    sessionParams.subscription_data = {
      ...sessionParams.subscription_data,
      trial_period_days: 14,
      trial_settings: {
        end_behavior: {
          missing_payment_method: "pause",
        },
      },
    };
  }

  const session = await stripe.checkout.sessions.create(sessionParams);
  return session;
};

export const createStripeCustomerPortal = async ({ customerId }: { customerId: string }) => {
  const portalSession = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/billing`,
  });

  return portalSession;
};

export const getOrCreateStripeCustomer = async ({
  userId,
  email,
  name,
}: {
  userId: string;
  email: string;
  name?: string | null;
}) => {
  // Buscar cliente existente por metadata
  const customers = await stripe.customers.list({
    limit: 1,
  });

  const existingCustomer = customers.data.find((customer) => customer.metadata?.userId === userId);

  if (existingCustomer) {
    return existingCustomer;
  }

  // Crear nuevo cliente
  const customer = await stripe.customers.create({
    email,
    name: name || undefined,
    metadata: {
      userId,
    },
  });

  return customer;
};
