"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Check, 
  X, 
  Zap, 
  Crown, 
  Sparkles,
  Users,
  Video,
  HardDrive,
  MessageSquare,
  Shield,
  TrendingUp,
  ArrowRight,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { useState } from "react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useParams } from "next/navigation";
import { LogoWithText } from "@/components/brand/Logo";

const plans = [
  {
    name: "Trial",
    slug: "FREE",
    icon: Users,
    price: { monthly: 0, yearly: 0 },
    priceId: null, // No Stripe price for free plan
    description: "Perfect for trying out Unytea",
    badge: "🎁 FREE",
    features: [
      { name: "1 community", included: true },
      { name: "50 members", included: true },
      { name: "2 video hours/month", included: true },
      { name: "1GB storage", included: true },
      { name: "✅ AI transcription", included: true },
      { name: "✅ AI summaries", included: true },
      { name: "✅ Recording", included: true },
      { name: "Basic support", included: true },
      { name: "White-label", included: false },
      { name: "Priority support", included: false },
      { name: "API access", included: false },
    ],
    cta: "Start Free",
    highlighted: false,
    stripeLink: null,
  },
  {
    name: "Professional",
    slug: "PROFESSIONAL",
    icon: Zap,
    price: { monthly: 99, yearly: 990 },
    priceId: "price_1SfOmfIHad7GoCUdd1H11znb", // Stripe Price ID (monthly)
    description: "For growing communities",
    badge: "🔥 MOST POPULAR",
    features: [
      { name: "3 communities", included: true },
      { name: "500 members each", included: true },
      { name: "20 video hours/month", included: true },
      { name: "50GB storage", included: true },
      { name: "✅ AI transcription", included: true },
      { name: "✅ AI summaries", included: true },
      { name: "✅ Recording", included: true },
      { name: "✅ Buddy system", included: true },
      { name: "✅ Analytics", included: true },
      { name: "Priority support", included: false },
      { name: "White-label", included: false },
      { name: "API access", included: false },
    ],
    cta: "Start Free Trial",
    highlighted: true,
    stripeLink: process.env.NEXT_PUBLIC_STRIPE_PROFESSIONAL_LINK,
  },
  {
    name: "Scale",
    slug: "SCALE",
    icon: TrendingUp,
    price: { monthly: 249, yearly: 2490 },
    priceId: "price_1SfOntIHad7GoCUd5Ec95w81", // Stripe Price ID (monthly)
    description: "For established communities",
    features: [
      { name: "6 communities", included: true },
      { name: "2,000 members each", included: true },
      { name: "60 video hours/month", included: true },
      { name: "200GB storage", included: true },
      { name: "✅ AI transcription", included: true },
      { name: "✅ AI summaries", included: true },
      { name: "✅ Recording", included: true },
      { name: "✅ Buddy system", included: true },
      { name: "✅ Analytics", included: true },
      { name: "✅ White-label branding", included: true },
      { name: "✅ Priority support", included: true },
      { name: "✅ Dedicated onboarding", included: true },
      { name: "API access", included: false },
    ],
    cta: "Start Free Trial",
    highlighted: false,
    stripeLink: process.env.NEXT_PUBLIC_STRIPE_SCALE_LINK,
  },
  {
    name: "Enterprise",
    slug: "ENTERPRISE",
    icon: Crown,
    price: { monthly: null, yearly: null },
    priceId: "price_1ScwrAIHad7GoCUdFlMnwlEL", // Stripe Price ID
    description: "For large-scale operations",
    features: [
      { name: "Unlimited communities", included: true },
      { name: "Unlimited members", included: true },
      { name: "150+ video hours/month", included: true },
      { name: "500GB+ storage", included: true },
      { name: "✅ Everything in Scale", included: true },
      { name: "✅ Dedicated onboarding call", included: true },
      { name: "✅ Priority support (<4hr)", included: true },
      { name: "✅ Custom integrations (quoted)", included: true },
      { name: "✅ API access (beta)", included: true },
      { name: "✅ Custom development available", included: true },
      { name: "✅ SLA available on request", included: true },
    ],
    cta: "Contact Sales",
    highlighted: false,
    stripeLink: null,
  },
];

const features = [
  {
    icon: Users,
    title: "Community Management",
    description: "Build and manage thriving communities with powerful moderation tools",
  },
  {
    icon: Video,
    title: "Live Video Sessions",
    description: "Host unlimited live mentoring sessions with screen sharing and recording",
  },
  {
    icon: MessageSquare,
    title: "Real-time Chat",
    description: "Keep your community engaged with channels, direct messages, and threads",
  },
  {
    icon: Shield,
    title: "Security & Privacy",
    description: "Enterprise-grade security with SSO, 2FA, and compliance certifications",
  },
  {
    icon: TrendingUp,
    title: "Analytics & Insights",
    description: "Track engagement, growth, and ROI with detailed analytics dashboards",
  },
  {
    icon: HardDrive,
    title: "Content Management",
    description: "Share courses, resources, and knowledge base articles with your community",
  },
];

