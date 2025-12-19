"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, PlayCircle, FileText, Lock, X, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

type LessonSidebarProps = {
  course: any;
  currentLessonId: string;
  hasAccess: boolean;
  isOwner?: boolean;
};

export function LessonSidebar({ course, currentLessonId, hasAccess, isOwner }: LessonSidebarProps) {
  const [expandedModules, setExpandedModules] = useState<string[]>(
    course.modules?.map((m: any) => m.id) || []
  );
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const toggleModule = (moduleId: string) => {
    setExpandedModules((prev) =>
      prev.includes(moduleId)
        ? prev.filter((id) => id !== moduleId)
        : [...prev, moduleId]
    );
  };

  const sidebarContent = (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <Link
          href={`/dashboard/courses/${course.id}`}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Back to Course
        </Link>
        <h2 className="font-bold text-foreground mt-2 line-clamp-2">
          {course.title}
        </h2>
      </div>

      {/* Modules and Lessons */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {course.modules?.map((module: any, moduleIndex: number) => {
          const isExpanded = expandedModules.includes(module.id);

          return (
            <div key={module.id} className="rounded-lg border border-border overflow-hidden">
              {/* Module Header */}
              <button
                onClick={() => toggleModule(module.id)}
                className="w-full p-3 flex items-center justify-between hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-2 flex-1 text-left">
                  <span className="font-semibold text-sm text-foreground">
                    {moduleIndex + 1}. {module.title}
                  </span>
                </div>
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                )}
              </button>

              {/* Lessons List */}
              {isExpanded && module.lessons && (
                <div className="border-t border-border bg-accent/20">
                  {module.lessons.map((lesson: any, lessonIndex: number) => {
                    const isLocked = !hasAccess && !isOwner && !lesson.isFree;
                    const isCurrent = lesson.id === currentLessonId;

                    return (
                      <Link
                        key={lesson.id}
                        href={isLocked ? "#" : `/dashboard/courses/${course.id}/lessons/${lesson.id}`}
                        onClick={(e) => {
                          if (isLocked) e.preventDefault();
                          if (isMobileOpen) setIsMobileOpen(false);
                        }}
                        className={`flex items-center gap-3 p-3 border-b border-border last:border-b-0 transition-colors ${
                          isCurrent
                            ? "bg-primary/10 border-l-4 border-l-primary"
                            : "hover:bg-accent/50"
                        } ${isLocked ? "cursor-not-allowed opacity-60" : ""}`}
                      >
                        {/* Icon */}
                        <div className="flex-shrink-0">
                          {isLocked ? (
                            <Lock className="h-4 w-4 text-muted-foreground" />
                          ) : lesson.contentType === "VIDEO" ? (
                            <PlayCircle className="h-4 w-4 text-primary" />
                          ) : (
                            <FileText className="h-4 w-4 text-primary" />
                          )}
                        </div>

                        {/* Title */}
                        <span className="text-sm text-foreground flex-1 line-clamp-2">
                          {lessonIndex + 1}. {lesson.title}
                        </span>

                        {/* Duration or Status */}
                        {lesson.duration && (
                          <span className="text-xs text-muted-foreground flex-shrink-0">
                            {Math.ceil(lesson.duration / 60)}m
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Menu Button */}
      <Button
        variant="outline"
        size="icon"
        className="fixed top-4 left-4 z-50 lg:hidden"
        onClick={() => setIsMobileOpen(!isMobileOpen)}
      >
        {isMobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </Button>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:sticky top-0 left-0 h-screen w-80 bg-card border-r border-border z-40
          transition-transform duration-300 lg:translate-x-0
          ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
