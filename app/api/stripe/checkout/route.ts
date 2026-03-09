import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { stripe, getStripeSession, getOrCreateStripeCustomer } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const session = await auth();
    
    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { priceId } = await request.json();

    if (!priceId) {
      return NextResponse.json(
        { error: "Price ID is required" },
        { status: 400 }
      );
    }

    // Get or create Stripe customer
    const customer = await getOrCreateStripeCustomer({
      userId: session.user.id,
      email: session.user.email,
      name: session.user.name,
    });

    // Create checkout session
    const checkoutSession = await getStripeSession({
      priceId,
      userId: session.user.id,
      userEmail: session.user.email,
      userName: session.user.name,
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