export default function PricingPage() {
  const { user } = useCurrentUser();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const params = useParams();
  const locale = params?.locale as string;

  const currentPlan = (user as any)?.subscriptionPlan || "FREE";

  const handleUpgrade = async (plan: typeof plans[0]) => {
    // If no priceId, handle special cases
    if (!plan.priceId) {
      if (plan.slug === "FREE") {
        // Redirect to signup
        window.location.href = "/auth/signup";
        return;
      }
      // Enterprise - contact sales
      window.location.href = "mailto:sales@unytea.com?subject=Enterprise Plan Inquiry";
      return;
    }

    setLoadingPlan(plan.slug);

    try {
      const response = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          priceId: plan.priceId,
          planName: plan.slug,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create checkout session");
      }

      const { url } = await response.json();

      // Redirect to Stripe checkout
      window.location.href = url;
    } catch (error: any) {
      console.error("Error:", error);
      alert(error.message || "Something went wrong. Please try again.");
      setLoadingPlan(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <div className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href={`/${locale}`} className="text-2xl font-bold text-primary">
            <LogoWithText />
          </Link>
          <div className="flex items-center gap-4">
            {user ? (
              <Button asChild>
                <Link href={`/${locale}/dashboard`}>
                  Go to Dashboard
                </Link>
              </Button>
            ) : (
              <>
                <Button variant="ghost" asChild>
                  <Link href={`/${locale}/auth/signin`}>Sign In</Link>
                </Button>
                <Button asChild>
                  <Link href={`/${locale}/auth/signup`}>Sign Up</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-20">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <Badge variant="secondary" className="mb-4">
            <Sparkles className="h-3 w-3 mr-1" />
            Simple, transparent pricing
          </Badge>
          <h1 className="text-5xl font-bold text-foreground mb-4">
            Choose Your Plan
          </h1>
          <p className="text-2xl text-muted-foreground max-w-2xl mx-auto">
            Start free and scale as you grow. All plans include a 14-day free trial.
          </p>
        </div>

        {/* Hybrid Model Highlight */}
        <div className="max-w-5xl mx-auto mb-16">
          <Card className="border-2 border-green-500/50 bg-gradient-to-r from-green-50/50 to-emerald-50/50 dark:from-green-950/20 dark:to-emerald-950/20">
            <CardContent className="pt-8 pb-8">
              <div className="text-center mb-6">
                <Badge className="bg-gradient-to-r from-green-500 to-emerald-600 text-white border-0 shadow-lg mb-3">
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  FLEXIBLE & FAIR PRICING
                </Badge>
                <h2 className="text-4xl font-bold text-foreground mb-2">
                  Generous Limits. Pay Only for What You Use.
                </h2>
                <p className="text-2xl text-muted-foreground">
                  Start with generous included limits. If you grow beyond them, pay only for the extra at low rates. No surprises.
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-4 max-w-4xl mx-auto">
                <div className="flex items-start gap-3 p-4 bg-white/50 dark:bg-gray-900/50 rounded-lg">
                  <div className="flex-shrink-0 mt-1">
                    <Users className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1 text-lg">
                      Members Included
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      500-5,000 members per community. Beyond that? Only $0.08-0.15 per extra member.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 bg-white/50 dark:bg-gray-900/50 rounded-lg">
                  <div className="flex-shrink-0 mt-1">
                    <Video className="h-6 w-6 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1 text-lg">
                      Video Hours Included
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      20-150 hours/month included. Need more? Only $0.15-0.30 per extra hour.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 bg-white/50 dark:bg-gray-900/50 rounded-lg">
                  <div className="flex-shrink-0 mt-1">
                    <HardDrive className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1 text-lg">
                      Storage Included
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      50-500 GB included. Growing fast? Only $0.10-0.20 per extra GB.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 text-center">
                <p className="text-lg text-muted-foreground mb-2">
                  <strong className="text-foreground">Example:</strong> You're on Professional ($99/mo) with 500 members included.
                </p>
                <p className="text-lg text-muted-foreground">
                  You grow to 600 members? Pay only <strong className="text-green-600">$15 extra</strong> (100 × $0.15) that month. 
                  Back to 450 next month? Pay only <strong className="text-green-600">$99</strong>. Fair and flexible. 
                </p>
                <p className="text-sm text-muted-foreground mt-3 opacity-75">
                  Monitor your usage in real-time from your dashboard. Always know your estimated bill before it's charged.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pricing Cards */}
        <div className="grid gap-6 lg:grid-cols-4 max-w-7xl mx-auto mb-20">
          {plans.map((plan) => {
            const Icon = plan.icon;
            const isCurrentPlan = plan.slug === currentPlan;
            
            // Determine the plan hierarchy for comparison
            const planHierarchy = ["FREE", "PROFESSIONAL", "SCALE", "ENTERPRISE"];
            const currentPlanIndex = planHierarchy.indexOf(currentPlan);
            const thisPlanIndex = planHierarchy.indexOf(plan.slug);
            const isUpgrade = thisPlanIndex > currentPlanIndex;
            const isDowngrade = thisPlanIndex < currentPlanIndex;
            
            // Determine button text and variant
            let buttonText = plan.cta;
            let buttonVariant: "default" | "outline" | "secondary" = plan.highlighted ? "default" : "outline";
            let isDisabled = false;
            
            if (isCurrentPlan) {
              buttonText = "Current Plan";
              buttonVariant = "outline";
              isDisabled = true;
            } else if (isUpgrade) {
              buttonText = `Upgrade to ${plan.name}`;
              buttonVariant = "default";
            } else if (isDowngrade && plan.slug !== "FREE") {
              buttonText = `Downgrade to ${plan.name}`;
              buttonVariant = "secondary";
            }
            
            return (
              <Card
                key={plan.slug}
                className={`relative ${
                  plan.highlighted
                    ? "border-primary shadow-2xl scale-105"
                    : "border-border"
                } ${isCurrentPlan ? "ring-2 ring-green-500" : ""}`}
              >
                {plan.badge && !isCurrentPlan && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-gradient-to-r from-primary to-purple-600 text-white border-0 shadow-lg">
                      {plan.badge}
                    </Badge>
                  </div>
                )}

                {isCurrentPlan && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-gradient-to-r from-green-500 to-emerald-600 text-white border-0 shadow-lg">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Current Plan
                    </Badge>
                  </div>
                )}

                <CardHeader className="text-center pb-8 pt-8">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-3xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="mt-5">
                    <div className="flex items-baseline justify-center gap-2">
                      <span className="text-5xl font-bold text-foreground">
                        {plan.price.monthly === null ? "Custom" : `$${plan.price.monthly}`}
                      </span>
                      <span className="text-muted-foreground">{plan.price.monthly === null ? "" : "/month"}</span>
                    </div>
                    {(plan.price.yearly ?? 0) > 0 && (
                      <div className="mt-2 text-lg text-muted-foreground">
                        or {plan.price.yearly === null ? "Custom" : `$${plan.price.yearly}`} /year (save 17%)
                      </div>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-5">
                  <Button
                    className="w-full"
                    variant={buttonVariant}
                    size="lg"
                    onClick={() => handleUpgrade(plan)}
                    disabled={isDisabled || loadingPlan === plan.slug}
                  >
                    {loadingPlan === plan.slug ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : isCurrentPlan ? (
                      <>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        {buttonText}
                      </>
                    ) : (
                      <>
                        {buttonText}
                        {!isDisabled && <ArrowRight className="ml-2 h-4 w-4" />}
                      </>
                    )}
                  </Button>

                  <div className="space-y-2.5">
                    {plan.features.map((feature, index) => (
                      <div key={index} className="flex items-start gap-2.5">
                        {feature.included ? (
                          <Check className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                        ) : (
                          <X className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                        )}
                        <span
                          className={`text-lg ${
                            feature.included
                              ? "text-foreground"
                              : "text-muted-foreground"
                          }`}
                        >
                          {feature.name}
                        </span>
                      </div>
                    ))}
                  </div>

                  {'comparison' in plan && plan.comparison && (
                    <div className="pt-3 border-t border-border">
                      <p className="text-lg text-primary font-semibold text-center">
                        {plan.comparison}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Features Section */}
        <div className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-foreground mb-4">
              Everything you need to build amazing communities
            </h2>
            <p className="text-2xl text-muted-foreground">
              Powerful features to engage, grow, and monetize your community
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card key={index} className="border-border">
                  <CardHeader>
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 mb-4">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle className="text-2xl">{feature.title}</CardTitle>
                    <CardDescription>{feature.description}</CardDescription>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </div>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-foreground mb-4">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">Can I change plans later?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg text-muted-foreground">
                  Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately,
                  and we'll prorate any payments.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">What happens after the free trial?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg text-muted-foreground">
                  Your 14-day free trial gives you full access to all features. After the trial, you'll be
                  automatically charged unless you cancel. No surprises!
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">Do you offer refunds?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg text-muted-foreground">
                  Yes! We offer a 30-day money-back guarantee. If you're not satisfied, we'll refund your
                  payment—no questions asked.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">What payment methods do you accept?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg text-muted-foreground">
                  We accept all major credit cards (Visa, Mastercard, Amex) through our secure payment
                  processor, Stripe. Enterprise customers can also pay via invoice.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-20 text-center">
          <Card className="max-w-4xl mx-auto bg-gradient-to-r from-primary/10 to-purple-600/10 border-primary/20">
            <CardHeader className="text-center pb-8 pt-12">
              <CardTitle className="text-4xl mb-4">
                Ready to build your community?
              </CardTitle>
              <CardDescription className="text-2xl">
                Join thousands of creators using Unytea to build thriving communities
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-12">
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" asChild>
                  <Link href={user ? `/${locale}/dashboard` : `/${locale}/auth/signup`}>
                    <Sparkles className="mr-2 h-5 w-5" />
                    Start Free Trial
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/contact">
                    Contact Sales
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
