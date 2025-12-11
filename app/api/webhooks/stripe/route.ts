import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { constructWebhookEvent } from "@/lib/stripe-connect";

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const headersList = await headers();
    const signature = headersList.get("stripe-signature");

    if (!signature) {
      console.error("❌ No Stripe signature found");
      return NextResponse.json(
        { error: "No signature" },
        { status: 400 }
      );
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error("❌ No webhook secret configured");
      return NextResponse.json(
        { error: "Webhook secret not configured" },
        { status: 500 }
      );
    }

    // Verify webhook signature
    const result = await constructWebhookEvent(body, signature, webhookSecret);

    if (!result.success || !result.event) {
      console.error("❌ Webhook verification failed:", result.error);
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 400 }
      );
    }

    const event = result.event;
    console.log("✅ Webhook received:", event.type);

    // Handle different event types
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object);
        break;

      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object);
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object);
        break;

      case "invoice.payment_succeeded":
        await handlePaymentSucceeded(event.data.object);
        break;

      case "invoice.payment_failed":
        await handlePaymentFailed(event.data.object);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("Error processing webhook:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

// =====================================================
// EVENT HANDLERS
// =====================================================

async function handleCheckoutCompleted(session: any) {
  console.log("💳 Checkout completed:", session.id);

  try {
    // Check if this is a community membership or platform subscription
    const communityId = session.metadata?.communityId;
    const userId = session.metadata?.userId;
    const planName = session.metadata?.planName;

    // PLATFORM SUBSCRIPTION (Professional, Scale, Enterprise)
    if (userId && planName && !communityId) {
      console.log("📦 Platform subscription checkout:", planName);
      await handlePlatformSubscriptionCreated(session, userId, planName);
      return;
    }

    // COMMUNITY MEMBERSHIP
    if (communityId) {
      console.log("👥 Community membership checkout");
      await handleCommunityMembershipCreated(session, communityId);
      return;
    }

    console.error("Unknown checkout type - no communityId or planName in metadata");
  } catch (error) {
    console.error("Error handling checkout completed:", error);
  }
}

async function handlePlatformSubscriptionCreated(
  session: any,
  userId: string,
  planName: string
) {
  try {
    const subscriptionId = session.subscription;
    const customerId = session.customer;

    if (!subscriptionId) {
      console.error("No subscription ID in session");
      return;
    }

    // Update user with subscription info
    await prisma.user.update({
      where: { id: userId },
      data: {
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId,
        subscriptionPlan: planName.toUpperCase(), // PROFESSIONAL, SCALE, ENTERPRISE
        subscriptionStatus: "ACTIVE",
        subscriptionEndsAt: null,
        // Initialize billing cycle
        billingCycleStart: new Date(),
        billingCycleEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        // Reset usage counters
        currentVideoMinutes: 0,
        currentMemberCount: 0,
        usageAlertSent: false,
      },
    });

    console.log("✅ Platform subscription activated:", {
      userId,
      plan: planName,
      subscriptionId,
    });
  } catch (error) {
    console.error("Error creating platform subscription:", error);
  }
}

async function handleCommunityMembershipCreated(
  session: any,
  communityId: string
) {
  try {
    const customerEmail = session.customer_details?.email;

    if (!customerEmail) {
      console.error("Missing email in session");
      return;
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: customerEmail },
    });

    if (!user) {
      console.error("User not found:", customerEmail);
      return;
    }

    // Check if already member
    const existingMember = await prisma.member.findUnique({
      where: {
        userId_communityId: {
          communityId,
          userId: user.id,
        },
      },
    });

    if (existingMember) {
      console.log("User already a member, updating subscription status");
      await handleCommunitySubscriptionUpdated(session, user.id, communityId);
      return;
    }

    // Add user as member
    await prisma.member.create({
      data: {
        communityId,
        userId: user.id,
        role: "MEMBER",
      },
    });

    // Create subscription record
    await handleCommunitySubscriptionUpdated(session, user.id, communityId);

    console.log("✅ User added to community:", {
      userId: user.id,
      communityId,
    });
  } catch (error) {
    console.error("Error handling community membership:", error);
  }
}

