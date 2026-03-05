"use client";

import { Check, Sparkles, Zap, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function UpgradePage() {
  const plans = [
    {
      name: "Starter",
      price: 29,
      icon: Zap,
      color: "from-blue-500 to-cyan-500",
      features: [
        "1 community",
        "100 members max",
        "Basic features",
        "Email support",
      ],
    },
    {
      name: "Pro",
      price: 49,
      icon: Sparkles,
      color: "from-purple-500 to-pink-500",
      popular: true,
      features: [
        "1 community",
        "Unlimited members",
        "All features",
        "Priority support",
        "Custom domain",
      ],
    },
    {
      name: "Business",
      price: 99,
      icon: Crown,
      color: "from-orange-500 to-red-500",
      features: [
        "3 communities",
        "Unlimited everything",
        "White-label options",
        "API access",
        "Dedicated support",
      ],
    },
  ];

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
              >
                {plan.popular ? "Get Started" : "Choose Plan"}
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
