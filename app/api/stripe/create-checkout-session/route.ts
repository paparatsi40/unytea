import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { stripe } from "@/lib/stripe-connect";
import { prisma } from "@/lib/prisma";

/**
 * Create Stripe Checkout Session for Subscription Plans
 * POST /api/stripe/create-checkout-session
 */
export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { priceId, planName } = await request.json();

    if (!priceId || !planName) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { email: true, stripeCustomerId: true },
    });

    if (!user?.email) {
      return NextResponse.json(
        { error: "User email not found" },
        { status: 400 }
      );
    }

    // Create or retrieve Stripe customer
    let customerId = user.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          userId: session.user.id,
        },
      });
      customerId = customer.id;

      // Update user with customer ID
      await prisma.user.update({
        where: { id: session.user.id },
        data: { stripeCustomerId: customerId },
      });
    }

    // Create checkout session
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/dashboard/settings/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/dashboard/upgrade?canceled=true`,
      metadata: {
        userId: session.user.id,
        planName,
      },
      subscription_data: {
        metadata: {
          userId: session.user.id,
          planName,
        },
      },
    });

    return NextResponse.json({
      sessionId: checkoutSession.id,
      url: checkoutSession.url,
    });
  } catch (error: any) {
    console.error("Error creating checkout session:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create checkout session" },
      { status: 500 }
    );
  }
}