"use client";

import {
  CheckCircle,
  Circle,
  Lock,
  PlayCircle,
  FileText,
  Award,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";

interface LessonProgress {
  id: string;
  title: string;
  contentType: string;
  duration?: number | null;
  isCompleted: boolean;
  isFree: boolean;
  hasQuiz: boolean;
  quizPassed?: boolean;
}

interface ModuleProgress {
  id: string;
  title: string;
  description?: string | null;
  lessons: LessonProgress[];
  completedCount: number;
  totalCount: number;
}

interface CourseProgressProps {
  modules: ModuleProgress[];
  overallProgress: number;
  isEnrolled: boolean;
  hasAccess: boolean;
  onLessonClick?: (lessonId: string) => void;
  currentLessonId?: string;
  certificateEarned?: boolean;
  onClaimCertificate?: () => void;
}

export function CourseProgress({
  modules,
  overallProgress,
  isEnrolled,
  hasAccess,
  onLessonClick,
  currentLessonId,
  certificateEarned,
  onClaimCertificate,
}: CourseProgressProps) {
  const [expandedModules, setExpandedModules] = useState<Set<string>>(
    () => new Set(modules.map((m) => m.id))
  );

  const toggleModule = (moduleId: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(moduleId)) next.delete(moduleId);
      else next.add(moduleId);
      return next;
    });
  };

  const totalLessons = modules.reduce((sum, m) => sum + m.totalCount, 0);
  const completedLessons = modules.reduce(
    (sum, m) => sum + m.completedCount,
    0
  );

  return (
    <div className="space-y-4">
      {/* Overall Progress Header */}
      {isEnrolled && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm text-zinc-400">Course Progress</span>
            <span className="text-sm font-medium text-white">
              {completedLessons}/{totalLessons} lessons
            </span>
          </div>
          <div className="mb-2 h-2.5 overflow-hidden rounded-full bg-zinc-800">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                overallProgress === 100
                  ? "bg-gradient-to-r from-emerald-500 to-emerald-400"
                  : "bg-gradient-to-r from-purple-600 to-indigo-500"
              }`}
              style={{ width: `${overallProgress}%` }}
            />
          </div>
          <p className="text-xs text-zinc-500">
            {Math.round(overallProgress)}% complete
          </p>

          {/* Certificate CTA */}
          {overallProgress === 100 && !certificateEarned && (
            <button
              onClick={onClaimCertificate}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:from-purple-500 hover:to-indigo-500"
            >
              <Award className="h-4 w-4" />
              Claim Your Certificate
            </button>
          )}

          {certificateEarned && (
            <div className="mt-3 flex items-center justify-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-2.5">
              <Award className="h-4 w-4 text-emerald-400" />
              <span className="text-sm text-emerald-400">
                Certificate Earned!
              </span>
            </div>
          )}
        </div>
      )}

      {/* Module List */}
      {modules.map((mod) => {
        const isExpanded = expandedModules.has(mod.id);
        const moduleProgress =
          mod.totalCount > 0
            ? Math.round((mod.completedCount / mod.totalCount) * 100)
            : 0;

        return (
          <div
            key={mod.id}
            className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden"
          >
            {/* Module Header */}
            <button
              onClick={() => toggleModule(mod.id)}
              className="flex w-full items-center gap-3 p-4 text-left hover:bg-zinc-800/30"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 shrink-0 text-zinc-500" />
              ) : (
                <ChevronRight className="h-4 w-4 shrink-0 text-zinc-500" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-white">{mod.title}</p>
                {mod.description && (
                  <p className="truncate text-xs text-zinc-500">
                    {mod.description}
                  </p>
                )}
              </div>
              {isEnrolled && (
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-16 overflow-hidden rounded-full bg-zinc-800">
                    <div
                      className="h-full rounded-full bg-purple-600"
                      style={{ width: `${moduleProgress}%` }}
                    />
                  </div>
                  <span className="text-xs text-zinc-500">
                    {mod.completedCount}/{mod.totalCount}
                  </span>
                </div>
              )}
            </button>

            {/* Lessons */}
            {isExpanded && (
              <div className="border-t border-zinc-800">
                {mod.lessons.map((lesson) => {
                  const isCurrent = lesson.id === currentLessonId;
                  const canAccess = hasAccess || lesson.isFree;

                  return (
                    <button
                      key={lesson.id}
                      onClick={() =>
                        canAccess && onLessonClick?.(lesson.id)
                      }
                      disabled={!canAccess}
                      className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${
                        isCurrent
                          ? "bg-purple-500/10 border-l-2 border-purple-500"
                          : "hover:bg-zinc-800/30 border-l-2 border-transparent"
                      } ${!canAccess ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      {/* Status icon */}
                      <div className="shrink-0">
                        {!canAccess ? (
                          <Lock className="h-4 w-4 text-zinc-600" />
                        ) : lesson.isCompleted ? (
                          <CheckCircle className="h-4 w-4 text-emerald-400" />
                        ) : isCurrent ? (
                          <PlayCircle className="h-4 w-4 text-purple-400" />
                        ) : (
                          <Circle className="h-4 w-4 text-zinc-600" />
                        )}
                      </div>

                      {/* Lesson info */}
                      <div className="min-w-0 flex-1">
                        <p
                          className={`text-sm ${
                            lesson.isCompleted
                              ? "text-zinc-400"
                              : isCurrent
                                ? "text-white font-medium"
                                : "text-zinc-300"
                          }`}
                        >
                          {lesson.title}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-zinc-600">
                          {lesson.contentType === "VIDEO" && (
                            <span className="flex items-center gap-0.5">
                              <PlayCircle className="h-3 w-3" />
                              Video
                            </span>
                          )}
                          {lesson.contentType === "TEXT" && (
                            <span className="flex items-center gap-0.5">
                              <FileText className="h-3 w-3" />
                              Text
                            </span>
                          )}
                          {lesson.duration && (
                            <span>{lesson.duration} min</span>
                          )}
                          {lesson.hasQuiz && (
                            <span
                              className={`flex items-center gap-0.5 ${
                                lesson.quizPassed
                                  ? "text-emerald-500"
                                  : "text-amber-500"
                              }`}
                            >
                              Quiz
                              {lesson.quizPassed && (
                                <CheckCircle className="h-3 w-3" />
                              )}
                            </span>
                          )}
                          {lesson.isFree && !hasAccess && (
                            <span className="text-purple-400">Free</span>
                          )}
                        </div>
                      </div>
                    </button>
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
