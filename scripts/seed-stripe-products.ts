#!/usr/bin/env node
/**
 * Seed Stripe products + prices for Fase C pricing tiers.
 *
 * Usage:
 *   npx tsx scripts/seed-stripe-products.ts          # creates products + prices
 *   npx tsx scripts/seed-stripe-products.ts --verify # verifies env var IDs resolve
 *
 * Requires: STRIPE_SECRET_KEY in env (use test mode key for dev, live for prod).
 *
 * Idempotent: re-running won't duplicate. Outputs the env var lines you
 * need to set in Vercel after creation.
 */

import Stripe from "stripe";

const stripeKey = process.env.STRIPE_SECRET_KEY;
if (!stripeKey) {
  console.error("❌ STRIPE_SECRET_KEY not set in env. Aborting.");
  process.exit(1);
}

// Pinned to the same API version used by lib/stripe.ts so the script and
// runtime checkout flow speak the same Stripe API surface.
const stripe = new Stripe(stripeKey, { apiVersion: "2025-02-24.acacia" });
const isVerify = process.argv.includes("--verify");

const PRODUCTS = [
  {
    name: "Creator",
    description: "Para creators emergentes lanzando su primera comunidad",
    prices: [
      { id: "monthly", amount: 1500, interval: "month" as const },
      { id: "yearly", amount: 15000, interval: "year" as const },
    ],
  },
  {
    name: "Business",
    description: "Para hosts establecidos creciendo su comunidad",
    prices: [
      { id: "monthly", amount: 4900, interval: "month" as const },
      { id: "yearly", amount: 49000, interval: "year" as const },
    ],
  },
  {
    name: "Pro",
    description: "Para teams scaling múltiples comunidades",
    prices: [
      { id: "monthly", amount: 14900, interval: "month" as const },
      { id: "yearly", amount: 149000, interval: "year" as const },
    ],
  },
];

async function ensureProduct(name: string, description: string): Promise<Stripe.Product> {
  const existing = await stripe.products.search({
    query: `name:"${name}" AND active:"true"`,
  });
  if (existing.data.length > 0) {
    console.log(`✓ Product "${name}" already exists: ${existing.data[0].id}`);
    return existing.data[0];
  }
  const product = await stripe.products.create({ name, description });
  console.log(`+ Created product "${name}": ${product.id}`);
  return product;
}

async function ensurePrice(
  productId: string,
  amount: number,
  interval: "month" | "year",
  label: string
): Promise<Stripe.Price> {
  const existing = await stripe.prices.list({
    product: productId,
    active: true,
    limit: 100,
  });
  const match = existing.data.find(
    (p) => p.unit_amount === amount && p.recurring?.interval === interval && p.currency === "usd"
  );
  if (match) {
    console.log(`✓ Price "${label}" already exists: ${match.id}`);
    return match;
  }
  const price = await stripe.prices.create({
    product: productId,
    unit_amount: amount,
    currency: "usd",
    recurring: { interval },
  });
  console.log(`+ Created price "${label}": ${price.id}`);
  return price;
}

async function verifyEnvVars() {
  console.log("\nVerifying env var price IDs resolve...\n");
  const envVars = [
    "NEXT_PUBLIC_STRIPE_CREATOR_PRICE_ID",
    "NEXT_PUBLIC_STRIPE_BUSINESS_PRICE_ID",
    "NEXT_PUBLIC_STRIPE_PRO_PRICE_ID",
    "NEXT_PUBLIC_STRIPE_CREATOR_PRICE_ID_YEARLY",
    "NEXT_PUBLIC_STRIPE_BUSINESS_PRICE_ID_YEARLY",
    "NEXT_PUBLIC_STRIPE_PRO_PRICE_ID_YEARLY",
  ];
  let allValid = true;
  for (const key of envVars) {
    const value = process.env[key];
    if (!value || value.includes("placeholder")) {
      console.log(`  ✗ ${key}: not set or placeholder`);
      allValid = false;
      continue;
    }
    try {
      const price = await stripe.prices.retrieve(value);
      const amount =
        typeof price.unit_amount === "number" ? (price.unit_amount / 100).toFixed(2) : "?";
      console.log(`  ✓ ${key}: ${price.id} ($${amount}/${price.recurring?.interval ?? "?"})`);
    } catch {
      console.log(`  ✗ ${key}: invalid or revoked (${value})`);
      allValid = false;
    }
  }
  if (!allValid) {
    console.error(
      "\n⚠️  Some env vars failed verification. Check Stripe dashboard + Vercel/.env.local config."
    );
    process.exit(1);
  }
  console.log("\n✅ All 6 env vars resolve to valid Stripe price objects.");
}

async function main() {
  if (isVerify) {
    await verifyEnvVars();
    return;
  }

  console.log("🌱 Seeding Stripe products + prices...\n");

  const envOutput: string[] = [];

  for (const productSpec of PRODUCTS) {
    const product = await ensureProduct(productSpec.name, productSpec.description);
    for (const priceSpec of productSpec.prices) {
      const label = `${productSpec.name} ${priceSpec.id}`;
      const price = await ensurePrice(product.id, priceSpec.amount, priceSpec.interval, label);
      const tierUpper = productSpec.name.toUpperCase();
      const suffix = priceSpec.id === "yearly" ? "_YEARLY" : "";
      envOutput.push(`NEXT_PUBLIC_STRIPE_${tierUpper}_PRICE_ID${suffix}=${price.id}`);
    }
  }

  console.log("\n🎉 Stripe setup complete!\n");
  console.log("Add these to Vercel env vars + local .env.local:\n");
  console.log(envOutput.join("\n"));
  console.log();
}

main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});
