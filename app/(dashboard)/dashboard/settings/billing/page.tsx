"use client";

import { useState, useEffect } from "react";
import { CreditCard, Check, Sparkles, Zap, Crown, Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

const plans = [
  {
    name: "Free",
    description: "For individuals getting started",
    price: "$0",
    period: "/month",
    features: [
      "Join up to 3 communities",
      "Basic profile features",
      "Community feed access",
      "Direct messaging",
    ],
    cta: "Current Plan",
    popular: false,
  },
  {
    name: "Professional",
    description: "For community creators",
    price: "$49",
    period: "/month",
    features: [
      "1 community",
      "Unlimited members",
      "All features",
      "Priority support",
      "Custom domain",
      "Analytics dashboard",
    ],
    cta: "Upgrade to Professional",
    popular: true,
  },
  {
    name: "Premium",
    description: "For power users",
    price: "$149",
    period: "/month",
    features: [
      "3 communities",
      "Unlimited everything",
      "White-label options",
      "API access",
      "Dedicated support",
      "Advanced analytics",
    ],
    cta: "Upgrade to Premium",
    popular: false,
  },
];

type Subscription = {
  id: string;
  status: string;
  plan: {
    name: string;
    description: string | null;
    price: number;
  };
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
};

export default function BillingPage() {
  const { user: _user, isLoading: userLoading } = useCurrentUser();
  const t = useTranslations();
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isPortalLoading, setIsPortalLoading] = useState(false);

  useEffect(() => {
    fetchSubscription();
  }, []);

  const fetchSubscription = async () => {
    try {
      const response = await fetch("/api/user/subscription");
      if (response.ok) {
        const data = await response.json();
        setSubscription(data.subscription);
      }
    } catch (error) {
      console.error("Error fetching subscription:", error);
    }
  };

  const handleManageSubscription = async () => {
    try {
      setIsPortalLoading(true);
      const response = await fetch("/api/stripe/portal", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to create portal session");
      }

      const { url } = await response.json();
      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error("Portal error:", error);
      toast.error("Failed to open billing portal");
    } finally {
      setIsPortalLoading(false);
    }
  };

  const handleUpgrade = (plan: string) => {
    if (plan === "Free") return;
    
    setIsLoading(plan);
    // Redirect to upgrade page with selected plan
    window.location.href = `/dashboard/upgrade?plan=${plan.toLowerCase()}`;
  };

  const getCurrentPlanName = () => {
    if (!subscription) return "Free";
    return subscription.plan.name;
  };

  const isSubscribed = subscription && ["ACTIVE", "TRIALING"].includes(subscription.status);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold tracking-tight">{t("settings.billing.title")}</h2>
        <p className="text-muted-foreground">
          {t("settings.billing.description")}
        </p>
      </div>

      {/* Current Plan */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-primary" />
              <CardTitle>Current Plan: {getCurrentPlanName()}</CardTitle>
            </div>
            {isSubscribed && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleManageSubscription}
                disabled={isPortalLoading}
              >
                {isPortalLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ExternalLink className="mr-2 h-4 w-4" />
                )}
                Manage Subscription
              </Button>
            )}
          </div>
          <CardDescription>
            {subscription ? (
              <div className="space-y-1">
                <p>Status: <span className={subscription.status === "ACTIVE" ? "text-green-600" : "text-yellow-600"}>{subscription.status}</span></p>
                <p>Renews: {new Date(subscription.currentPeriodEnd).toLocaleDateString()}</p>
                {subscription.cancelAtPeriodEnd && (
                  <p className="text-red-600">Will cancel at period end</p>
                )}
              </div>
            ) : (
              "You are currently on the Free plan. Upgrade to unlock more features."
            )}
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
