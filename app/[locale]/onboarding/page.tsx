"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Check, User, Briefcase, Target } from "lucide-react";

export default function OnboardingPage() {
  const router = useRouter();
  const { user, isLoading } = useCurrentUser();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    fullName: "",
    role: "",
    goals: "",
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
    try {
      // Update user onboarding status
      const response = await fetch("/api/user/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: formData.fullName,
          role: formData.role,
          goals: formData.goals,
        }),
      });

      if (response.ok) {
        router.push("/dashboard");
      }
    } catch (error) {
      console.error("Error completing onboarding:", error);
      // For now, redirect anyway
      router.push("/dashboard");
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
      default:
        return false;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    router.push("/auth/signin");
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Progress Steps */}
        <div className="mb-8 flex items-center justify-center">
          {steps.map((step, index) => (
            <div key={step.number} className="flex items-center">
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all ${
                  step.number < currentStep
                    ? "border-primary bg-primary text-primary-foreground"
                    : step.number === currentStep
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground"
                }`}
              >
                {step.number < currentStep ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <span className="text-sm font-semibold">{step.number}</span>
                )}
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`w-16 h-0.5 mx-2 transition-all ${
                    step.number < currentStep ? "bg-primary" : "bg-border"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="bg-card/50 backdrop-blur-xl rounded-2xl shadow-2xl border border-border p-8">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="p-4 rounded-full bg-primary/10">
              <Icon className="h-8 w-8 text-primary" />
            </div>
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-center text-foreground mb-2">
            {currentStepData.title}
          </h2>
          <p className="text-center text-muted-foreground mb-8">
            {currentStepData.description}
          </p>

          {/* Fields */}
          <div className="mb-8">{currentStepData.fields}</div>

          {/* Buttons */}
          <div className="flex gap-4">
            {currentStep > 1 && (
              <button
                onClick={handleBack}
                className="flex-1 px-6 py-3 rounded-lg border border-border bg-background text-foreground hover:bg-accent transition-colors font-medium"
              >
                Back
              </button>
            )}
            <button
              onClick={handleNext}
              disabled={!isStepValid()}
              className="flex-1 px-6 py-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {currentStep === steps.length ? "Get Started" : "Continue"}
            </button>
          </div>

          {/* Step indicator */}
          <div className="mt-6 text-center text-sm text-muted-foreground">
            Step {currentStep} of {steps.length}
          </div>
        </div>
      </div>
    </div>
  );
}
