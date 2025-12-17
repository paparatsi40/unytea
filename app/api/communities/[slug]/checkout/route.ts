import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

/**
 * POST /api/communities/[slug]/checkout
 * Create Stripe Checkout Session for paid community membership
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await auth();
    const { slug } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get community
    const community = await prisma.community.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        isPaid: true,
        membershipPrice: true,
        stripePriceId: true,
        stripeProductId: true,
        ownerId: true,
        owner: {
          select: {
            stripeConnectAccountId: true,
          },
        },
      },
    });

    if (!community) {
      return NextResponse.json({ error: "Community not found" }, { status: 404 });
    }

    if (!community.isPaid) {
      return NextResponse.json(
        { error: "This community is not paid" },
        { status: 400 }
      );
    }

    if (!community.membershipPrice) {
      return NextResponse.json(
        { error: "Community price not set" },
        { status: 400 }
      );
    }

    // Check if user is already a member
    const existingMembership = await prisma.member.findFirst({
      where: {
        communityId: community.id,
        userId: session.user.id,
      },
    });

    if (existingMembership) {
      return NextResponse.json(
        { error: "You are already a member" },
        { status: 400 }
      );
    }

    // Get or create Stripe customer
    let customerId = session.user.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: session.user.email!,
        name: session.user.name || undefined,
        metadata: {
          userId: session.user.id,
        },
      });

      customerId = customer.id;

      // Update user with Stripe customer ID
      await prisma.user.update({
        where: { id: session.user.id },
        data: { stripeCustomerId: customerId },
      });
    }

    // Get locale from request
    const locale = req.nextUrl.searchParams.get("locale") || "en";

    // Create Stripe Checkout Session
    let checkoutSession;

    if (community.stripePriceId) {
      // Use existing Stripe Price
      const sessionConfig: any = {
        customer: customerId,
        line_items: [
          {
            price: community.stripePriceId,
            quantity: 1,
          },
        ],
        mode: "subscription",
        success_url: `${req.nextUrl.origin}/${locale}/dashboard/communities/${slug}?payment=success`,
        cancel_url: `${req.nextUrl.origin}/${locale}/dashboard/communities/${slug}?payment=cancelled`,
        metadata: {
          communityId: community.id,
          userId: session.user.id,
          type: "community_membership",
        },
        subscription_data: {
          metadata: {
            communityId: community.id,
            userId: session.user.id,
          },
        },
      };

      // If community owner has Stripe Connect, use application fee
      if (community.owner.stripeConnectAccountId) {
        sessionConfig.payment_intent_data = {
          application_fee_amount: Math.round(community.membershipPrice * 100 * 0.1), // 10% platform fee
          transfer_data: {
            destination: community.owner.stripeConnectAccountId,
          },
        };
      }

      checkoutSession = await stripe.checkout.sessions.create(sessionConfig);
    } else {
      // Create price inline (fallback if Stripe product doesn't exist)
      checkoutSession = await stripe.checkout.sessions.create({
        customer: customerId,
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: `${community.name} Membership`,
                description: `Monthly membership to ${community.name}`,
              },
              recurring: {
                interval: "month",
              },
              unit_amount: Math.round(community.membershipPrice * 100), // Convert to cents
            },
            quantity: 1,
          },
        ],
        mode: "subscription",
        success_url: `${req.nextUrl.origin}/${locale}/dashboard/communities/${slug}?payment=success`,
        cancel_url: `${req.nextUrl.origin}/${locale}/dashboard/communities/${slug}?payment=cancelled`,
        metadata: {
          communityId: community.id,
          userId: session.user.id,
          type: "community_membership",
        },
        subscription_data: {
          metadata: {
            communityId: community.id,
            userId: session.user.id,
          },
        },
      });
    }

    return NextResponse.json({
      success: true,
      checkoutUrl: checkoutSession.url,
      sessionId: checkoutSession.id,
    });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}