"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Check, User, Briefcase, Target, Sparkles, Zap, Crown, Heart } from "lucide-react";
import { InterestSelector } from "@/components/onboarding/InterestSelector";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const plans = [
  {
    id: "free",
    name: "Free",
    price: 0,
    priceId: "",
    description: "Perfect for exploring communities",
    features: [
      "Join up to 3 communities (no creation)",
      "Access community content & feed",
      "Direct messaging with members",
      "Basic profile features",
    ],
    icon: Sparkles,
    popular: false,
  },
  {
    id: "professional",
    name: "Professional",
    price: 49,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PROFESSIONAL_PRICE_ID || "",
    description: "Best for community creators",
    features: [
      "Create 1 community (yours)",
      "Unlimited members",
      "Video calls & streaming",
      "Course builder",
      "AI assistant",
      "Analytics dashboard",
      "Priority support",
    ],
    icon: Zap,
    popular: true,
  },
  {
    id: "premium",
    name: "Premium",
    price: 149,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID || "",
    description: "For power users with multiple communities",
    features: [
      "Create up to 3 communities",
      "All Professional features",
      "White-label options",
      "Advanced analytics",
      "API access",
      "Dedicated support",
      "Custom integrations",
    ],
    icon: Crown,
    popular: false,
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { user, isLoading } = useCurrentUser();
  // const t = useTranslations("onboarding");
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    role: "",
    goals: "",
    interests: [] as string[],
    selectedPlan: "free",
  });

  useEffect(() => {
    // Only check after user data has loaded
    if (!isLoading && user?.isOnboarded === true) {
      router.push("/dashboard");
    }
  }, [user?.isOnboarded, isLoading, router]);

  const steps = [
    {
      number: 1,
      title: "Welcome to Unytea! 🎉",
      description: "Let's get you set up in just a few steps",
      icon: User,
      fields: (
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">Full Name</label>
            <input
              type="text"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              className="w-full rounded-lg border border-border bg-background px-4 py-3 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="John Doe"
            />
          </div>
        </div>
      ),
    },
    {
      number: 2,
      title: "What brings you here?",
      description: "Tell us about your role",
      icon: Briefcase,
      fields: (
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">Your Role</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="w-full rounded-lg border border-border bg-background px-4 py-3 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">Select your role...</option>
              <option value="coach">Coach / Mentor</option>
              <option value="creator">Course Creator</option>
              <option value="founder">Community Founder</option>
              <option value="educator">Educator</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
      ),
    },
    {
      number: 3,
      title: "What are your goals?",
      description: "Help us personalize your experience",
      icon: Target,
      fields: (
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">
              Tell us about your goals
            </label>
            <textarea
              value={formData.goals}
              onChange={(e) => setFormData({ ...formData, goals: e.target.value })}
              rows={4}
              className="w-full resize-none rounded-lg border border-border bg-background px-4 py-3 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="I want to build a thriving community and share my knowledge..."
            />
          </div>
        </div>
      ),
    },
    {
      number: 4,
      title: "What are you interested in?",
      description: "Select your interests to get better community and buddy matches",
      icon: Heart,
      fields: (
        <InterestSelector
          selected={formData.interests}
          onChange={(interests) => setFormData({ ...formData, interests })}
          maxSelections={8}
        />
      ),
    },
    {
      number: 5,
      title: "Choose Your Plan",
      description: "Select the plan that fits your needs (you can change later)",
      icon: Sparkles,
      fields: (
        <div className="space-y-4">
          <div className="grid gap-4">
            {plans.map((plan) => {
              const Icon = plan.icon;
              const isSelected = formData.selectedPlan === plan.id;
              return (
                <Card
                  key={plan.id}
                  onClick={() => setFormData({ ...formData, selectedPlan: plan.id })}
                  className={`cursor-pointer p-4 transition-all ${
                    isSelected
                      ? "border-primary ring-2 ring-primary/20"
                      : "border-border hover:border-primary/50"
                  } ${plan.popular ? "relative" : ""}`}
                >
                  {plan.popular && (
                    <Badge className="absolute -top-2 left-4 bg-primary text-primary-foreground">
                      Most Popular
                    </Badge>
                  )}
                  <div className="flex items-start gap-4">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                        isSelected ? "bg-primary text-primary-foreground" : "bg-muted"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold">{plan.name}</h3>
                        <div className="text-right">
                          <span className="text-lg font-bold">
                            {plan.price === 0 ? "Free" : `$${plan.price}`}
                          </span>
                          {plan.price > 0 && (
                            <span className="text-sm text-muted-foreground">/month</span>
                          )}
                        </div>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>
                      <ul className="mt-3 space-y-1">
                        {plan.features.slice(0, 3).map((feature, i) => (
                          <li key={i} className="flex items-center gap-2 text-sm">
                            <Check className="h-4 w-4 flex-shrink-0 text-primary" />
                            <span>{feature}</span>
                          </li>
                        ))}
                        {plan.features.length > 3 && (
                          <li className="pl-6 text-sm text-muted-foreground">
                            +{plan.features.length - 3} more features
                          </li>
                        )}
                      </ul>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
          <p className="text-center text-sm text-muted-foreground">
            All paid plans include a 14-day free trial. No credit card required to start.
          </p>
        </div>
      ),
    },
  ];

  const currentStepData = steps[currentStep - 1];
  const Icon = currentStepData.icon;

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    setIsSubmitting(true);
    try {
      // Update user onboarding status with selected plan
      const response = await fetch("/api/user/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: formData.fullName,
          role: formData.role,
          goals: formData.goals,
          interests: formData.interests,
          selectedPlan: formData.selectedPlan,
        }),
      });

      if (response.ok) {
        // If user selected a paid plan, redirect to checkout
        const selectedPlanData = plans.find((p) => p.id === formData.selectedPlan);
        if (selectedPlanData && selectedPlanData.price > 0 && selectedPlanData.priceId) {
          // Redirect to Stripe checkout
          const checkoutResponse = await fetch("/api/stripe/checkout", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              priceId: selectedPlanData.priceId,
            }),
          });

          const checkoutData = await checkoutResponse.json();
          if (checkoutData.url) {
            window.location.href = checkoutData.url;
            return;
          }
        }

        // Otherwise go to dashboard
        router.push("/dashboard");
      }
    } catch (error) {
      console.error("Error completing onboarding:", error);
      // For now, redirect anyway
      router.push("/dashboard");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isStepValid = () => {
    switch (currentStep) {
      case 1:
        return formData.fullName.trim().length > 0;
      case 2:
        return formData.role.trim().length > 0;
      case 3:
        return formData.goals.trim().length > 0;
      case 4:
        return formData.interests.length >= 1;
      case 5:
        return formData.selectedPlan.length > 0;
      default:
        return false;
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">
              Step {currentStep} of {steps.length}
            </span>
            <span className="text-sm font-medium text-muted-foreground">
              {Math.round((currentStep / steps.length) * 100)}%
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-muted">
            <div
              className="h-2 rounded-full bg-primary transition-all duration-300"
              style={{ width: `${(currentStep / steps.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Step Content */}
        <div className="rounded-2xl border bg-card p-8 shadow-lg">
          {/* Icon */}
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <Icon className="h-8 w-8 text-primary" />
          </div>

          {/* Title & Description */}
          <h1 className="mb-2 text-2xl font-bold">{currentStepData.title}</h1>
          <p className="mb-8 text-muted-foreground">{currentStepData.description}</p>

          {/* Fields */}
          {currentStepData.fields}

          {/* Navigation */}
          <div className="mt-8 flex gap-4">
            {currentStep > 1 && (
              <Button variant="outline" onClick={handleBack} className="flex-1">
                Back
              </Button>
            )}
            <Button
              onClick={handleNext}
              disabled={!isStepValid() || isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
                  Setting up...
                </div>
              ) : currentStep === steps.length ? (
                formData.selectedPlan === "free" ? (
                  "Start Free"
                ) : (
                  "Start Free Trial"
                )
              ) : (
                "Continue"
              )}
            </Button>
          </div>
        </div>

        {/* Skip Option */}
        <div className="mt-6 text-center">
          <button
            onClick={() => router.push("/dashboard")}
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Skip for now →
          </button>
        </div>
      </div>
    </div>
  );
}
