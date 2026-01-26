import { notFound, redirect } from "next/navigation";
import { getCourse } from "@/app/actions/courses";
import { auth } from "@/lib/auth";
import { CourseEditClient } from "@/components/courses/CourseEditClient";

export default async function CourseEditPage({
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

  const { course, isOwner } = result;

  // Only owner can edit
  if (!isOwner) {
    redirect(`/${locale}/dashboard/courses/${courseId}`);
  }

  return (
    <CourseEditClient 
      course={course}
      locale={locale}
    />
  );
}
