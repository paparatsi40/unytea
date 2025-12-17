import { getAvailableCourses } from "@/app/actions/courses";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { BookOpen, Plus } from "lucide-react";
import Link from "next/link";
import { CourseCard } from "@/components/courses/CourseCard";

export const metadata = {
  title: "Browse Courses | Unytea",
  description: "Explore all available courses and enroll.",
};

export default async function BrowseCoursesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const result = await getAvailableCourses();

  return (
    <div className="space-y-8 p-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/10">
            <BookOpen className="h-6 w-6 text-indigo-500" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Browse Courses</h1>
            <p className="text-muted-foreground">Available courses to enroll in</p>
          </div>
        </div>
        <Link
          href={`/${locale}/dashboard/courses/create`}
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Create Course
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {result.success && result.courses && result.courses.length > 0 ? (
          result.courses.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))
        ) : (
          <div className="col-span-full text-center text-muted-foreground py-12">
            <p>No courses available yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
