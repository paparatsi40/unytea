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
        
        if (!userId) {
          console.error("No userId found in session metadata");
          break;
        }

        // Update user with stripe customer ID
        await prisma.user.update({
          where: { id: userId },
          data: {
            stripeCustomerId: customerId,
          },
        });

        console.log(`✅ Updated user ${userId} with Stripe customer ID ${customerId}`);
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as any;
        const subscriptionId = invoice.subscription;
        const customerId = invoice.customer;
        
        // Find user by stripe customer ID
        const user = await prisma.user.findFirst({
          where: { stripeCustomerId: customerId },
        });

        if (!user) {
          console.error(`No user found with Stripe customer ID: ${customerId}`);
          break;
        }

        // Get subscription details from Stripe
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        
        // Get price ID from subscription
        const priceId = subscription.items.data[0]?.price.id;
        
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
            userId: user.id,
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

        console.log(`✅ Subscription ${subscriptionId} updated for user ${user.id}`);
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
