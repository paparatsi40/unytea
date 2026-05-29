import { NextResponse } from "next/server";
import { getCurrentSubscriptionState } from "@/lib/subscription-state";

export const dynamic = "force-dynamic";

/**
 * Returns the typed SubscriptionState for the currently authenticated user.
 * Used client-side by SubscriptionBannerMount to drive TrialBanner / PaywallBanner
 * rendering. The existing /api/user/subscription endpoint is preserved as-is —
 * it only returns ACTIVE/TRIALING; this endpoint covers the full state set
 * (paused / past_due / canceled / no_subscription) needed for paywall UX.
 */
export async function GET() {
  const state = await getCurrentSubscriptionState();
  if (!state) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ state });
}
