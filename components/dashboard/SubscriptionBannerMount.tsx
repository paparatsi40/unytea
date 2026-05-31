"use client";

import { useEffect, useState } from "react";
import { TrialBanner } from "./TrialBanner";
import { PaywallBanner } from "./PaywallBanner";

type SubscriptionState =
  | {
      status: "trialing";
      trialEndsAt: string; // ISO from JSON
      daysRemaining: number;
      planName: string;
    }
  | { status: "active"; planName: string }
  | { status: "paywall_locked"; reason: "paused" | "past_due" | "canceled" }
  | { status: "no_subscription" };

/**
 * Client-side banner mount. Fetches the typed subscription state from
 * /api/user/subscription-state and renders TrialBanner or PaywallBanner.
 *
 * Why client-fetch rather than server-rendered: the existing dashboard
 * layout (app/(dashboard)/dashboard/layout.tsx) is a client component
 * because it loads locale messages from localStorage. Converting it to
 * server is out of scope for this commit. Client-fetch produces a small
 * flash-of-no-banner on first render which is acceptable for v1.
 */
export function SubscriptionBannerMount() {
  const [state, setState] = useState<SubscriptionState | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/user/subscription-state")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.state) {
          setState(data.state);
        }
      })
      .catch((err) => {
        console.error("Failed to load subscription state", err);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!state) return null;

  if (state.status === "trialing") {
    return (
      <TrialBanner
        daysRemaining={state.daysRemaining}
        trialEndsAt={new Date(state.trialEndsAt)}
        planName={state.planName}
      />
    );
  }

  if (state.status === "paywall_locked") {
    return <PaywallBanner reason={state.reason} />;
  }

  return null;
}
