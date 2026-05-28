import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { getPlanFromPriceId } from "@/lib/plans";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: Request) {
  try {
    const payload = await request.text();
    const signature = (await headers()).get("stripe-signature");

    if (!signature) {
      return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
    }

    let event;

    try {
      event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (err: any) {
      console.error(`Webhook signature verification failed:`, err.message);
      return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
    }

    try {
      await prisma.processedStripeEvent.create({
        data: { id: event.id, type: event.type },
      });
    } catch (err: any) {
      if (err?.code === "P2002") {
        console.log(`[stripe-webhook] event ${event.id} already processed, skipping`);
        return NextResponse.json({ received: true, duplicate: true });
      }
      console.error(`[stripe-webhook] DB error recording event:`, err);
      return NextResponse.json({ error: "Failed to record event" }, { status: 500 });
    }

    console.log(`Webhook received: ${event.type}`);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as any;
        const userId = session.metadata?.userId;
        const customerId = session.customer;
        const type = session.metadata?.type;

        if (!userId) {
          console.error("No userId found in session metadata");
          break;
        }

        if (type === "course_purchase") {
          const courseId = session.metadata?.courseId;

          if (courseId) {
            await prisma.coursePurchase.updateMany({
              where: { userId, courseId, stripeSessionId: session.id },
              data: { status: "completed" },
            });

            await prisma.enrollment.upsert({
              where: { userId_courseId: { userId, courseId } },
              update: {},
              create: { userId, courseId, progress: 0, enrolledAt: new Date() },
            });

            await prisma.course.update({
              where: { id: courseId },
              data: { enrollmentCount: { increment: 1 } },
            });

            console.log(`Course purchase completed for user ${userId}, course ${courseId}`);
          }
        }

        console.log(
          `Checkout completed for user ${userId}, customer ${customerId}, type: ${type || "platform"}`
        );
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as any;
        const subscriptionId = invoice.subscription;
        const customerId = invoice.customer;

        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const priceId = subscription.items.data[0]?.price.id;

        const type = subscription.metadata?.type;
        const communityId = subscription.metadata?.communityId;
        const userId = subscription.metadata?.userId;

        if (type === "community_membership" && communityId && userId) {
          const existingMember = await prisma.member.findFirst({
            where: { userId, communityId },
          });

          if (existingMember) {
            await prisma.member.update({
              where: { id: existingMember.id },
              data: { status: "ACTIVE" },
            });
          } else {
            await prisma.member.create({
              data: { userId, communityId, role: "MEMBER", status: "ACTIVE" },
            });
            await prisma.community.update({
              where: { id: communityId },
              data: { memberCount: { increment: 1 } },
            });
          }

          console.log(
            `Community membership created for user ${userId} in community ${communityId}`
          );
        } else {
          // ── PLATFORM PLAN CHECK (Creator / Business / Pro) ──────────────
          const platformPlan = getPlanFromPriceId(priceId ?? "");

          if (platformPlan) {
            const resolvedUserId =
              userId ??
              (
                await prisma.subscription.findFirst({
                  where: { stripeCustomerId: customerId },
                  orderBy: { createdAt: "desc" },
                  select: { userId: true },
                })
              )?.userId;

            if (resolvedUserId) {
              await prisma.user.update({
                where: { id: resolvedUserId },
                data: { platformPlan },
              });
              console.log(
                `[stripe-webhook] Platform plan updated: user ${resolvedUserId} → ${platformPlan}`
              );
            } else {
              console.error(
                `[stripe-webhook] Cannot resolve userId for platform plan. Customer: ${customerId}`
              );
            }
            break;
          }
          // ────────────────────────────────────────────────────────────────

          const existingSubscription = await prisma.subscription.findFirst({
            where: { stripeCustomerId: customerId },
            orderBy: { createdAt: "desc" },
          });

          if (!existingSubscription) {
            console.error(`No existing subscription found for customer: ${customerId}.`);
            break;
          }

          const platformUserId = existingSubscription.userId;

          const plan = await prisma.subscriptionPlan.findFirst({
            where: { stripePriceId: priceId },
          });

          if (!plan) {
            console.error(`No subscription plan found with price ID: ${priceId}`);
            break;
          }

          await prisma.subscription.upsert({
            where: { stripeSubscriptionId: subscriptionId },
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

          console.log(`Platform subscription ${subscriptionId} updated for user ${platformUserId}`);
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

        console.log(`Payment failed for subscription ${subscriptionId}`);
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
            canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
          },
        });

        console.log(`Subscription ${subscriptionId} updated`);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as any;
        const subscriptionId = subscription.id;

        await prisma.subscription.updateMany({
          where: { stripeSubscriptionId: subscriptionId },
          data: { status: "CANCELED", cancelAtPeriodEnd: true },
        });

        // ── PLATFORM PLAN: reset to START on cancellation ───────────────
        const cancelledPriceId = subscription.items?.data?.[0]?.price?.id;
        const cancelledPlatformPlan = getPlanFromPriceId(cancelledPriceId ?? "");

        if (cancelledPlatformPlan) {
          const subRecord = await prisma.subscription.findFirst({
            where: { stripeSubscriptionId: subscriptionId },
            select: { userId: true },
          });
          if (subRecord?.userId) {
            await prisma.user.update({
              where: { id: subRecord.userId },
              data: { platformPlan: "START" },
            });
            console.log(`[stripe-webhook] Plan cancelled, user ${subRecord.userId} → START`);
          }
        }
        // ────────────────────────────────────────────────────────────────

        console.log(`Subscription ${subscriptionId} canceled`);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
