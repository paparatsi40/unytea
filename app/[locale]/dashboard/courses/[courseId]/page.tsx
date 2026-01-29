import { notFound, redirect } from "next/navigation";
import { getCourse } from "@/app/actions/courses";
import { auth } from "@/lib/auth";
import { CoursePageClient } from "@/components/courses/CoursePageClient";

export default async function CoursePage({
  params,
}: {
  params: Promise<{ courseId: string; locale: string }>;
}) {
  const { courseId, locale } = await params;
  const session = await auth();
  
  if (!session?.user) {
    redirect("/auth/signin");
  }

  const result = await getCourse(courseId);

  if (!result.success || !result.course) {
    notFound();
  }

  const { course, hasAccess, isOwner, enrollment } = result;

  // Convert hasAccess to boolean if it's an object
  const hasAccessBoolean = typeof hasAccess === 'boolean' ? hasAccess : !!hasAccess;

  // What You'll Learn & Testimonials
  const whatYouWillLearn = Array.isArray(course.whatYouWillLearn) 
    ? course.whatYouWillLearn 
    : (course.whatYouWillLearn ? [course.whatYouWillLearn] : []);
  const testimonials = Array.isArray(course.testimonials) ? course.testimonials : [];
  const previewVideoUrl = course.previewVideoUrl;

  // Upgrade suggestion: find suggested course
  let upgradeCourse = null;
  if (course.upgradeCourseId) {
    // For demo, just say 'Upgrade to premium course' (could be improved to fetch full info)
    upgradeCourse = { id: course.upgradeCourseId, title: "Premium Masterclass" };
  }

  const moduleCount = course.modules?.length || 0;
  const lessonCount = course.modules?.reduce((acc: number, m: any) => acc + m.lessons.length, 0) || 0;

  return (
    <CoursePageClient
      course={course}
      hasAccess={hasAccessBoolean}
      isOwner={isOwner}
      enrollment={enrollment}
      whatYouWillLearn={whatYouWillLearn}
      testimonials={testimonials}
      previewVideoUrl={previewVideoUrl}
      upgradeCourse={upgradeCourse}
      moduleCount={moduleCount}
      lessonCount={lessonCount}
      locale={locale}
    />
  );
}
