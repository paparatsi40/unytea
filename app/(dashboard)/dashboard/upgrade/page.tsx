"use client";

import { useState } from "react";
import { Check, Sparkles, Zap, Crown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const plans = [
  {
    name: "Free",
    price: 0,
    priceId: "", // Free plan doesn't need a Stripe price
    icon: Zap,
    color: "from-blue-500 to-cyan-500",
    features: [
      "Join up to 3 communities",
      "Basic profile features",
      "Community feed access",
      "Direct messaging",
    ],
  },
  {
    name: "Professional",
    price: 49,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PROFESSIONAL_PRICE_ID || "",
    icon: Sparkles,
    color: "from-purple-500 to-pink-500",
    popular: true,
    features: [
      "1 community",
      "Unlimited members",
      "All features",
      "Priority support",
      "Custom domain",
      "Analytics dashboard",
    ],
  },
  {
    name: "Premium",
    price: 149,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID || "",
    icon: Crown,
    color: "from-orange-500 to-red-500",
    features: [
      "3 communities",
      "Unlimited everything",
      "White-label options",
      "API access",
      "Dedicated support",
      "Advanced analytics",
    ],
  },
];

export default function UpgradePage() {
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const handleSubscribe = async (planName: string, priceId: string) => {
    if (!priceId) {
      toast.error("Stripe price ID not configured");
      return;
    }

    try {
      setIsLoading(planName);
      
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          priceId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create checkout session");
      }

      const { url } = await response.json();
      
      if (url) {
        window.location.href = url;
      } else {
        throw new Error("No checkout URL received");
      }
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to start checkout");
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold text-foreground mb-4">
          Upgrade to Premium
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Choose the perfect plan for your community. No hidden fees, cancel anytime.
        </p>
      </div>

      {/* Pricing Cards */}
      <div className="grid gap-8 md:grid-cols-3 max-w-7xl mx-auto">
        {plans.map((plan) => {
          const Icon = plan.icon;
          return (
            <div
              key={plan.name}
              className={`relative rounded-2xl border ${
                plan.popular
                  ? "border-primary shadow-2xl shadow-primary/20 scale-105"
                  : "border-border"
              } bg-card p-8 flex flex-col`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full text-white text-sm font-semibold">
                  Most Popular
                </div>
              )}

              {/* Icon */}
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${plan.color} flex items-center justify-center mb-4`}>
                <Icon className="w-6 h-6 text-white" />
              </div>

              {/* Plan Name */}
              <h3 className="text-2xl font-bold text-foreground mb-2">
                {plan.name}
              </h3>

              {/* Price */}
              <div className="mb-6">
                <span className="text-4xl font-bold text-foreground">
                  ${plan.price}
                </span>
                <span className="text-muted-foreground">/month</span>
              </div>

              {/* Features */}
              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA Button */}
              <Button
                className={`w-full ${
                  plan.popular
                    ? "bg-gradient-to-r from-purple-600 to-pink-600 hover:shadow-xl"
                    : ""
                }`}
                variant={plan.popular ? "default" : "outline"}
                onClick={() => handleSubscribe(plan.name, plan.priceId)}
                disabled={isLoading === plan.name || !plan.priceId}
              >
                {isLoading === plan.name ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : !plan.priceId ? (
                  "Not Available"
                ) : (
                  `Get ${plan.name}`
                )}
              </Button>
            </div>
          );
        })}
      </div>

      {/* FAQ Preview */}
      <div className="max-w-4xl mx-auto mt-16 p-8 rounded-2xl border border-border bg-card/50">
        <h2 className="text-2xl font-bold text-foreground mb-4 text-center">
          Questions?
        </h2>
        <p className="text-center text-muted-foreground">
          All plans include 14-day free trial. No credit card required.
          <br />
          Payment integration coming soon!
        </p>
      </div>
    </div>
  );
}
