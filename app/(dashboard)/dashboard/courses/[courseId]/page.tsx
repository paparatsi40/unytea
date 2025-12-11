import { notFound, redirect } from "next/navigation";
import { getCourse } from "@/app/actions/courses";
import { auth } from "@/lib/auth";
import { CourseHeader } from "@/components/courses/CourseHeader";
import { CourseContent } from "@/components/courses/CourseContent";
import { EnrollButton } from "@/components/courses/EnrollButton";

export default async function CoursePage({
  params,
}: {
  params: { courseId: string };
}) {
  const session = await auth();
  
  if (!session?.user) {
    redirect("/auth/signin");
  }

  const result = await getCourse(params.courseId);

  if (!result.success || !result.course) {
    notFound();
  }

  const { course, hasAccess, isOwner, enrollment } = result;

  return (
    <div className="min-h-screen bg-background">
      {/* Course Header */}
      <CourseHeader
        course={course}
        isOwner={isOwner}
        enrollment={enrollment}
      />

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Course Content (left) */}
          <div className="lg:col-span-2">
            <CourseContent
              course={course}
              hasAccess={hasAccess}
              isOwner={isOwner}
              enrollment={enrollment}
            />
          </div>

          {/* Sidebar (right) */}
          <div className="lg:col-span-1">
            <div className="sticky top-4 space-y-6">
              {/* Enroll Card */}
              {!hasAccess && !isOwner && (
                <div className="rounded-xl border border-border bg-card p-6">
                  <div className="mb-4">
                    <p className="text-3xl font-bold text-foreground">
                      {course.isPaid ? (
                        `$${course.price}`
                      ) : (
                        <span className="text-green-600">Free</span>
                      )}
                    </p>
                    {course.isPaid && (
                      <p className="text-sm text-muted-foreground">
                        One-time payment
                      </p>
                    )}
                  </div>
                  <EnrollButton courseId={course.id} isPaid={course.isPaid} />
                </div>
              )}

              {/* Course Info */}
              <div className="rounded-xl border border-border bg-card p-6">
                <h3 className="font-semibold text-foreground mb-4">
                  Course Info
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Modules</span>
                    <span className="font-medium text-foreground">
                      {course.modules.length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Lessons</span>
                    <span className="font-medium text-foreground">
                      {course.modules.reduce(
                        (acc, m) => acc + m.lessons.length,
                        0
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Students</span>
                    <span className="font-medium text-foreground">
                      {course.enrollmentCount}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Level</span>
                    <span className="font-medium text-foreground">
                      All Levels
                    </span>
                  </div>
                </div>
              </div>

              {/* Community Info */}
              <div className="rounded-xl border border-border bg-card p-6">
                <h3 className="font-semibold text-foreground mb-4">
                  Community
                </h3>
                <div className="flex items-center gap-3">
                  {course.community && (
                    <>
                      <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                        {course.community.name[0].toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-foreground">
                          {course.community.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Community
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
