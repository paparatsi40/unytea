import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { BillingInterval } from "@prisma/client";

// This is a temporary endpoint to seed subscription plans
// Should be removed after use or protected in production
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const results = [];

    // Find or create a system community for subscription plans
    let systemCommunity = await prisma.community.findFirst({
      where: { slug: "system-plans" },
    });

    if (!systemCommunity) {
      // Find any user to be the owner
      const firstUser = await prisma.user.findFirst();

      if (!firstUser) {
        return NextResponse.json(
          { error: "No users found. Please create a user first." },
          { status: 400 }
        );
      }

      systemCommunity = await prisma.community.create({
        data: {
          name: "System Plans",
          slug: "system-plans",
          description: "System community for managing subscription plans",
          ownerId: firstUser.id,
          isPrivate: true,
        },
      });
      results.push(`Created system community: ${systemCommunity.id}`);
    } else {
      results.push(`System community already exists: ${systemCommunity.id}`);
    }

    const plans = [
      {
        name: "Free",
        description: "For individuals getting started",
        price: 0,
        interval: BillingInterval.MONTHLY,
        features: [
          "Join up to 3 communities",
          "Basic profile features",
          "Community feed access",
          "Direct messaging",
        ],
        stripePriceId: "",
      },
      {
        name: "Professional",
        description: "For community creators - Best value",
        price: 4900,
        interval: BillingInterval.MONTHLY,
        features: [
          "1 community",
          "Unlimited members",
          "All features",
          "Priority support",
          "Custom domain",
          "Analytics dashboard",
          "Video calls",
          "AI assistance",
        ],
        stripePriceId:
          process.env.NEXT_PUBLIC_STRIPE_PROFESSIONAL_PRICE_ID ||
          "price_professional_placeholder",
      },
      {
        name: "Premium",
        description: "For power users with multiple communities",
        price: 14900,
        interval: BillingInterval.MONTHLY,
        features: [
          "3 communities",
          "Unlimited members",
          "White-label options",
          "Advanced analytics",
          "API access",
          "Dedicated support",
          "All Professional features",
        ],
        stripePriceId:
          process.env.NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID ||
          "price_premium_placeholder",
      },
    ];

    for (const plan of plans) {
      const existingPlan = await prisma.subscriptionPlan.findFirst({
        where: { name: plan.name },
      });

      if (existingPlan) {
        results.push(`Plan "${plan.name}" already exists, skipping`);
        continue;
      }

      await prisma.subscriptionPlan.create({
        data: {
          name: plan.name,
          description: plan.description,
          price: plan.price,
          interval: plan.interval,
          features: plan.features,
          stripePriceId: plan.stripePriceId || null,
          communityId: systemCommunity.id,
        },
      });

      results.push(
        `Created plan: ${plan.name} ($${(plan.price / 100).toFixed(2)}`
      );
    }

    return NextResponse.json({
      success: true,
      message: "Subscription plans seeded successfully",
      results,
    });
  } catch (error) {
    console.error("Error seeding plans:", error);
    return NextResponse.json(
      { error: "Failed to seed subscription plans", details: String(error) },
      { status: 500 }
    );
  }
}
