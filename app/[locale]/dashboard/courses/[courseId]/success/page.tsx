"use client";

import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getCourse } from "@/app/actions/courses";
import { SuccessContent } from "@/components/courses/SuccessContent";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Sparkles, BookOpen, ArrowRight, Gift, Award } from "lucide-react";

export default async function CourseSuccessPage({
  params,
}: {
  params: { courseId: string };
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  const result = await getCourse(params.courseId);
  if (!result.success || !result.course) {
    notFound();
  }

  const course = result.course;
  const enrollment = result.enrollment;

  // If not enrolled, redirect to course page
  if (!enrollment) {
    redirect(`/dashboard/courses/${params.courseId}`);
  }

  return (
    <SuccessContent
      course={{
        id: course.id,
        title: course.title,
        isPaid: course.isPaid,
        certificateEnabled: course.certificateEnabled || false,
        liveSupportEnabled: course.liveSupportEnabled || false,
      }}
    />
  );
}
