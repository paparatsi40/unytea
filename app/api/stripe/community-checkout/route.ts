import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { getOrCreateStripeCustomer } from "@/lib/stripe";

const PLATFORM_FEE_BY_PLAN: Record<string, number> = {
  start: 8,
  creator: 5,
  business: 2,
  pro: 0,
};

async function getPlatformFeePercentForOwner(ownerId: string): Promise<number> {
  const ownerSubscription = await prisma.subscription.findFirst({
    where: {
      userId: ownerId,
      status: { in: ["ACTIVE", "TRIALING"] },
    },
    include: {
      plan: {
        select: { name: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const planName = ownerSubscription?.plan?.name?.toLowerCase()?.trim();
  if (!planName) return 5;

  return PLATFORM_FEE_BY_PLAN[planName] ?? 5;
}

export const dynamic = "force-dynamic";

/**
 * Create checkout session for community membership
 * POST /api/stripe/community-checkout
 * Body: { communityId: string, priceId: string }
 * 
 * Creates a checkout with platform fee (5%) and transfer to community owner (95%)
 */
export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { communityId, priceId } = await req.json();

    if (!communityId || !priceId) {
      return NextResponse.json(
        { error: "Missing communityId or priceId" },
        { status: 400 }
      );
    }

    // Get community details with owner
    const community = await prisma.community.findUnique({
      where: { id: communityId },
      include: {
        owner: true,
        subscriptionPlans: {
          where: { stripePriceId: priceId, isActive: true },
        },
      },
    });

    if (!community) {
      return NextResponse.json(
        { error: "Community not found" },
        { status: 404 }
      );
    }

    if (!community.isPaid) {
      return NextResponse.json(
        { error: "This community is free" },
        { status: 400 }
      );
    }

    // Check if user is already a member
    const existingMembership = await prisma.member.findFirst({
      where: {
        userId: session.user.id,
        communityId: communityId,
        status: "ACTIVE",
      },
    });

    if (existingMembership) {
      return NextResponse.json(
        { error: "Already a member of this community" },
        { status: 400 }
      );
    }

    // Get or create Stripe customer for user
    const customer = await getOrCreateStripeCustomer({
      userId: session.user.id,
      email: session.user.email!,
      name: session.user.name || undefined,
    });

    // Check if community owner has Stripe Connect
    if (!community.owner.stripeConnectAccountId) {
      return NextResponse.json(
        { error: "Community owner not set up for payments" },
        { status: 400 }
      );
    }

    // Calculate platform fee from owner's active plan
    const platformFeePercent = await getPlatformFeePercentForOwner(community.ownerId);

    // Create checkout session with transfer to community owner
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customer.id,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/c/${community.slug}?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/c/${community.slug}?canceled=true`,
      metadata: {
        userId: session.user.id,
        communityId: communityId,
        type: "community_membership",
      },
      subscription_data: {
        metadata: {
          userId: session.user.id,
          communityId: communityId,
          ownerId: community.ownerId,
          type: "community_membership",
        },
        // Transfer net amount to community owner based on active plan fee
        transfer_data: {
          destination: community.owner.stripeConnectAccountId,
          amount_percent: Math.max(0, 100 - platformFeePercent),
        },
        application_fee_percent: platformFeePercent,
      },
    });

    return NextResponse.json({
      url: checkoutSession.url,
      sessionId: checkoutSession.id,
    });
  } catch (error) {
    console.error("Error creating community checkout:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
