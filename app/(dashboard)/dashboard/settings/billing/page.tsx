"use client";

import { useState } from "react";
import { CreditCard, Check, Sparkles, Zap, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useTranslations } from "next-intl";

const plans = [
  {
    name: "Free",
    description: "For individuals getting started",
    price: "$0",
    period: "/month",
    features: [
      "Join up to 5 communities",
      "Basic profile features",
      "Community feed access",
      "Direct messaging",
    ],
    cta: "Current Plan",
    popular: false,
  },
  {
    name: "Pro",
    description: "For active community members",
    price: "$9",
    period: "/month",
    features: [
      "Unlimited communities",
      "Advanced analytics",
      "Priority support",
      "Custom themes",
      "No ads",
    ],
    cta: "Upgrade to Pro",
    popular: true,
  },
  {
    name: "Business",
    description: "For community creators",
    price: "$29",
    period: "/month",
    features: [
      "Everything in Pro",
      "Create unlimited communities",
      "Monetization tools",
      "Admin dashboard",
      "API access",
      "Dedicated support",
    ],
    cta: "Contact Sales",
    popular: false,
  },
];

export default function BillingPage() {
  const { user: _user } = useCurrentUser();
  const t = useTranslations();
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const handleUpgrade = (plan: string) => {
    setIsLoading(plan);
    // Simulate API call
    setTimeout(() => {
      setIsLoading(null);
    }, 1500);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold tracking-tight">{t("settings.billing.title", "Billing")}</h2>
        <p className="text-muted-foreground">
          {t("settings.billing.description", "Manage your subscription and billing preferences")}
        </p>
      </div>

      {/* Current Plan */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-primary" />
            <CardTitle>Free Plan</CardTitle>
          </div>
          <CardDescription>
            You are currently on the Free plan. Upgrade to unlock more features.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Pricing Plans */}
      <div className="grid gap-6 lg:grid-cols-3">
        {plans.map((plan) => (
          <Card
            key={plan.name}
            className={`flex flex-col ${
              plan.popular ? "border-primary shadow-lg" : ""
            }`}
          >
            {plan.popular && (
              <div className="rounded-t-lg bg-primary py-1 text-center text-xs font-medium text-primary-foreground">
                <Sparkles className="mr-1 inline h-3 w-3" />
                Most Popular
              </div>
            )}
            <CardHeader className="flex-1">
              <CardTitle className="text-xl">{plan.name}</CardTitle>
              <CardDescription>{plan.description}</CardDescription>
              <div className="mt-4 flex items-baseline">
                <span className="text-3xl font-bold">{plan.price}</span>
                <span className="text-muted-foreground">{plan.period}</span>
              </div>
            </CardHeader>
            <CardContent className="flex-1">
              <ul className="space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button
                className="w-full"
                variant={plan.popular ? "default" : "outline"}
                onClick={() => handleUpgrade(plan.name)}
                disabled={plan.name === "Free" || isLoading === plan.name}
              >
                {isLoading === plan.name ? (
                  <Zap className="mr-2 h-4 w-4 animate-spin" />
                ) : plan.name === "Free" ? (
                  <Check className="mr-2 h-4 w-4" />
                ) : null}
                {plan.cta}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* Payment Methods */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            <CardTitle>Payment Methods</CardTitle>
          </div>
          <CardDescription>
            Manage your payment methods and billing history
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center gap-4 py-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <CreditCard className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium">No payment methods added</p>
              <p className="text-sm text-muted-foreground">
                Add a payment method to upgrade your plan
              </p>
            </div>
            <Button variant="outline" disabled>
              Add Payment Method
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
