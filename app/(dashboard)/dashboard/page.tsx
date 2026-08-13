import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getTodayDashboard } from "@/app/actions/today-dashboard";
import { getOnboardingProgress } from "@/app/actions/onboarding";
import { DashboardHomeView } from "@/components/dashboard/home/DashboardHomeView";
import { isActionFailure } from "@/lib/actions/errors";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/signin?callbackUrl=/dashboard");
  }

  const [dataResult, onboarding] = await Promise.all([
    getTodayDashboard(),
    getOnboardingProgress(),
  ]);

  // Both actions can return an ActionFailure; neither may be read as data.
  if (!dataResult || isActionFailure(dataResult)) {
    redirect("/auth/signin?callbackUrl=/dashboard");
  }
  const data = dataResult;

  // Only surface the checklist for new users who haven't finished it.
  const onboardingProgress =
    !isActionFailure(onboarding) && onboarding.success && onboarding.showChecklist && onboarding.progress
      ? onboarding.progress
      : null;

  return <DashboardHomeView data={data} onboardingProgress={onboardingProgress} />;
}
