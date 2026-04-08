import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// ── Subscribe to Push Notifications ──────────────────────────────────
export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { subscription, userAgent } = body;

    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return NextResponse.json(
        { error: "Invalid subscription object" },
        { status: 400 }
      );
    }

    // Upsert subscription (endpoint is unique)
    await prisma.pushSubscription.upsert({
      where: { endpoint: subscription.endpoint },
      create: {
        userId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        userAgent: userAgent || null,
      },
      update: {
        userId,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        userAgent: userAgent || null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[push/subscribe] Error:", error);
    return NextResponse.json(
      { error: "Failed to subscribe" },
      { status: 500 }
    );
  }
}

// ── Unsubscribe from Push Notifications ──────────────────────────────
export async function DELETE(request: Request) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { endpoint } = body;

    if (!endpoint) {
      return NextResponse.json(
        { error: "Endpoint is required" },
        { status: 400 }
      );
    }

    await prisma.pushSubscription.deleteMany({
      where: { userId, endpoint },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[push/unsubscribe] Error:", error);
    return NextResponse.json(
      { error: "Failed to unsubscribe" },
      { status: 500 }
    );
  }
}
