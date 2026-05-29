"use client";

import { useState } from "react";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PaywallBannerProps {
  reason: "paused" | "past_due" | "canceled";
}

const REASON_COPY: Record<
  PaywallBannerProps["reason"],
  { title: string; body: string; cta: string }
> = {
  paused: {
    title: "Your community is paused",
    body: "Your trial ended without payment. Add a card to reactivate — your community data is preserved.",
    cta: "Add payment",
  },
  past_due: {
    title: "Payment needed",
    body: "We couldn't process your last payment. Update your payment method to reactivate your community.",
    cta: "Add payment",
  },
  canceled: {
    title: "Subscription canceled",
    body: "Your subscription was canceled. Reactivate to bring your community back online.",
    cta: "Reactivate",
  },
};

const STRINGS = {
  opening: "Opening...",
};

export function PaywallBanner({ reason }: PaywallBannerProps) {
  const [isOpening, setIsOpening] = useState(false);
  const copy = REASON_COPY[reason];

  async function openPortal() {
    setIsOpening(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error("Failed to open Stripe portal", err);
    } finally {
      setIsOpening(false);
    }
  }

  return (
    <div className="border-b border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/20">
      <div className="flex items-center justify-between gap-4 px-4 py-3">
        <div className="flex items-center gap-3">
          <Lock className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400" aria-hidden />
          <div className="text-sm">
            <div className="font-medium text-red-900 dark:text-red-100">{copy.title}</div>
            <div className="text-red-800 dark:text-red-200">{copy.body}</div>
          </div>
        </div>
        <Button onClick={openPortal} disabled={isOpening} size="sm" variant="destructive">
          {isOpening ? STRINGS.opening : copy.cta}
        </Button>
      </div>
    </div>
  );
}
