import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createStripeCustomerPortal } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get user's Stripe customer ID from their subscription
    const subscription = await prisma.subscription.findFirst({
      where: { 
        userId: session.user.id,
        stripeCustomerId: { not: null }
      },
      orderBy: { createdAt: 'desc' },
      select: { stripeCustomerId: true },
    });

    if (!subscription?.stripeCustomerId) {
      return NextResponse.json(
        { error: "No Stripe customer found" },
        { status: 400 }
      );
    }

    // Create portal session
    const portalSession = await createStripeCustomerPortal({
      customerId: subscription.stripeCustomerId,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (error) {
    console.error("Error creating portal session:", error);
    return NextResponse.json(
      { error: "Failed to create billing portal" },
      { status: 500 }
    );
  }
}
