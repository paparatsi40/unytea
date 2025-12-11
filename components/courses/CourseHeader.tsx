import { Book, Users, Clock, CheckCircle2, Edit } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

type CourseHeaderProps = {
  course: any;
  isOwner?: boolean;
  enrollment?: any;
};

export function CourseHeader({ course, isOwner, enrollment }: CourseHeaderProps) {
  return (
    <div className="border-b border-border bg-gradient-to-br from-purple-50/50 via-white to-pink-50/50 dark:from-purple-950/20 dark:via-background dark:to-pink-950/20">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl">
          {/* Breadcrumb */}
          <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/dashboard/courses" className="hover:text-foreground transition-colors">
              Courses
            </Link>
            <span>/</span>
            <span className="text-foreground">{course.title}</span>
          </div>

          {/* Course Title & Actions */}
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1">
              <h1 className="text-4xl font-bold text-foreground mb-3">
                {course.title}
              </h1>
              {course.description && (
                <p className="text-lg text-muted-foreground max-w-2xl">
                  {course.description}
                </p>
              )}
            </div>

            {isOwner && (
              <Link href={`/dashboard/courses/${course.id}/edit`}>
                <Button variant="outline">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Course
                </Button>
              </Link>
            )}
          </div>

          {/* Course Meta */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-6">
            <div className="flex items-center gap-2">
              <Book className="h-4 w-4" />
              <span>{course.modules?.length || 0} modules</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span>{course.enrollmentCount} students</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>Self-paced</span>
            </div>
            {!course.isPaid && (
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400 font-medium">
                <CheckCircle2 className="h-4 w-4" />
                <span>Free</span>
              </div>
            )}
          </div>

          {/* Enrollment Progress */}
          {enrollment && (
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-foreground">
                  Your Progress
                </span>
                <span className="text-sm font-bold text-primary">
                  {Math.round(enrollment.progress || 0)}%
                </span>
              </div>
              <Progress value={enrollment.progress || 0} className="h-2" />
              {enrollment.progress === 100 && (
                <p className="text-xs text-green-600 dark:text-green-400 mt-2 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Completed!
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
