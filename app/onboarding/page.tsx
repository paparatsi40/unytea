"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Check, User, Briefcase, Target, Sparkles, Zap, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const plans = [
  {
    id: "free",
    name: "Free",
    price: 0,
    priceId: "",
    description: "Perfect for getting started",
    features: [
      "Join up to 3 communities",
      "Basic profile features",
      "Community feed access",
      "Direct messaging",
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
      "1 community (yours)",
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
      "3 communities (yours)",
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
    selectedPlan: "free",
  });

  useEffect(() => {
    // If user is already onboarded, redirect to dashboard
    if (user?.isOnboarded) {
      router.push("/dashboard");
    }
  }, [user, router]);

  const steps = [
    {
      number: 1,
      title: "Welcome to Unytea! 🎉",
      description: "Let's get you set up in just a few steps",
      icon: User,
      fields: (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Full Name
            </label>
            <input
              type="text"
              value={formData.fullName}
              onChange={(e) =>
                setFormData({ ...formData, fullName: e.target.value })
              }
              className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
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
            <label className="block text-sm font-medium text-foreground mb-2">
              Your Role
            </label>
            <select
              value={formData.role}
              onChange={(e) =>
                setFormData({ ...formData, role: e.target.value })
              }
              className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
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
            <label className="block text-sm font-medium text-foreground mb-2">
              Tell us about your goals
            </label>
            <textarea
              value={formData.goals}
              onChange={(e) =>
                setFormData({ ...formData, goals: e.target.value })
              }
              rows={4}
              className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
              placeholder="I want to build a thriving community and share my knowledge..."
            />
          </div>
        </div>
      ),
    },
    {
      number: 4,
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
                  className={`p-4 cursor-pointer transition-all ${
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
                      className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        isSelected ? "bg-primary text-primary-foreground" : "bg-muted"
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold">{plan.name}</h3>
                        <div className="text-right">
                          <span className="text-lg font-bold">
                            {plan.price === 0 ? "Free" : `$${plan.price}`}
                          </span>
                          {plan.price > 0 && (
                            <span className="text-muted-foreground text-sm">/month</span>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {plan.description}
                      </p>
                      <ul className="mt-3 space-y-1">
                        {plan.features.slice(0, 3).map((feature, i) => (
                          <li key={i} className="flex items-center gap-2 text-sm">
                            <Check className="w-4 h-4 text-primary flex-shrink-0" />
                            <span>{feature}</span>
                          </li>
                        ))}
                        {plan.features.length > 3 && (
                          <li className="text-sm text-muted-foreground pl-6">
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
          <p className="text-sm text-muted-foreground text-center">
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
        return formData.selectedPlan.length > 0;
      default:
        return false;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">
              Step {currentStep} of {steps.length}
            </span>
            <span className="text-sm font-medium text-muted-foreground">
              {Math.round((currentStep / steps.length) * 100)}%
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / steps.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-card rounded-2xl shadow-lg p-8 border">
          {/* Icon */}
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-6">
            <Icon className="w-8 h-8 text-primary" />
          </div>

          {/* Title & Description */}
          <h1 className="text-2xl font-bold mb-2">{currentStepData.title}</h1>
          <p className="text-muted-foreground mb-8">
            {currentStepData.description}
          </p>

          {/* Fields */}
          {currentStepData.fields}

          {/* Navigation */}
          <div className="flex gap-4 mt-8">
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
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
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
        <div className="text-center mt-6">
          <button
            onClick={() => router.push("/dashboard")}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Skip for now →
          </button>
        </div>
      </div>
    </div>
  );
}
