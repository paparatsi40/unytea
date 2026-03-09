import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";

/**
 * Create Stripe Connect onboarding link for community owner
 * POST /api/stripe/connect/onboard
 */
export async function POST() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Check if user has a Stripe Connect account
    let user = await prisma.user.findUnique({
      where: { id: userId },
      select: { stripeConnectAccountId: true, email: true },
    });

    // Create Stripe Connect account if doesn't exist
    if (!user?.stripeConnectAccountId) {
      const email = user?.email || session.user.email;
      
      if (!email) {
        return NextResponse.json(
          { error: "User email is required for Stripe Connect" },
          { status: 400 }
        );
      }
      
      const account = await stripe.accounts.create({
        type: "standard",
        email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: "individual",
        metadata: {
          userId: userId,
        },
      });

      // Save Stripe Connect account ID to user
      await prisma.user.update({
        where: { id: userId },
        data: { stripeConnectAccountId: account.id },
      });

      // Re-fetch user to get updated data with proper types
      user = await prisma.user.findUnique({
        where: { id: userId },
        select: { stripeConnectAccountId: true, email: true },
      });
    }

    // Ensure user has Stripe Connect account
    if (!user?.stripeConnectAccountId) {
      return NextResponse.json(
        { error: "Failed to retrieve Stripe Connect account" },
        { status: 500 }
      );
    }

    // Create onboarding link
    const accountLink = await stripe.accountLinks.create({
      account: user.stripeConnectAccountId,
      refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/payments?step=onboarding`,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/payments?step=complete`,
      type: "account_onboarding",
    });

    return NextResponse.json({
      url: accountLink.url,
      accountId: user.stripeConnectAccountId,
    });
  } catch (error) {
    console.error("Error creating Stripe Connect onboarding:", error);
    return NextResponse.json(
      { error: "Failed to create onboarding link" },
      { status: 500 }
    );
  }
}
