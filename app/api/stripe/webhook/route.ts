import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { getPlanFromPriceId } from "@/lib/plans";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

/**
 * Sets paywallLocked state on all communities owned by a given user.
 * Called by webhook handlers when host's platform subscription status
 * changes (paused/canceled → locked; active/trialing → unlocked).
 *
 * Note: only affects communities where userId is the OWNER. Communities
 * where the user is a MEMBER (not owner) are governed by their own
 * host's subscription state, not this user's.
 */
async function setCommunitiesPaywallLocked(userId: string, locked: boolean) {
  const result = await prisma.community.updateMany({
    where: { ownerId: userId },
    data: {
      paywallLocked: locked,
      paywallLockedAt: locked ? new Date() : null,
    },
  });
  console.log(
    `[stripe-webhook] paywallLocked=${locked} for ${result.count} communities of user ${userId}`
  );
  return result.count;
}

/**
 * Maps Stripe subscription status string → Prisma enum string + paywall outcome.
 *
 * Stripe statuses we map:
 *  - active, trialing → unlocked (paying or in-trial host)
 *  - paused, past_due, unpaid, canceled, incomplete_expired → locked
 *  - incomplete → past_due (Prisma has no INCOMPLETE value; treat as past_due
 *    so it shows up as needing attention but doesn't permanently lock)
 */
function mapStripeStatusToPaywall(stripeStatus: string): {
  prismaStatus:
    | "ACTIVE"
    | "PAST_DUE"
    | "CANCELED"
    | "UNPAID"
    | "TRIALING"
    | "PAUSED";
  paywallLocked: boolean;
} {
  const upper = stripeStatus.toUpperCase();
  const lockedStates = ["PAUSED", "PAST_DUE", "UNPAID", "CANCELED", "INCOMPLETE_EXPIRED"];
  const isLocked = lockedStates.includes(upper);
  let prismaStatus: ReturnType<typeof mapStripeStatusToPaywall>["prismaStatus"];
  if (upper === "INCOMPLETE_EXPIRED") {
    prismaStatus = "CANCELED";
  } else if (upper === "INCOMPLETE") {
    prismaStatus = "PAST_DUE";
  } else if (
    upper === "ACTIVE" ||
    upper === "PAST_DUE" ||
    upper === "CANCELED" ||
    upper === "UNPAID" ||
    upper === "TRIALING" ||
    upper === "PAUSED"
  ) {
    prismaStatus = upper;
  } else {
    // Unknown Stripe status — log and default to PAST_DUE for safety
    console.warn(`[stripe-webhook] Unknown Stripe status "${stripeStatus}", defaulting to PAST_DUE`);
    prismaStatus = "PAST_DUE";
  }
  return { prismaStatus, paywallLocked: isLocked };
}

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
              // Payment received — unlock communities if they were paywalled.
              // Covers the case where host re-added a payment method after a
              // trial-end pause, or after a past_due lapse.
              await setCommunitiesPaywallLocked(resolvedUserId, false);
              console.log(
                `[stripe-webhook] Platform plan updated: user ${resolvedUserId} → ${platformPlan} + paywall unlocked`
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

          // Payment method declined — lock communities until host updates payment.
          const subRecord = await prisma.subscription.findFirst({
            where: { stripeSubscriptionId: subscriptionId },
            select: { userId: true },
          });
          if (subRecord?.userId) {
            await setCommunitiesPaywallLocked(subRecord.userId, true);
          }
        }

        console.log(`Payment failed for subscription ${subscriptionId}, communities locked`);
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as any;
        const subscriptionId = subscription.id;

        const { prismaStatus, paywallLocked } = mapStripeStatusToPaywall(subscription.status);

        await prisma.subscription.updateMany({
          where: { stripeSubscriptionId: subscriptionId },
          data: {
            status: prismaStatus,
            currentPeriodStart: new Date(subscription.current_period_start * 1000),
            currentPeriodEnd: new Date(subscription.current_period_end * 1000),
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
            canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
          },
        });

        // Only platform subscriptions toggle paywall. Community-membership
        // subscriptions have communityId in metadata; platform subs don't.
        const isPlatformSub = !subscription.metadata?.communityId;
        if (isPlatformSub) {
          const subRecord = await prisma.subscription.findFirst({
            where: { stripeSubscriptionId: subscriptionId },
            select: { userId: true },
          });
          if (subRecord?.userId) {
            await setCommunitiesPaywallLocked(subRecord.userId, paywallLocked);
          }
        }

        console.log(
          `[stripe-webhook] Subscription ${subscriptionId} → ${prismaStatus} (paywall=${paywallLocked})`
        );
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
            // Plan canceled — lock all owned communities. Host can resubscribe
            // any time to unlock; meanwhile data is preserved.
            await setCommunitiesPaywallLocked(subRecord.userId, true);
            console.log(
              `[stripe-webhook] Plan cancelled, user ${subRecord.userId} → START + paywall locked`
            );
          }
        }
        // ────────────────────────────────────────────────────────────────

        console.log(`Subscription ${subscriptionId} canceled`);
        break;
      }

      case "customer.subscription.trial_will_end": {
        const subscription = event.data.object as any;
        const subscriptionId = subscription.id;
        const trialEnd = subscription.trial_end
          ? new Date(subscription.trial_end * 1000)
          : null;

        // Fires ~3 days before trial ends (Stripe-native).
        // For our 14-day trial, that's day 11.
        // TODO (Commit 7 or follow-up): trigger email reminder to host with payment-add CTA.
        // For now, log only — email infrastructure exists (Resend) but the template +
        // send logic is out of scope for this commit.
        const subRecord = await prisma.subscription.findFirst({
          where: { stripeSubscriptionId: subscriptionId },
          select: { userId: true },
        });

        if (subRecord?.userId) {
          // Subscription model has no `user` relation declared, so look up the
          // host's email separately for the log entry / future email-send hook.
          const host = await prisma.user.findUnique({
            where: { id: subRecord.userId },
            select: { email: true, name: true },
          });
          console.log(
            `[stripe-webhook] TRIAL_WILL_END fired for user ${subRecord.userId} ` +
              `(${host?.email}), trial ends ${trialEnd?.toISOString()}. ` +
              `Email reminder TODO.`
          );
        }
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
