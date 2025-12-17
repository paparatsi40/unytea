"use client";

import { useState } from "react";
import { X, Zap, Check, ArrowRight, TrendingUp } from "lucide-react";
import Link from "next/link";
import { SubscriptionPlan } from "@/lib/subscription-plans";

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  currentPlan: SubscriptionPlan;
  feature?: string;
  limitType?: "communities" | "members" | "videoCalls";
  currentUsage?: {
    current: number;
    limit: number;
  };
}

export function UpgradeModal({
  isOpen,
  onClose,
  title,
  message,
  currentPlan,
  feature,
  limitType,
  currentUsage,
}: UpgradeModalProps) {
  if (!isOpen) return null;

  const suggestedPlan =
    currentPlan === "FREE"
      ? "Professional"
      : currentPlan === "PROFESSIONAL"
      ? "Scale"
      : "Enterprise";

  const suggestedPrice =
    currentPlan === "FREE" ? 99 : currentPlan === "PROFESSIONAL" ? 249 : "Custom";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-lg glass-strong rounded-2xl p-6 shadow-smooth-xl border border-white/20 animate-in fade-in zoom-in duration-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-2 rounded-lg hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5 text-white/60" />
        </button>

        {/* Icon */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center mb-4">
          <TrendingUp className="w-8 h-8 text-white" />
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-white mb-2">{title}</h2>

        {/* Message */}
        <p className="text-white/70 mb-4">{message}</p>

        {/* Current Usage (if provided) */}
        {currentUsage && (
          <div className="glass rounded-xl p-4 mb-4 border border-white/10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-white/60">Current Usage</span>
              <span className="text-sm font-semibold text-white">
                {currentUsage.current} / {currentUsage.limit}
              </span>
            </div>
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-purple-500 rounded-full transition-all"
                style={{
                  width: `${Math.min((currentUsage.current / currentUsage.limit) * 100, 100)}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Comparison */}
        <div className="space-y-3 mb-6">
          <div className="flex items-center gap-3 text-sm">
            <div className="flex-1 glass rounded-lg p-3 border border-white/10">
              <div className="text-white/60 text-xs mb-1">Current Plan</div>
              <div className="font-semibold text-white capitalize">{currentPlan.toLowerCase()}</div>
              <div className="text-primary text-xs mt-1">
                {currentPlan === "FREE" ? "$0/month" : currentPlan === "PROFESSIONAL" ? "$99/month" : "$249/month"}
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-white/40 flex-shrink-0" />
            <div className="flex-1 glass rounded-lg p-3 border-2 border-primary/50 bg-primary/5">
              <div className="text-white/60 text-xs mb-1">Upgrade to</div>
              <div className="font-semibold text-white">{suggestedPlan}</div>
              <div className="text-primary text-xs mt-1 font-semibold">
                {typeof suggestedPrice === 'number' ? `$${suggestedPrice}/month` : suggestedPrice}
              </div>
            </div>
          </div>
        </div>

        {/* Benefits */}
        <div className="glass rounded-xl p-4 mb-6 border border-white/10">
          <div className="text-sm font-semibold text-white mb-3">
            What you get with {suggestedPlan}:
          </div>
          <div className="space-y-2">
            {currentPlan === "FREE" && (
              <>
                <div className="flex items-center gap-2 text-sm text-white/80">
                  <Check className="w-4 h-4 text-primary flex-shrink-0" />
                  <span>3 communities (vs 1)</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-white/80">
                  <Check className="w-4 h-4 text-primary flex-shrink-0" />
                  <span>500 members per community (vs 50)</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-white/80">
                  <Check className="w-4 h-4 text-primary flex-shrink-0" />
                  <span>20 video hours/month (vs 2)</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-white/80">
                  <Check className="w-4 h-4 text-primary flex-shrink-0" />
                  <span>Advanced analytics</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-white/80">
                  <Check className="w-4 h-4 text-primary flex-shrink-0" />
                  <span>50GB storage (vs 1GB)</span>
                </div>
              </>
            )}
            {currentPlan === "PROFESSIONAL" && (
              <>
                <div className="flex items-center gap-2 text-sm text-white/80">
                  <Check className="w-4 h-4 text-primary flex-shrink-0" />
                  <span>6 communities (vs 3)</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-white/80">
                  <Check className="w-4 h-4 text-primary flex-shrink-0" />
                  <span>2,000 members per community (vs 500)</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-white/80">
                  <Check className="w-4 h-4 text-primary flex-shrink-0" />
                  <span>White-label branding</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-white/80">
                  <Check className="w-4 h-4 text-primary flex-shrink-0" />
                  <span>Priority support</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-white/80">
                  <Check className="w-4 h-4 text-primary flex-shrink-0" />
                  <span>Dedicated onboarding</span>
                </div>
              </>
            )}
            {currentPlan === "SCALE" && (
              <>
                <div className="flex items-center gap-2 text-sm text-white/80">
                  <Check className="w-4 h-4 text-primary flex-shrink-0" />
                  <span>Unlimited communities & members</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-white/80">
                  <Check className="w-4 h-4 text-primary flex-shrink-0" />
                  <span>API access (beta)</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-white/80">
                  <Check className="w-4 h-4 text-primary flex-shrink-0" />
                  <span>Custom integrations</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-white/80">
                  <Check className="w-4 h-4 text-primary flex-shrink-0" />
                  <span>Dedicated support (&lt;4hr response)</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-white/80">
                  <Check className="w-4 h-4 text-primary flex-shrink-0" />
                  <span>SLA available on request</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 rounded-xl glass border border-white/10 text-white font-semibold hover:bg-white/5 transition-colors"
          >
            Maybe Later
          </button>
          <Link
            href="/pricing"
            className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-primary to-purple-500 text-white font-semibold shadow-smooth hover:opacity-90 transition-opacity flex items-center justify-center gap-2 group"
          >
            <Zap className="w-4 h-4" />
            Upgrade Now
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Note */}
        <p className="text-center text-xs text-white/50 mt-4">
          Cancel anytime. No long-term commitments.
        </p>
      </div>
    </div>
  );
}
