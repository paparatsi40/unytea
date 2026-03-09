import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";

/**
 * Get Stripe Connect account status
 * GET /api/stripe/connect/status
 */
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { stripeConnectAccountId: true },
    });

    if (!user?.stripeConnectAccountId) {
      return NextResponse.json({
        isConnected: false,
        status: "not_connected",
      });
    }

    // Check account status with Stripe
    const account = await stripe.accounts.retrieve(
      user.stripeConnectAccountId
    );

    const isActive =
      account.capabilities?.card_payments === "active" &&
      account.capabilities?.transfers === "active";

    return NextResponse.json({
      isConnected: true,
      status: isActive ? "active" : "pending",
      accountId: user.stripeConnectAccountId,
      requirements: account.requirements,
    });
  } catch (error) {
    console.error("Error checking Stripe Connect status:", error);
    return NextResponse.json(
      { error: "Failed to check status" },
      { status: 500 }
    );
  }
}
