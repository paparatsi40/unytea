"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, PlayCircle, FileText, Lock, CheckCircle2 } from "lucide-react";
import Link from "next/link";

type CourseContentProps = {
  course: any;
  hasAccess: boolean;
  isOwner?: boolean;
  enrollment?: any;
};

export function CourseContent({ course, hasAccess, isOwner, enrollment }: CourseContentProps) {
  const [expandedModules, setExpandedModules] = useState<string[]>([
    course.modules?.[0]?.id || "",
  ]);

  const toggleModule = (moduleId: string) => {
    setExpandedModules((prev) =>
      prev.includes(moduleId)
        ? prev.filter((id) => id !== moduleId)
        : [...prev, moduleId]
    );
  };

  const isLessonCompleted = (lessonId: string) => {
    if (!enrollment) return false;
    // Would need to check lessonProgress - simplified for now
    return false;
  };

  if (!course.modules || course.modules.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-12 text-center">
        <div className="w-16 h-16 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center mx-auto mb-4">
          <FileText className="h-8 w-8 text-purple-600 dark:text-purple-400" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">
          No Content Yet
        </h3>
        <p className="text-muted-foreground">
          {isOwner
            ? "Add modules and lessons to your course."
            : "This course doesn't have any content yet."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-foreground">Course Content</h2>
        <button
          onClick={() =>
            setExpandedModules(
              expandedModules.length === course.modules.length
                ? []
                : course.modules.map((m: any) => m.id)
            )
          }
          className="text-sm text-primary hover:underline"
        >
          {expandedModules.length === course.modules.length
            ? "Collapse all"
            : "Expand all"}
        </button>
      </div>

      {course.modules.map((module: any, moduleIndex: number) => {
        const isExpanded = expandedModules.includes(module.id);
        const lessonsCount = module.lessons?.length || 0;

        return (
          <div
            key={module.id}
            className="rounded-xl border border-border bg-card overflow-hidden"
          >
            {/* Module Header */}
            <button
              onClick={() => toggleModule(module.id)}
              className="w-full p-6 flex items-center justify-between hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-center gap-4 flex-1 text-left">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary font-bold">
                  {moduleIndex + 1}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground mb-1">
                    {module.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {lessonsCount} {lessonsCount === 1 ? "lesson" : "lessons"}
                  </p>
                </div>
              </div>
              {isExpanded ? (
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              )}
            </button>

            {/* Module Lessons */}
            {isExpanded && module.lessons && module.lessons.length > 0 && (
              <div className="border-t border-border bg-accent/20">
                {module.lessons.map((lesson: any, lessonIndex: number) => {
                  const isLocked = !hasAccess && !isOwner && !lesson.isFree;
                  const completed = isLessonCompleted(lesson.id);
                  const lessonHref = isLocked
                    ? "#"
                    : `/dashboard/courses/${course.id}/lessons/${lesson.id}`;

                  return (
                    <Link
                      key={lesson.id}
                      href={lessonHref}
                      className={`flex items-center gap-4 p-4 hover:bg-accent/50 transition-colors border-b border-border last:border-b-0 ${
                        isLocked ? "cursor-not-allowed opacity-60" : ""
                      }`}
                      onClick={(e) => {
                        if (isLocked) {
                          e.preventDefault();
                        }
                      }}
                    >
                      {/* Lesson Icon */}
                      <div className="flex-shrink-0">
                        {isLocked ? (
                          <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                            <Lock className="h-4 w-4 text-gray-500" />
                          </div>
                        ) : completed ? (
                          <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                          </div>
                        ) : lesson.contentType === "VIDEO" ? (
                          <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                            <PlayCircle className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                            <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                          </div>
                        )}
                      </div>

                      {/* Lesson Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">
                          {lessonIndex + 1}. {lesson.title}
                        </p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-muted-foreground capitalize">
                            {lesson.contentType?.toLowerCase() || "text"}
                          </span>
                          {lesson.duration && (
                            <>
                              <span className="text-xs text-muted-foreground">•</span>
                              <span className="text-xs text-muted-foreground">
                                {Math.ceil(lesson.duration / 60)} min
                              </span>
                            </>
                          )}
                          {lesson.isFree && (
                            <>
                              <span className="text-xs text-muted-foreground">•</span>
                              <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                                Free preview
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
