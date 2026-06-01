import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getUserEnrollments } from "@/app/actions/courses";
import { BookOpen, GraduationCap, Plus, TrendingUp } from "lucide-react";
import Link from "next/link";
import { CourseCard } from "@/components/courses/CourseCard";

// Extracted from the former /dashboard/courses page (Sub-Phase E Commit 3).
// Renders inside the Library "Courses" tab; the page-level title/header lives
// in the Library page, so only the action row + content are kept here.
export async function CoursesTab() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  const result = await getUserEnrollments();

  if (!result.success || !result.enrollments) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <BookOpen className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <h2 className="mb-2 text-xl font-semibold text-foreground">Failed to load courses</h2>
          <p className="text-muted-foreground">{result.error || "An error occurred"}</p>
        </div>
      </div>
    );
  }

  const enrollments = result.enrollments;
  const inProgress = enrollments.filter((e) => e.progress > 0 && e.progress < 100);
  const completed = enrollments.filter((e) => e.progress === 100);
  const notStarted = enrollments.filter((e) => e.progress === 0);

  return (
    <div className="space-y-8">
      {/* Action row */}
      <div className="flex justify-end">
        <Link
          href="/dashboard/courses/browse"
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Browse Courses
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-border/50 bg-card/50 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
              <BookOpen className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{enrollments.length}</p>
              <p className="text-sm text-muted-foreground">Total Enrolled</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border/50 bg-card/50 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
              <TrendingUp className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{inProgress.length}</p>
              <p className="text-sm text-muted-foreground">In Progress</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border/50 bg-card/50 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10">
              <GraduationCap className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{completed.length}</p>
              <p className="text-sm text-muted-foreground">Completed</p>
            </div>
          </div>
        </div>
      </div>

      {/* In Progress Courses */}
      {inProgress.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-foreground" />
            <h2 className="text-2xl font-bold text-foreground">Continue Learning</h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {inProgress.map((enrollment) => (
              <CourseCard
                key={enrollment.id}
                course={enrollment.course}
                progress={enrollment.progress}
              />
            ))}
          </div>
        </div>
      )}

      {/* Not Started */}
      {notStarted.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-foreground" />
            <h2 className="text-2xl font-bold text-foreground">Not Started</h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {notStarted.map((enrollment) => (
              <CourseCard key={enrollment.id} course={enrollment.course} progress={0} />
            ))}
          </div>
        </div>
      )}

      {/* Completed */}
      {completed.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-2xl font-bold text-foreground">Completed</h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {completed.map((enrollment) => (
              <CourseCard key={enrollment.id} course={enrollment.course} progress={100} completed />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {enrollments.length === 0 && (
        <div className="rounded-xl border border-border/50 bg-card/50 p-12 text-center">
          <GraduationCap className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
          <h3 className="mb-2 text-xl font-semibold text-foreground">No courses yet</h3>
          <p className="mb-6 text-muted-foreground">
            Browse available courses and start learning today
          </p>
          <Link
            href="/dashboard/courses/browse"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Browse Courses
          </Link>
        </div>
      )}
    </div>
  );
}
