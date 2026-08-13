"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCurrentUser } from "@/hooks/use-current-user";
import { AlertTriangle, User, Briefcase, Target, Heart } from "lucide-react";
import { InterestSelector } from "@/components/onboarding/InterestSelector";
import { Button } from "@/components/ui/button";

/**
 * Onboarding is four steps and ends on the free plan.
 *
 * It used to end on a fifth step that asked a brand-new user to choose between
 * Free / Professional $49 / Premium $149 and sent paid picks straight to Stripe
 * checkout. Three things were wrong with that:
 *
 *   1. It asked for a monetization decision before the user had seen the
 *      product. The decision now happens where the value is obvious — at the
 *      community-creation wall, which already gates on the plan limit and
 *      offers the upgrade surface.
 *   2. Those plans no longer exist. The product sells Creator / Business / Pro
 *      (lib/plans.ts, billing.tiers); the step advertised a retired lineup
 *      priced off NEXT_PUBLIC_STRIPE_PROFESSIONAL_PRICE_ID and
 *      NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID, which are set nowhere.
 *   3. Because those price IDs were empty, picking a paid plan silently fell
 *      through to the dashboard on the free plan — the "checkout drops you
 *      without your plan" symptom.
 *
 * Nothing about paid plans was deleted: checkout, billing and the plan gate are
 * untouched. Only the point at which the question is asked has moved.
 */

const ROLES = ["coach", "creator", "founder", "educator", "other"] as const;

export default function OnboardingPage() {
  const router = useRouter();
  const { user, isLoading } = useCurrentUser();
  const t = useTranslations("onboarding");
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  /** Non-null only after a failed save; blocks the redirect and is shown. */
  const [saveError, setSaveError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    fullName: "",
    role: "",
    goals: "",
    interests: [] as string[],
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
      title: t("steps.1.title"),
      description: t("steps.1.description"),
      icon: User,
      fields: (
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">
              {t("steps.1.fullName")}
            </label>
            <input
              type="text"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              className="w-full rounded-lg border border-border bg-background px-4 py-3 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder={t("steps.1.fullNamePlaceholder")}
            />
          </div>
        </div>
      ),
    },
    {
      number: 2,
      title: t("steps.2.title"),
      description: t("steps.2.description"),
      icon: Briefcase,
      fields: (
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">
              {t("steps.2.role")}
            </label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="w-full rounded-lg border border-border bg-background px-4 py-3 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">{t("steps.2.rolePlaceholder")}</option>
              {ROLES.map((role) => (
                <option key={role} value={role}>
                  {t(`steps.2.roles.${role}`)}
                </option>
              ))}
            </select>
          </div>
        </div>
      ),
    },
    {
      number: 3,
      title: t("steps.3.title"),
      description: t("steps.3.description"),
      icon: Target,
      fields: (
        <div className="space-y-4">
          <div>
            {/* Optional, and labelled as such. Requiring a paragraph of prose
                from someone three screens into signing up is the kind of
                friction that loses completions, and nothing downstream depends
                on it — the API composes a bio from whatever is present. */}
            <label className="mb-2 block text-sm font-medium text-foreground">
              {t("steps.3.goals")}{" "}
              <span className="font-normal text-muted-foreground">
                ({t("steps.3.optionalLabel")})
              </span>
            </label>
            <textarea
              value={formData.goals}
              onChange={(e) => setFormData({ ...formData, goals: e.target.value })}
              rows={4}
              className="w-full resize-none rounded-lg border border-border bg-background px-4 py-3 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder={t("steps.3.goalsPlaceholder")}
            />
          </div>
        </div>
      ),
    },
    {
      number: 4,
      title: t("steps.4.title"),
      description: t("steps.4.description"),
      icon: Heart,
      fields: (
        <InterestSelector
          selected={formData.interests}
          onChange={(interests) => setFormData({ ...formData, interests })}
          maxSelections={8}
        />
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
    setSaveError(null);

    try {
      const response = await fetch("/api/user/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: formData.fullName,
          role: formData.role,
          goals: formData.goals,
          interests: formData.interests,
        }),
      });

      if (!response.ok) {
        // Previously this fell through to router.push("/dashboard"): the user
        // was told they were set up while their name, role and interests had
        // been thrown away, and the next screen quietly asked them to onboard
        // again. Stay put, say so, and let the same button retry.
        setSaveError(response.status === 400 ? t("errors.invalidDetails") : t("errors.saveFailed"));
        setIsSubmitting(false);
        return;
      }

      router.push("/dashboard");
    } catch (error) {
      console.error("Error completing onboarding:", error);
      setSaveError(t("errors.network"));
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
        // Goals are optional — see the label above.
        return true;
      case 4:
        return formData.interests.length >= 1;
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
              {t("navigation.stepOf", { current: currentStep, total: steps.length })}
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

          {/* Save failure. Rendered above the buttons so the retry sits next to
              the explanation, and role="alert" so it is announced. */}
          {saveError && (
            <div
              role="alert"
              className="mt-6 flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-4"
            >
              <AlertTriangle
                className="mt-0.5 h-4 w-4 flex-shrink-0 text-destructive"
                aria-hidden="true"
              />
              <div>
                <p className="text-sm font-medium text-foreground">{t("errors.title")}</p>
                <p className="mt-1 text-sm text-muted-foreground">{saveError}</p>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="mt-8 flex gap-4">
            {currentStep > 1 && (
              <Button variant="outline" onClick={handleBack} className="flex-1">
                {t("navigation.back")}
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
                  {t("navigation.settingUp")}
                </div>
              ) : currentStep === steps.length ? (
                saveError ? (
                  t("errors.retry")
                ) : (
                  t("navigation.getStarted")
                )
              ) : (
                t("navigation.continue")
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
            {t("navigation.skip")}
          </button>
        </div>
      </div>
    </div>
  );
}
