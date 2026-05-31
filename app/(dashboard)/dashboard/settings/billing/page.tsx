"use client";

import { useState, useEffect } from "react";
import { CreditCard, Check, Sparkles, Zap, Crown, Loader2, ExternalLink, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

// Plan order for comparison (lower = entry tier; higher = more capability).
// START is kept as the implicit "no active subscription" sentinel state used
// elsewhere in the codebase (User.platformPlan field, webhook reset path),
// but it is NOT presented as a sellable tier in the UI per PD V1 §6 RESOLVED
// 2026-05-28 ("vamos sin opción free").
const PLAN_ORDER: Record<string, number> = {
  START: 0,
  CREATOR: 1,
  BUSINESS: 2,
  PRO: 3,
};

const plans = [
  {
    key: "CREATOR",
    name: "Creator",
    description: "Para creators emergentes lanzando su primera comunidad",
    price: "$15",
    period: "/month",
    priceId: process.env.NEXT_PUBLIC_STRIPE_CREATOR_PRICE_ID ?? "",
    features: [
      "Comunidad ilimitada de members",
      "Live sessions hasta 100 participantes concurrentes",
      "Cursos pagados",
      "Community feed + library",
      "Basic analytics",
      "8% commission on member revenue",
    ],
    popular: false,
  },
  {
    key: "BUSINESS",
    name: "Business",
    description: "Para hosts establecidos creciendo su comunidad",
    price: "$49",
    period: "/month",
    priceId: process.env.NEXT_PUBLIC_STRIPE_BUSINESS_PRICE_ID ?? "",
    features: [
      "Everything in Creator",
      "Live sessions hasta 300 participantes concurrentes",
      "Dominio custom",
      "Analytics avanzados",
      "Hasta 5 admins",
      "5% commission on member revenue",
    ],
    popular: true,
  },
  {
    key: "PRO",
    name: "Pro",
    description: "Para teams scaling múltiples comunidades",
    price: "$149",
    period: "/month",
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID ?? "",
    features: [
      "Everything in Business",
      "Live sessions hasta 1000 participantes concurrentes",
      "White-label experience",
      "API access",
      "Admins ilimitados",
      "3% commission on member revenue",
    ],
    popular: false,
  },
];

type Subscription = {
  id: string;
  status: string;
  plan: { name: string; description: string | null; price: number };
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
};

export default function BillingPage() {
  // "START" is the sentinel for the 'no active subscription' state.
  // Display logic in CardTitle/CardDescription branches on this value.
  const [platformPlan, setPlatformPlan] = useState<string>("START");
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isUpgrading, setIsUpgrading] = useState<string | null>(null);
  const [isPortalLoading, setIsPortalLoading] = useState(false);

  useEffect(() => {
    fetchSubscription();
  }, []);

  const fetchSubscription = async () => {
    try {
      setIsLoadingData(true);
      const response = await fetch("/api/user/subscription");
      if (response.ok) {
        const data = await response.json();
        setSubscription(data.subscription);
        setPlatformPlan(data.platformPlan ?? "START");
      }
    } catch (error) {
      console.error("Error fetching subscription:", error);
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleManageSubscription = async () => {
    try {
      setIsPortalLoading(true);
      const response = await fetch("/api/stripe/portal", { method: "POST" });
      if (!response.ok) throw new Error("Failed to create portal session");
      const { url } = await response.json();
      if (url) window.location.href = url;
    } catch (error) {
      console.error("Portal error:", error);
      toast.error("Failed to open billing portal");
    } finally {
      setIsPortalLoading(false);
    }
  };

  const handleUpgrade = async (plan: (typeof plans)[number]) => {
    if (!plan.priceId) return;
    try {
      setIsUpgrading(plan.key);
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId: plan.priceId }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error ?? "Failed to create checkout session");
      }

      const { url } = await response.json();
      if (url) window.location.href = url;
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to start checkout");
    } finally {
      setIsUpgrading(null);
    }
  };

  const currentPlanOrder = PLAN_ORDER[platformPlan] ?? 0;
  const isSubscribed = subscription && ["ACTIVE", "TRIALING"].includes(subscription.status);

  const getButtonState = (plan: (typeof plans)[number]) => {
    const planOrder = PLAN_ORDER[plan.key] ?? 0;
    if (plan.key === platformPlan) return "current";
    if (planOrder < currentPlanOrder) return "downgrade";
    return "upgrade";
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold tracking-tight">Facturación</h2>
        <p className="text-muted-foreground">Administra tu plan y suscripción de Unytea</p>
      </div>

      {/* Current Plan Banner */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-primary" />
              <CardTitle>
                {isLoadingData ? (
                  <span className="inline-block h-4 w-20 animate-pulse rounded bg-muted" />
                ) : platformPlan === "START" ? (
                  "Sin plan activo"
                ) : (
                  <>
                    Plan actual: <span className="text-primary">{platformPlan}</span>
                  </>
                )}
              </CardTitle>
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
              <div className="space-y-1 text-sm">
                <p>
                  Status:{" "}
                  <span
                    className={
                      subscription.status === "ACTIVE"
                        ? "font-medium text-green-600"
                        : "font-medium text-yellow-600"
                    }
                  >
                    {subscription.status}
                  </span>
                </p>
                <p>Renews: {new Date(subscription.currentPeriodEnd).toLocaleDateString()}</p>
                {subscription.cancelAtPeriodEnd && (
                  <p className="text-red-600">Will cancel at period end</p>
                )}
              </div>
            ) : platformPlan === "START" ? (
              "Selecciona un plan para empezar tu prueba gratuita de 14 días."
            ) : (
              "Tu plan actual y suscripción de Unytea."
            )}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Pricing Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {plans.map((plan) => {
          const state = getButtonState(plan);
          return (
            <Card
              key={plan.key}
              className={`relative flex flex-col ${
                plan.key === platformPlan
                  ? "border-primary shadow-lg ring-2 ring-primary"
                  : plan.popular
                    ? "border-primary/50 shadow-md"
                    : ""
              }`}
            >
              {/* Badges */}
              <div className="absolute -top-3 left-4 flex gap-2">
                {plan.key === platformPlan && (
                  <Badge className="bg-primary text-xs text-primary-foreground">
                    <Check className="mr-1 h-3 w-3" />
                    Tu plan
                  </Badge>
                )}
                {plan.popular && plan.key !== platformPlan && (
                  <Badge
                    variant="outline"
                    className="border-primary bg-background text-xs text-primary"
                  >
                    <Sparkles className="mr-1 h-3 w-3" />
                    Popular
                  </Badge>
                )}
              </div>

              <CardHeader className="pt-6">
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-3xl font-bold">{plan.price}</span>
                  <span className="text-sm text-muted-foreground">{plan.period}</span>
                </div>
              </CardHeader>

              <CardContent className="flex-1">
                <ul className="space-y-2">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter>
                {state === "current" ? (
                  <Button className="w-full" disabled>
                    <Check className="mr-2 h-4 w-4" />
                    Plan actual
                  </Button>
                ) : state === "downgrade" ? (
                  <Button className="w-full" variant="ghost" disabled>
                    <Lock className="mr-2 h-4 w-4" />
                    Plan inferior
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    variant={plan.popular ? "default" : "outline"}
                    onClick={() => handleUpgrade(plan)}
                    disabled={isUpgrading === plan.key}
                  >
                    {isUpgrading === plan.key ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Zap className="mr-2 h-4 w-4" />
                    )}
                    Upgrade a {plan.name}
                  </Button>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {/* Payment Methods */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            <CardTitle>Métodos de pago</CardTitle>
          </div>
          <CardDescription>
            Administra tus métodos de pago e historial de facturación
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isSubscribed ? (
            <div className="flex flex-col items-center justify-center gap-4 py-6 text-center">
              <p className="text-sm text-muted-foreground">
                Administra tus métodos de pago directamente en el portal de Stripe.
              </p>
              <Button
                variant="outline"
                onClick={handleManageSubscription}
                disabled={isPortalLoading}
              >
                {isPortalLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ExternalLink className="mr-2 h-4 w-4" />
                )}
                Abrir portal de facturación
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-4 py-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <CreditCard className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium">Sin métodos de pago</p>
                <p className="text-sm text-muted-foreground">
                  Se agrega automáticamente al hacer upgrade
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
