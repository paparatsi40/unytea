import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth-utils";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: { slug: string };
};

type TierPricing = {
  free: string;
  pro: string;
  vip: string;
};

type TierStripePriceIds = {
  free: string;
  pro: string;
  vip: string;
};

function extractPricing(pricing: unknown): {
  monthlyPrice: string;
  yearlyPrice: string;
  defaultTier: "free" | "pro" | "vip";
  tierPricing: TierPricing;
  tierStripePriceIds: TierStripePriceIds;
} {
  if (!pricing || typeof pricing !== "object") {
    return {
      monthlyPrice: "29",
      yearlyPrice: "290",
      defaultTier: "pro",
      tierPricing: { free: "0", pro: "29", vip: "99" },
      tierStripePriceIds: { free: "", pro: "", vip: "" },
    };
  }

  const record = pricing as Record<string, unknown>;
  const rawMonthly = record.monthlyPrice;
  const rawYearly = record.yearlyPrice;

  const monthlyPrice =
    typeof rawMonthly === "number" || typeof rawMonthly === "string"
      ? String(rawMonthly)
      : "29";

  const yearlyPrice =
    typeof rawYearly === "number" || typeof rawYearly === "string"
      ? String(rawYearly)
      : "290";

  const rawDefaultTier = record.defaultTier;
  const defaultTier =
    rawDefaultTier === "free" || rawDefaultTier === "pro" || rawDefaultTier === "vip"
      ? rawDefaultTier
      : "pro";

  const rawTierPricing = record.tierPricing as Record<string, unknown> | undefined;
  const tierPricing: TierPricing = {
    free:
      rawTierPricing && (typeof rawTierPricing.free === "number" || typeof rawTierPricing.free === "string")
        ? String(rawTierPricing.free)
        : "0",
    pro:
      rawTierPricing && (typeof rawTierPricing.pro === "number" || typeof rawTierPricing.pro === "string")
        ? String(rawTierPricing.pro)
        : monthlyPrice,
    vip:
      rawTierPricing && (typeof rawTierPricing.vip === "number" || typeof rawTierPricing.vip === "string")
        ? String(rawTierPricing.vip)
        : "99",
  };

  const rawTierStripePriceIds = record.tierStripePriceIds as Record<string, unknown> | undefined;
  const tierStripePriceIds: TierStripePriceIds = {
    free: rawTierStripePriceIds && typeof rawTierStripePriceIds.free === "string" ? rawTierStripePriceIds.free : "",
    pro: rawTierStripePriceIds && typeof rawTierStripePriceIds.pro === "string" ? rawTierStripePriceIds.pro : "",
    vip: rawTierStripePriceIds && typeof rawTierStripePriceIds.vip === "string" ? rawTierStripePriceIds.vip : "",
  };

  return { monthlyPrice, yearlyPrice, defaultTier, tierPricing, tierStripePriceIds };
}

export async function GET(_req: Request, context: RouteContext) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const community = await prisma.community.findUnique({
      where: { slug: context.params.slug },
      select: {
        id: true,
        ownerId: true,
        isPaid: true,
        pricing: true,
      },
    });

    if (!community) {
      return NextResponse.json({ error: "Community not found" }, { status: 404 });
    }

    const membership = await prisma.member.findFirst({
      where: {
        communityId: community.id,
        userId,
        role: { in: ["OWNER", "ADMIN"] },
        status: "ACTIVE",
      },
      select: { id: true },
    });

    if (community.ownerId !== userId && !membership) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const prices = extractPricing(community.pricing);

    return NextResponse.json({
      success: true,
      settings: {
        isPaid: community.isPaid,
        monthlyPrice: prices.monthlyPrice,
        yearlyPrice: prices.yearlyPrice,
        defaultTier: prices.defaultTier,
        tierPricing: prices.tierPricing,
        tierStripePriceIds: prices.tierStripePriceIds,
      },
    });
  } catch (error) {
    console.error("Error loading community payment settings:", error);
    return NextResponse.json({ error: "Failed to load settings" }, { status: 500 });
  }
}

