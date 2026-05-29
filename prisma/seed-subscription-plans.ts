/**
 * Seed script for subscription plans
 * Run with: npx ts-node prisma/seed-subscription-plans.ts
 */

import { PrismaClient, BillingInterval } from "@prisma/client";

const prisma = new PrismaClient();

const plans = [
  // Monthly variants
  {
    name: "Creator",
    description: "Para creators emergentes lanzando su primera comunidad",
    price: 1500, // $15.00 in cents
    currency: "USD",
    interval: BillingInterval.MONTHLY,
    features: [
      "Comunidad ilimitada de members",
      "Live sessions con hasta 100 participantes concurrentes",
      "Cursos pagados",
      "Comisión 8% sobre membresías de members",
      "14 días free trial (sin tarjeta)",
    ],
    stripePriceId:
      process.env.NEXT_PUBLIC_STRIPE_CREATOR_PRICE_ID || "price_creator_monthly_placeholder",
    communityId: "",
  },
  {
    name: "Business",
    description: "Para hosts establecidos creciendo su comunidad",
    price: 4900, // $49.00 in cents
    currency: "USD",
    interval: BillingInterval.MONTHLY,
    features: [
      "Todo lo de Creator",
      "Live sessions con hasta 300 participantes concurrentes",
      "Dominio custom",
      "Analytics avanzados",
      "Hasta 5 admins",
      "Comisión 5% sobre membresías de members",
    ],
    stripePriceId:
      process.env.NEXT_PUBLIC_STRIPE_BUSINESS_PRICE_ID || "price_business_monthly_placeholder",
    communityId: "",
  },
  {
    name: "Pro",
    description: "Para teams scaling múltiples comunidades",
    price: 14900, // $149.00 in cents
    currency: "USD",
    interval: BillingInterval.MONTHLY,
    features: [
      "Todo lo de Business",
      "Live sessions con hasta 1000 participantes concurrentes",
      "White-label experience",
      "API access",
      "Admins ilimitados",
      "Comisión 3% sobre membresías de members",
    ],
    stripePriceId:
      process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID || "price_pro_monthly_placeholder",
    communityId: "",
  },
  // Annual variants (16% discount = 2 months free)
  {
    name: "Creator Annual",
    description: "Creator plan, anual (ahorra 16%, 2 meses gratis)",
    price: 15000, // $150.00 in cents (vs $180 monthly = $30 saved)
    currency: "USD",
    interval: BillingInterval.YEARLY,
    features: [
      "Mismas features que Creator monthly",
      "Pago anual: $150 (en vez de $180 = $30 de ahorro)",
    ],
    stripePriceId:
      process.env.NEXT_PUBLIC_STRIPE_CREATOR_PRICE_ID_YEARLY ||
      "price_creator_yearly_placeholder",
    communityId: "",
  },
  {
    name: "Business Annual",
    description: "Business plan, anual (ahorra 16%, 2 meses gratis)",
    price: 49000, // $490.00 in cents (vs $588 monthly = $98 saved)
    currency: "USD",
    interval: BillingInterval.YEARLY,
    features: [
      "Mismas features que Business monthly",
      "Pago anual: $490 (en vez de $588 = $98 de ahorro)",
    ],
    stripePriceId:
      process.env.NEXT_PUBLIC_STRIPE_BUSINESS_PRICE_ID_YEARLY ||
      "price_business_yearly_placeholder",
    communityId: "",
  },
  {
    name: "Pro Annual",
    description: "Pro plan, anual (ahorra 16%, 2 meses gratis)",
    price: 149000, // $1,490.00 in cents (vs $1,788 monthly = $298 saved)
    currency: "USD",
    interval: BillingInterval.YEARLY,
    features: [
      "Mismas features que Pro monthly",
      "Pago anual: $1,490 (en vez de $1,788 = $298 de ahorro)",
    ],
    stripePriceId:
      process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID_YEARLY || "price_pro_yearly_placeholder",
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

    console.log(
      `✅ Created plan: ${plan.name} ($${(plan.price / 100).toFixed(2)}/${plan.interval})`
    );
  }

  // Cleanup: deactivate legacy Start plan
  const startPlan = await prisma.subscriptionPlan.findFirst({
    where: { name: "Start" },
  });
  if (startPlan) {
    await prisma.subscriptionPlan.update({
      where: { id: startPlan.id },
      data: { isActive: false },
    });
    console.log("🔻 Deactivated legacy Start plan (kept for historical reference)");
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
