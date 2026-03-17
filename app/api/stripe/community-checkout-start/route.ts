import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe, getOrCreateStripeCustomer } from "@/lib/stripe";

export const dynamic = "force-dynamic";

function getTierPriceId(pricing: unknown, tier: "free" | "pro" | "vip") {
  if (!pricing || typeof pricing !== "object") return "";
  const record = pricing as Record<string, unknown>;
  const ids = record.tierStripePriceIds as Record<string, unknown> | undefined;
  const value = ids?.[tier];
  return typeof value === "string" ? value : "";
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.redirect(new URL("/auth/signin", req.url));
  }

  const { searchParams } = new URL(req.url);
  const communityId = searchParams.get("communityId");
  const slug = searchParams.get("slug");
  const locale = searchParams.get("locale") || "en";
  const tier = (searchParams.get("tier") || "pro") as "free" | "pro" | "vip";

  if (!communityId || !slug) {
    return NextResponse.redirect(new URL(`/${locale}/explore`, req.url));
  }

  const community = await prisma.community.findUnique({
    where: { id: communityId },
    include: { owner: true },
  });

  if (!community || !community.isPaid) {
    return NextResponse.redirect(new URL(`/${locale}/community/${slug}`, req.url));
  }

  const priceId = getTierPriceId(community.pricing, tier);
  if (!priceId) {
    return NextResponse.redirect(new URL(`/${locale}/community/${slug}?paywall=1&error=missing_price`, req.url));
  }

  const existing = await prisma.member.findFirst({
    where: { userId: session.user.id, communityId, status: "ACTIVE" },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.redirect(new URL(`/dashboard/c/${slug}`, req.url));
  }

  if (!community.owner.stripeConnectAccountId) {
    return NextResponse.redirect(new URL(`/${locale}/community/${slug}?paywall=1&error=owner_not_connected`, req.url));
  }

  const customer = await getOrCreateStripeCustomer({
    userId: session.user.id,
    email: session.user.email,
    name: session.user.name || undefined,
  });

  const checkout = await stripe.checkout.sessions.create({
    customer: customer.id,
    line_items: [{ price: priceId, quantity: 1 }],
    mode: "subscription",
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/${locale}/community/${slug}?paid=1`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/${locale}/community/${slug}?paywall=1&canceled=1`,
    metadata: {
      userId: session.user.id,
      communityId,
      type: "community_membership",
      tier,
    },
    subscription_data: {
      metadata: {
        userId: session.user.id,
        communityId,
        ownerId: community.ownerId,
        type: "community_membership",
        tier,
      },
      transfer_data: {
        destination: community.owner.stripeConnectAccountId,
        amount_percent: 95,
      },
      application_fee_percent: 5,
    },
  });

  if (!checkout.url) {
    return NextResponse.redirect(new URL(`/${locale}/community/${slug}?paywall=1&error=checkout_failed`, req.url));
  }

  return NextResponse.redirect(checkout.url);
}