export async function PUT(req: Request, context: RouteContext) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const isPaid = !!body?.isPaid;
    const monthlyPrice = String(body?.monthlyPrice ?? "").trim();
    const yearlyPrice = String(body?.yearlyPrice ?? "").trim();
    const defaultTier: "free" | "pro" | "vip" =
      body?.defaultTier === "free" || body?.defaultTier === "pro" || body?.defaultTier === "vip"
        ? body.defaultTier
        : "pro";

    const tierPricing = {
      free: String(body?.tierPricing?.free ?? "0").trim(),
      pro: String(body?.tierPricing?.pro ?? (monthlyPrice || "29")).trim(),
      vip: String(body?.tierPricing?.vip ?? "99").trim(),
    };

    const tierStripePriceIds = {
      free: String(body?.tierStripePriceIds?.free ?? "").trim(),
      pro: String(body?.tierStripePriceIds?.pro ?? "").trim(),
      vip: String(body?.tierStripePriceIds?.vip ?? "").trim(),
    };

    const monthly = Number(monthlyPrice);
    const yearly = Number(yearlyPrice);
    const freeTier = Number(tierPricing.free || "0");
    const proTier = Number(tierPricing.pro || "0");
    const vipTier = Number(tierPricing.vip || "0");

    if (isPaid) {
      if (!Number.isFinite(monthly) || monthly <= 0) {
        return NextResponse.json({ error: "Monthly price must be greater than 0" }, { status: 400 });
      }
      if (!Number.isFinite(yearly) || yearly <= 0) {
        return NextResponse.json({ error: "Yearly price must be greater than 0" }, { status: 400 });
      }
      if (!Number.isFinite(freeTier) || freeTier < 0) {
        return NextResponse.json({ error: "Free tier must be 0 or more" }, { status: 400 });
      }
      if (!Number.isFinite(proTier) || proTier <= 0) {
        return NextResponse.json({ error: "Pro tier must be greater than 0" }, { status: 400 });
      }
      if (!Number.isFinite(vipTier) || vipTier <= 0) {
        return NextResponse.json({ error: "VIP tier must be greater than 0" }, { status: 400 });
      }
    }

    const community = await prisma.community.findUnique({
      where: { slug: context.params.slug },
      select: {
        id: true,
        ownerId: true,
      },
    });

    if (!community) {
      return NextResponse.json({ error: "Community not found" }, { status: 404 });
    }

    const membership = await prisma.member.findFirst({
      where: {
        communityId: community.id,
        userId,
        role: { in: ["OWNER", "ADMIN"] },
        status: "ACTIVE",
      },
      select: { id: true },
    });

    if (community.ownerId !== userId && !membership) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const updated = await prisma.community.update({
      where: { id: community.id },
      data: {
        isPaid,
        pricing: {
          monthlyPrice: isPaid ? monthly : 0,
          yearlyPrice: isPaid ? yearly : 0,
          defaultTier,
          tierPricing: {
            free: isPaid ? freeTier : 0,
            pro: isPaid ? proTier : 0,
            vip: isPaid ? vipTier : 0,
          },
          tierStripePriceIds: {
            free: isPaid ? tierStripePriceIds.free : "",
            pro: isPaid ? tierStripePriceIds.pro : "",
            vip: isPaid ? tierStripePriceIds.vip : "",
          },
          currency: "USD",
          updatedAt: new Date().toISOString(),
        },
      },
      select: {
        isPaid: true,
        pricing: true,
      },
    });

    const prices = extractPricing(updated.pricing);

    return NextResponse.json({
      success: true,
      settings: {
        isPaid: updated.isPaid,
        monthlyPrice: prices.monthlyPrice,
        yearlyPrice: prices.yearlyPrice,
        defaultTier: prices.defaultTier,
        tierPricing: prices.tierPricing,
        tierStripePriceIds: prices.tierStripePriceIds,
      },
    });
  } catch (error) {
    console.error("Error saving community payment settings:", error);
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}
