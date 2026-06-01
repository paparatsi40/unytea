import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getUserEnrollments } from "@/app/actions/courses";
import { CoursesTabView } from "./CoursesTabView";

// Server-thin: fetches enrollments server-side and hands them to the client
// view, which localizes via useTranslations (the dashboard route group has no
// [locale] segment, so server-side getTranslations would not see the user's
// locale).
export async function CoursesTab() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  const result = await getUserEnrollments();
  return <CoursesTabView result={result} />;
}
