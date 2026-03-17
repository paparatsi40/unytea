import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth-utils";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: { slug: string };
};

function extractPricing(pricing: unknown): { monthlyPrice: string; yearlyPrice: string } {
  if (!pricing || typeof pricing !== "object") {
    return { monthlyPrice: "29", yearlyPrice: "290" };
  }

  const rawMonthly = (pricing as Record<string, unknown>).monthlyPrice;
  const rawYearly = (pricing as Record<string, unknown>).yearlyPrice;

  const monthlyPrice = typeof rawMonthly === "number" || typeof rawMonthly === "string"
    ? String(rawMonthly)
    : "29";

  const yearlyPrice = typeof rawYearly === "number" || typeof rawYearly === "string"
    ? String(rawYearly)
    : "290";

  return { monthlyPrice, yearlyPrice };
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

    const monthly = Number(monthlyPrice);
    const yearly = Number(yearlyPrice);

    if (isPaid) {
      if (!Number.isFinite(monthly) || monthly <= 0) {
        return NextResponse.json({ error: "Monthly price must be greater than 0" }, { status: 400 });
      }
      if (!Number.isFinite(yearly) || yearly <= 0) {
        return NextResponse.json({ error: "Yearly price must be greater than 0" }, { status: 400 });
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
      },
    });
  } catch (error) {
    console.error("Error saving community payment settings:", error);
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}