async function handleCommunitySubscriptionUpdated(
  session: any,
  userId: string,
  communityId: string
) {
  try {
    const subscriptionId = session.subscription;
    const customerId = session.customer;
    const priceId = session.line_items?.data[0]?.price?.id;

    if (!subscriptionId) {
      console.error("No subscription ID in session");
      return;
    }

    // Create or update subscription record
    await prisma.membershipSubscription.upsert({
      where: {
        userId_communityId: {
          communityId,
          userId,
        },
      },
      create: {
        communityId,
        userId,
        stripeSubscriptionId: subscriptionId,
        stripeCustomerId: customerId,
        stripePriceId: priceId || "",
        status: "active",
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
      update: {
        stripeSubscriptionId: subscriptionId,
        stripeCustomerId: customerId,
        stripePriceId: priceId || "",
        status: "active",
        canceledAt: null,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    console.log("✅ Community subscription record created/updated");
  } catch (error) {
    console.error("Error updating community subscription:", error);
  }
}

async function handleSubscriptionUpdated(subscription: any) {
  console.log("🔄 Subscription updated:", subscription.id);

  try {
    const stripeSubscriptionId = subscription.id;
    const status = subscription.status;
    const customerId = subscription.customer;

    // Try to update platform subscription first
    const user = await prisma.user.findFirst({
      where: { stripeSubscriptionId },
    });

    if (user) {
      // Platform subscription
      await prisma.user.update({
        where: { id: user.id },
        data: { 
          subscriptionStatus: status.toUpperCase(),
        },
      });
      console.log("✅ Platform subscription status updated:", status);
      return;
    }

    // Try community subscription
    await prisma.membershipSubscription.updateMany({
      where: { stripeSubscriptionId },
      data: { status },
    });

    console.log("✅ Community subscription status updated:", status);
  } catch (error) {
    console.error("Error updating subscription:", error);
  }
}

async function handleSubscriptionDeleted(subscription: any) {
  console.log("❌ Subscription deleted:", subscription.id);

  try {
    const stripeSubscriptionId = subscription.id;
    const canceledAt = new Date();

    // Try platform subscription first
    const user = await prisma.user.findFirst({
      where: { stripeSubscriptionId },
    });

    if (user) {
      // Platform subscription canceled
      await prisma.user.update({
        where: { id: user.id },
        data: {
          subscriptionStatus: "CANCELED",
          subscriptionEndsAt: canceledAt,
        },
      });
      console.log("✅ Platform subscription marked as canceled");
      return;
    }

    // Try community subscription
    const membershipSub = await prisma.membershipSubscription.findFirst({
      where: { stripeSubscriptionId },
    });

    if (!membershipSub) {
      console.error("Subscription not found");
      return;
    }

    // Update status
    await prisma.membershipSubscription.update({
      where: {
        userId_communityId: {
          communityId: membershipSub.communityId,
          userId: membershipSub.userId,
        },
      },
      data: {
        status: "canceled",
        canceledAt,
      },
    });

    console.log("✅ Community subscription marked as canceled");
  } catch (error) {
    console.error("Error handling subscription deletion:", error);
  }
}

async function handlePaymentSucceeded(invoice: any) {
  console.log("💰 Payment succeeded:", invoice.id);

  try {
    const subscriptionId = invoice.subscription;

    if (!subscriptionId) {
      console.log("No subscription ID, skipping");
      return;
    }

    // Try platform subscription first
    const user = await prisma.user.findFirst({
      where: { stripeSubscriptionId: subscriptionId },
    });

    if (user) {
      await prisma.user.update({
        where: { id: user.id },
        data: { subscriptionStatus: "ACTIVE" },
      });
      console.log("✅ Platform payment processed, subscription active");
      return;
    }

    // Update community subscription status to active
    await prisma.membershipSubscription.updateMany({
      where: { stripeSubscriptionId: subscriptionId },
      data: { status: "active" },
    });

    console.log("✅ Community payment processed, subscription active");
  } catch (error) {
    console.error("Error handling payment succeeded:", error);
  }
}

async function handlePaymentFailed(invoice: any) {
  console.log("❌ Payment failed:", invoice.id);

  try {
    const subscriptionId = invoice.subscription;

    if (!subscriptionId) {
      console.log("No subscription ID, skipping");
      return;
    }

    // Try platform subscription first
    const user = await prisma.user.findFirst({
      where: { stripeSubscriptionId: subscriptionId },
    });

    if (user) {
      await prisma.user.update({
        where: { id: user.id },
        data: { subscriptionStatus: "PAST_DUE" },
      });
      console.log("⚠️ Platform payment failed, subscription marked past_due");
      return;
    }

    // Update community subscription status to past_due
    await prisma.membershipSubscription.updateMany({
      where: { stripeSubscriptionId: subscriptionId },
      data: { status: "past_due" },
    });

    console.log("⚠️ Community payment failed, subscription marked past_due");

    // TODO: Send notification to user about failed payment
  } catch (error) {
    console.error("Error handling payment failed:", error);
  }
}