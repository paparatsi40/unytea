/**
 * Seed script for subscription plans
 * Run with: npx ts-node prisma/seed-subscription-plans.ts
 */

import { PrismaClient, BillingInterval } from "@prisma/client";

const prisma = new PrismaClient();

const plans = [
  {
    name: "Start",
    description: "Perfect for testing",
    price: 0,
    interval: BillingInterval.MONTHLY,
    features: [
      "1 community",
      "Up to 50 members",
      "Community feed",
      "Simple live sessions",
      "Basic analytics",
      "8% transaction fee",
    ],
    stripePriceId: "", // Free plan doesn't need a Stripe price
    communityId: "",
  },
  {
    name: "Creator",
    description: "Best for launching one community",
    price: 4900,
    interval: BillingInterval.MONTHLY,
    features: [
      "Everything in Start",
      "Unlimited members",
      "Paid community access",
      "Paid course sales",
      "Live sessions + courses",
      "5% transaction fee",
    ],
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_CREATOR_PRICE_ID || "price_creator_placeholder",
    communityId: "",
  },
  {
    name: "Business",
    description: "Best for operators running one community",
    price: 9900,
    interval: BillingInterval.MONTHLY,
    features: [
      "Everything in Creator",
      "Custom domain",
      "Advanced analytics",
      "Up to 5 admins",
      "Session performance tools",
      "2% transaction fee",
    ],
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_BUSINESS_PRICE_ID || "price_business_placeholder",
    communityId: "",
  },
  {
    name: "Pro",
    description: "Best for teams scaling multiple communities",
    price: 19900,
    interval: BillingInterval.MONTHLY,
    features: [
      "Everything in Business",
      "Up to 3 communities",
      "White-label experience",
      "API access",
      "Unlimited admins",
      "0% transaction fee",
    ],
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID || "price_pro_placeholder",
    communityId: "",
  },
];

async function main() {
  console.log("🌱 Seeding subscription plans...\n");

  // Find or create a system community for subscription plans
  let systemCommunity = await prisma.community.findFirst({
    where: { slug: "system-plans" },
  });

  if (!systemCommunity) {
    console.log("🏗️  Creating system community for subscription plans...");
    
    // Find any user to be the owner
    const firstUser = await prisma.user.findFirst();
    
    if (!firstUser) {
      console.error("❌ No users found. Please create a user first.");
      process.exit(1);
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
    console.log(`✅ Created system community: ${systemCommunity.id}`);
  }

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
        communityId: systemCommunity.id,
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
