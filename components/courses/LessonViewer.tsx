"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock, FileText, PlayCircle, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { markLessonComplete } from "@/app/actions/courses";
import ReactMarkdown from "react-markdown";

type LessonViewerProps = {
  lesson: any;
  module: any;
  course: any;
  isOwner?: boolean;
};

export function LessonViewer({ lesson, module, course, isOwner }: LessonViewerProps) {
  const router = useRouter();
  const [isCompleting, setIsCompleting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  const handleComplete = async () => {
    setIsCompleting(true);
    try {
      const result = await markLessonComplete(lesson.id);
      if (result.success) {
        setIsCompleted(true);
        router.refresh();
      }
    } catch (error) {
      console.error("Failed to mark complete:", error);
    } finally {
      setIsCompleting(false);
    }
  };

  // Find next lesson
  const allLessons: any[] = [];
  course.modules.forEach((mod: any) => {
    mod.lessons.forEach((les: any) => {
      allLessons.push({ ...les, moduleId: mod.id });
    });
  });
  const currentIndex = allLessons.findIndex((l) => l.id === lesson.id);
  const nextLesson = currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null;
  const prevLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null;

  return (
    <div className="h-screen overflow-y-auto">
      {/* Video Section */}
      {lesson.contentType === "VIDEO" && lesson.videoUrl && (
        <div className="bg-black aspect-video max-h-[60vh]">
          <iframe
            src={lesson.videoUrl}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}

      {/* Content Section */}
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <span>{module.title}</span>
            <span>•</span>
            <div className="flex items-center gap-1">
              {lesson.contentType === "VIDEO" ? (
                <PlayCircle className="h-4 w-4" />
              ) : (
                <FileText className="h-4 w-4" />
              )}
              <span className="capitalize">{lesson.contentType?.toLowerCase() || "Text"}</span>
            </div>
            {lesson.duration && (
              <>
                <span>•</span>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>{Math.ceil(lesson.duration / 60)} min</span>
                </div>
              </>
            )}
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-4">
            {lesson.title}
          </h1>

          {/* Complete Button */}
          {!isOwner && (
            <Button
              onClick={handleComplete}
              disabled={isCompleting || isCompleted}
              className={isCompleted ? "bg-green-600 hover:bg-green-700" : ""}
            >
              {isCompleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Marking Complete...
                </>
              ) : isCompleted ? (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Completed!
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Mark as Complete
                </>
              )}
            </Button>
          )}
        </div>

        {/* Lesson Content */}
        <div className="prose prose-lg dark:prose-invert max-w-none mb-8">
          <ReactMarkdown>{lesson.content || "No content available."}</ReactMarkdown>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-8 border-t border-border">
          {prevLesson ? (
            <Button
              variant="outline"
              onClick={() => router.push(`/dashboard/courses/${course.id}/lessons/${prevLesson.id}`)}
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Previous Lesson
            </Button>
          ) : (
            <div />
          )}

          {nextLesson ? (
            <Button
              onClick={() => router.push(`/dashboard/courses/${course.id}/lessons/${nextLesson.id}`)}
            >
              Next Lesson
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={() => router.push(`/dashboard/courses/${course.id}`)}
            >
              Back to Course
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
