import { notFound, redirect } from "next/navigation";
import { getCourse } from "@/app/actions/courses";
import { auth } from "@/lib/auth";
import { LessonViewer } from "@/components/courses/LessonViewer";
import { LessonSidebar } from "@/components/courses/LessonSidebar";

export default async function LessonPage({
  params,
}: {
  params: { courseId: string; lessonId: string };
}) {
  const session = await auth();
  
  if (!session?.user) {
    redirect("/auth/signin");
  }

  const result = await getCourse(params.courseId);

  if (!result.success || !result.course) {
    notFound();
  }

  const { course, hasAccess, isOwner } = result;

  // Convert hasAccess to boolean if it's an object
  const hasAccessBoolean = typeof hasAccess === 'boolean' ? hasAccess : !!hasAccess;

  // Find the lesson
  let currentLesson: any = null;
  let currentModule: any = null;
  
  for (const module of course.modules) {
    const lesson = module.lessons.find((l: any) => l.id === params.lessonId);
    if (lesson) {
      currentLesson = lesson;
      currentModule = module;
      break;
    }
  }

  if (!currentLesson) {
    notFound();
  }

  // Check access
  if (!hasAccessBoolean && !isOwner && !currentLesson.isFree) {
    redirect(`/dashboard/courses/${params.courseId}`);
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar with course navigation */}
      <LessonSidebar
        course={course}
        currentLessonId={params.lessonId}
        hasAccess={hasAccessBoolean}
        isOwner={isOwner}
      />

      {/* Main content */}
      <div className="flex-1">
        <LessonViewer
          lesson={currentLesson}
          module={currentModule}
          course={course}
          isOwner={isOwner}
        />
      </div>
    </div>
  );
}
