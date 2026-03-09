import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia",
  typescript: true,
});

export const getStripeSession = async ({
  priceId,
  userId,
  userEmail,
  userName,
}: {
  priceId: string;
  userId: string;
  userEmail: string;
  userName?: string | null;
}) => {
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    billing_address_collection: "auto",
    customer_email: userEmail,
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
  });

  return session;
};

export const createStripeCustomerPortal = async ({
  customerId,
}: {
  customerId: string;
}) => {
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

  const existingCustomer = customers.data.find(
    (customer) => customer.metadata?.userId === userId
  );

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
