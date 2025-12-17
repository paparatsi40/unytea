"use client";

import { Check, Sparkles, Zap, Crown, Building2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const PLANS = [
  {
    name: "Trial",
    price: "$0",
    period: "forever",
    description: "Perfect for trying out Unytea",
    features: [
      "1 community",
      "50 members",
      "2 video hours/month",
      "1GB storage",
      "AI transcription & summaries",
      "Basic support",
    ],
    cta: "Current Plan",
    highlighted: false,
    disabled: true,
  },
  {
    name: "Professional",
    price: "$99",
    period: "/month",
    description: "For growing communities",
    features: [
      "3 communities",
      "500 members each",
      "20 video hours/month",
      "50GB storage",
      "AI transcription & summaries",
      "Buddy system",
      "Advanced analytics",
    ],
    cta: "Upgrade Now",
    highlighted: true,
    disabled: false,
  },
  {
    name: "Scale",
    price: "$249",
    period: "/month",
    description: "For established communities",
    features: [
      "6 communities",
      "2,000 members each",
      "60 video hours/month",
      "200GB storage",
      "Everything in Professional",
      "White-label branding",
      "Priority support",
      "Dedicated onboarding",
    ],
    cta: "Upgrade Now",
    highlighted: false,
    disabled: false,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "For large-scale operations",
    features: [
      "Unlimited communities",
      "Unlimited members",
      "150+ video hours/month",
      "500GB+ storage",
      "Everything in Scale",
      "Dedicated onboarding call",
      "Priority support (<4hr)",
      "Custom integrations (quoted)",
      "API access (beta)",
      "Custom development available",
      "SLA available on request",
    ],
    cta: "Contact Sales",
    highlighted: false,
    disabled: false,
  },
];

export default function UpgradePage() {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  const plans = [
    {
      name: "Professional",
      price: 99,
      icon: Zap,
      color: "from-blue-500 to-cyan-500",
      priceId: "price_1ScwoGIHad7GoCUdJfnOKXGz", // Stripe price ID
      features: [
        "3 communities",
        "500 members each",
        "20 video hours/month",
        "50GB storage",
        "AI transcription & summaries",
        "Buddy system",
        "Advanced analytics",
      ],
    },
    {
      name: "Scale",
      price: 249,
      icon: Sparkles,
      color: "from-purple-500 to-pink-500",
      popular: true,
      priceId: "price_1ScwqIIHad7GoCUdObtvl8DN",
      features: [
        "6 communities",
        "2,000 members each",
        "60 video hours/month",
        "200GB storage",
        "Everything in Professional",
        "White-label branding",
        "Priority support",
        "Dedicated onboarding",
      ],
    },
    {
      name: "Enterprise",
      price: 499,
      icon: Crown,
      color: "from-orange-500 to-red-500",
      priceId: "price_1ScwrAIHad7GoCUdFlMnwlEL",
      features: [
        "Unlimited communities",
        "Unlimited members",
        "150+ video hours/month",
        "500GB+ storage",
        "Everything in Scale",
        "Dedicated onboarding call",
        "Priority support (<4hr)",
        "Custom integrations (quoted)",
        "API access (beta)",
        "Custom development available",
        "SLA available on request",
      ],
    },
    {
      name: "Custom",
      price: null,
      icon: Building2,
      color: "from-gray-600 to-gray-800",
      priceId: null,
      features: [
        "Unlimited communities",
        "Unlimited members",
        "Unlimited video hours",
        "Everything in Enterprise",
        "Custom features",
        "White-label everything",
        "Dedicated infrastructure",
        "Custom SLA",
      ],
    },
  ];

  const handleSelectPlan = async (planName: string, priceId: string | null) => {
    if (!priceId) {
      // Custom plan - redirect to contact
      window.location.href = "mailto:sales@unytea.com?subject=Enterprise Plan Inquiry";
      return;
    }

    setLoading(planName);
    
    try {
      // Call API to create checkout session
      const response = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          priceId,
          planName,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create checkout session");
      }

      const { url } = await response.json();
      
      // Redirect to Stripe Checkout
      window.location.href = url;
    } catch (error: any) {
      console.error("Error:", error);
      alert(error.message || "Something went wrong. Please try again.");
      setLoading(null);
    }
  };

  return (
    <div className="space-y-8 p-8">
      {/* Header */}
      <div className="text-center">
        <Badge variant="outline" className="mb-4">
          Premium Plans
        </Badge>
        <h1 className="text-4xl font-bold text-foreground mb-4">
          Upgrade to Premium
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Choose the perfect plan for your community. Usage-based pricing means you only pay for what you use.
        </p>
      </div>

      {/* Current Plan Notice */}
      <div className="max-w-4xl mx-auto">
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-center">
          <p className="text-sm text-blue-900">
            14-day free trial active - Experience all premium features before upgrading
          </p>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4 max-w-7xl mx-auto">
        {plans.map((plan) => {
          const Icon = plan.icon;
          const isLoading = loading === plan.name;
          
          return (
            <div
              key={plan.name}
              className={`relative rounded-2xl border ${
                plan.popular
                  ? "border-primary shadow-2xl shadow-primary/20 scale-105"
                  : "border-border"
              } bg-card p-6 flex flex-col`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full text-white text-xs font-semibold">
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
                {plan.price ? (
                  <>
                    <span className="text-4xl font-bold text-foreground">
                      ${plan.price}
                    </span>
                    <span className="text-muted-foreground">/month</span>
                  </>
                ) : (
                  <span className="text-2xl font-bold text-foreground">
                    Contact us
                  </span>
                )}
              </div>

              {/* Features */}
              <ul className="space-y-2.5 mb-6 flex-1">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-foreground">{feature}</span>
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
                onClick={() => handleSelectPlan(plan.name, plan.priceId)}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : plan.price ? (
                  plan.popular ? "Get Started" : "Choose Plan"
                ) : (
                  "Contact Sales"
                )}
              </Button>
            </div>
          );
        })}
      </div>

      {/* Features Info */}
      <div className="max-w-4xl mx-auto mt-12 p-8 rounded-2xl border border-border bg-card/50">
        <h2 className="text-2xl font-bold text-foreground mb-6 text-center">
          All Plans Include
        </h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="flex items-start gap-3">
            <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <strong>Usage-based pricing</strong>
              <p className="text-sm text-muted-foreground">Only pay for what you use beyond base limits</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <strong>Real-time dashboard</strong>
              <p className="text-sm text-muted-foreground">Monitor your usage and costs live</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <strong>0% transaction fee</strong>
              <p className="text-sm text-muted-foreground">Keep 100% of paid community revenue</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <strong>Cancel anytime</strong>
              <p className="text-sm text-muted-foreground">No long-term contracts or commitments</p>
            </div>
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div className="max-w-4xl mx-auto mt-8 text-center">
        <p className="text-muted-foreground mb-4">
          Have questions about pricing or features?
        </p>
        <div className="flex flex-wrap gap-4 justify-center">
          <Button variant="outline" asChild>
            <Link href="/dashboard/help">
              View FAQ
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard/settings/billing">
              View Usage Dashboard
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <a href="mailto:support@unytea.com">
              Contact Support
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}
