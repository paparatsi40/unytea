import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: Request) {
  try {
    const payload = await request.text();
    const signature = headers().get("stripe-signature");

    if (!signature) {
      return NextResponse.json(
        { error: "Missing stripe-signature header" },
        { status: 400 }
      );
    }

    let event;

    try {
      event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (err: any) {
      console.error(`Webhook signature verification failed:`, err.message);
      return NextResponse.json(
        { error: `Webhook Error: ${err.message}` },
        { status: 400 }
      );
    }

    console.log(`🔔 Webhook received: ${event.type}`);

    // Handle the event
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as any;
        
        // Get user ID from metadata
        const userId = session.metadata?.userId;
        const customerId = session.customer;
        const type = session.metadata?.type;
        
        if (!userId) {
          console.error("No userId found in session metadata");
          break;
        }

        // If this is a community membership checkout, the membership
        // will be created when the subscription is created (invoice.payment_succeeded)
        console.log(`✅ Checkout completed for user ${userId}, customer ${customerId}, type: ${type || 'platform'}`);
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as any;
        const subscriptionId = invoice.subscription;
        const customerId = invoice.customer;
        
        // Get subscription details from Stripe to check metadata
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const priceId = subscription.items.data[0]?.price.id;
        
        // Check if this is a community membership
        const type = subscription.metadata?.type;
        const communityId = subscription.metadata?.communityId;
        const userId = subscription.metadata?.userId;
        
        if (type === "community_membership" && communityId && userId) {
          // Handle community membership
          // Check if user is already a member
          const existingMember = await prisma.member.findFirst({
            where: {
              userId: userId,
              communityId: communityId,
            },
          });

          if (existingMember) {
            // Update existing member to ACTIVE
            await prisma.member.update({
              where: { id: existingMember.id },
              data: { 
                status: "ACTIVE",
                role: existingMember.role === "PENDING" ? "MEMBER" : existingMember.role,
              },
            });
          } else {
            // Create new member
            await prisma.member.create({
              data: {
                userId: userId,
                communityId: communityId,
                role: "MEMBER",
                status: "ACTIVE",
              },
            });
            
            // Increment member count
            await prisma.community.update({
              where: { id: communityId },
              data: { memberCount: { increment: 1 } },
            });
          }

          console.log(`✅ Community membership created for user ${userId} in community ${communityId}`);
        } else {
          // Handle platform subscription (existing logic)
          // Find existing subscription by stripeCustomerId to get userId
          const existingSubscription = await prisma.subscription.findFirst({
            where: { stripeCustomerId: customerId },
            orderBy: { createdAt: 'desc' },
          });

          // If no existing subscription, we need to get userId from checkout session
          // This should be handled by the checkout.session.completed event first
          if (!existingSubscription) {
            console.error(`No existing subscription found for customer: ${customerId}. User may not have completed checkout yet.`);
            break;
          }

          const platformUserId = existingSubscription.userId;

          // Find subscription plan by stripePriceId
          const plan = await prisma.subscriptionPlan.findFirst({
            where: { stripePriceId: priceId },
          });

          if (!plan) {
            console.error(`No subscription plan found with price ID: ${priceId}`);
            break;
          }

          // Update or create subscription in database
          await prisma.subscription.upsert({
            where: {
              stripeSubscriptionId: subscriptionId,
            },
            create: {
              userId: platformUserId,
              planId: plan.id,
              stripeSubscriptionId: subscriptionId,
              stripeCustomerId: customerId,
              status: "ACTIVE",
              currentPeriodStart: new Date(subscription.current_period_start * 1000),
              currentPeriodEnd: new Date(subscription.current_period_end * 1000),
              cancelAtPeriodEnd: subscription.cancel_at_period_end,
            },
            update: {
              status: "ACTIVE",
              currentPeriodStart: new Date(subscription.current_period_start * 1000),
              currentPeriodEnd: new Date(subscription.current_period_end * 1000),
              cancelAtPeriodEnd: subscription.cancel_at_period_end,
            },
          });

          console.log(`✅ Platform subscription ${subscriptionId} updated for user ${platformUserId}`);
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as any;
        const subscriptionId = invoice.subscription;
        
        if (subscriptionId) {
          await prisma.subscription.updateMany({
            where: { stripeSubscriptionId: subscriptionId },
            data: { status: "PAST_DUE" },
          });
        }

        console.log(`⚠️ Payment failed for subscription ${subscriptionId}`);
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as any;
        const subscriptionId = subscription.id;
        
        await prisma.subscription.updateMany({
          where: { stripeSubscriptionId: subscriptionId },
          data: {
            status: subscription.status.toUpperCase(),
            currentPeriodStart: new Date(subscription.current_period_start * 1000),
            currentPeriodEnd: new Date(subscription.current_period_end * 1000),
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
            canceledAt: subscription.canceled_at 
              ? new Date(subscription.canceled_at * 1000) 
              : null,
          },
        });

        console.log(`✅ Subscription ${subscriptionId} updated`);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as any;
        const subscriptionId = subscription.id;
        
        await prisma.subscription.updateMany({
          where: { stripeSubscriptionId: subscriptionId },
          data: { 
            status: "CANCELED",
            cancelAtPeriodEnd: true,
          },
        });

        console.log(`❌ Subscription ${subscriptionId} canceled`);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
