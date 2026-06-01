import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getTodayDashboard } from "@/app/actions/today-dashboard";
import { getOnboardingProgress } from "@/app/actions/onboarding";
import { DashboardHomeView } from "@/components/dashboard/home/DashboardHomeView";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/signin?callbackUrl=/dashboard");
  }

  const [data, onboarding] = await Promise.all([getTodayDashboard(), getOnboardingProgress()]);

  if (!data) {
    redirect("/auth/signin?callbackUrl=/dashboard");
  }

  // Only surface the checklist for new users who haven't finished it.
  const onboardingProgress =
    onboarding.success && onboarding.showChecklist && onboarding.progress
      ? onboarding.progress
      : null;

  return <DashboardHomeView data={data} onboardingProgress={onboardingProgress} />;
}
