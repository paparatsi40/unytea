/**
 * Seed script for subscription plans
 * Run with: npx ts-node prisma/seed-subscription-plans.ts
 */

import { PrismaClient, BillingInterval } from "@prisma/client";

const prisma = new PrismaClient();

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
    stripePriceId: "", // Free plan doesn't need a Stripe price
    maxCommunities: 3,
    maxMembersPerCommunity: 50,
  },
  {
    name: "Professional",
    description: "For community creators - Best value",
    price: 4900, // $49.00 in cents
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
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PROFESSIONAL_PRICE_ID || "price_professional_placeholder",
    maxCommunities: 1,
    maxMembersPerCommunity: null, // Unlimited
  },
  {
    name: "Premium",
    description: "For power users with multiple communities",
    price: 14900, // $149.00 in cents
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
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID || "price_premium_placeholder",
    maxCommunities: 3,
    maxMembersPerCommunity: null, // Unlimited
  },
];

async function main() {
  console.log("🌱 Seeding subscription plans...\n");

  for (const plan of plans) {
    const existingPlan = await prisma.subscriptionPlan.findFirst({
      where: { name: plan.name },
    });

    if (existingPlan) {
      console.log(`⏭️  Plan "${plan.name}" already exists, skipping...`);
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
        maxCommunities: plan.maxCommunities,
        maxMembersPerCommunity: plan.maxMembersPerCommunity,
      },
    });

    console.log(`✅ Created plan: ${plan.name} ($${(plan.price / 100).toFixed(2)}/${plan.interval})`);
  }

  console.log("\n🎉 Subscription plans seeded successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Error seeding plans:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
