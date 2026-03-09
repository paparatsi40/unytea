"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { BookOpen, Lock, CheckCircle, CreditCard, Loader2, Users, Clock, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface Course {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  isPaid: boolean;
  price: number | null;
  currency: string;
  enrollmentCount: number;
  isPublished: boolean;
  community: {
    name: string;
    slug: string;
  };
  modules: Array<{
    id: string;
    title: string;
    lessons: Array<{
      id: string;
      title: string;
      duration: number | null;
      isFree: boolean;
    }>;
  }>;
}

interface PurchaseStatus {
  hasAccess: boolean;
  isFree: boolean;
  purchaseStatus: string | null;
  price: number | null;
  isCommunityMember: boolean;
}

export default function CourseDetailPage() {
  const params = useParams();
  const courseId = params.courseId as string;
  const { toast } = useToast();

  const [course, setCourse] = useState<Course | null>(null);
  const [purchaseStatus, setPurchaseStatus] = useState<PurchaseStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);

  useEffect(() => {
    loadCourseData();
  }, [courseId]);

  const loadCourseData = async () => {
    try {
      setIsLoading(true);

      // Load course details
      const courseRes = await fetch(`/api/courses/${courseId}`);
      if (!courseRes.ok) throw new Error("Failed to load course");
      const courseData = await courseRes.json();
      setCourse(courseData);

      // Check purchase status
      const statusRes = await fetch(`/api/courses/${courseId}/purchase-status`);
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        setPurchaseStatus(statusData);
      }
    } catch (error) {
      console.error("Error loading course:", error);
      toast({
        title: "Error",
        description: "Failed to load course data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePurchase = async () => {
    setIsPurchasing(true);
    try {
      const res = await fetch("/api/stripe/course-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId }),
      });

      if (res.ok) {
        const { url } = await res.json();
        window.location.href = url;
      } else {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to create checkout");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to start purchase. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsPurchasing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[600px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex min-h-[600px] items-center justify-center">
        <div className="text-center">
          <BookOpen className="mx-auto mb-4 h-12 w-12 text-gray-400" />
          <h2 className="text-xl font-semibold">Course not found</h2>
          <Link href="/dashboard/courses" className="mt-4 text-blue-600 hover:underline">
            Back to courses
          </Link>
        </div>
      </div>
    );
  }

  const totalLessons = course.modules.reduce(
    (acc, module) => acc + module.lessons.length,
    0
  );

  const hasAccess = purchaseStatus?.hasAccess || false;
  const isPaid = course.isPaid && course.price && course.price > 0;
  const needsPurchase = isPaid && !hasAccess;

  return (
    <div className="space-y-6 p-8">
      {/* Back Link */}
      <Link
        href="/dashboard/courses"
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to courses
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <Badge variant="secondary">{course.community.name}</Badge>
              {isPaid ? (
                <Badge className="bg-green-100 text-green-800">Paid Course</Badge>
              ) : (
                <Badge variant="outline">Free Course</Badge>
              )}
            </div>
            <h1 className="text-3xl font-bold text-gray-900">{course.title}</h1>
            {course.description && (
              <p className="mt-4 text-lg text-gray-600">{course.description}</p>
            )}
          </div>

          {/* Course Content - Locked or Available */}
          {needsPurchase ? (
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="p-8 text-center">
                <Lock className="mx-auto h-12 w-12 text-amber-600 mb-4" />
                <h3 className="text-xl font-semibold text-amber-900 mb-2">
                  Purchase Required
                </h3>
                <p className="text-amber-700 mb-6">
                  This course requires a one-time purchase to access all content.
                </p>
                <Button
                  onClick={handlePurchase}
                  disabled={isPurchasing}
                  className="bg-[#635BFF] hover:bg-[#4f48cc] text-white"
                  size="lg"
                >
                  {isPurchasing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4 mr-2" />
                      Buy Course - ${course.price}
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Course Content</h2>
              {course.modules.length === 0 ? (
                <p className="text-gray-500">No modules available yet.</p>
              ) : (
                course.modules.map((module, moduleIndex) => (
                  <Card key={module.id}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">
                        Module {moduleIndex + 1}: {module.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <ul className="space-y-2">
                        {module.lessons.map((lesson, lessonIndex) => (
                          <li
                            key={lesson.id}
                            className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-sm text-gray-400 font-medium">
                                {lessonIndex + 1}
                              </span>
                              <span className="font-medium">{lesson.title}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {lesson.duration && (
                                <span className="text-sm text-gray-500 flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {lesson.duration} min
                                </span>
                              )}
                              {lesson.isFree && (
                                <Badge variant="outline" className="text-xs">Free</Badge>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Course Stats */}
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-500 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Enrolled
                </span>
                <span className="font-semibold">{course.enrollmentCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500 flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Lessons
                </span>
                <span className="font-semibold">{totalLessons}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Modules
                </span>
                <span className="font-semibold">{course.modules.length}</span>
              </div>
            </CardContent>
          </Card>

          {/* Purchase Status */}
          {hasAccess && (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 text-green-800">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-semibold">
                    {isPaid ? "Course Purchased" : "Free Access"}
                  </span>
                </div>
                <p className="mt-2 text-sm text-green-700">
                  You have full access to all course content.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Community Link */}
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-gray-500 mb-3">Offered by</p>
              <Link
                href={`/dashboard/c/${course.community.slug}`}
                className="font-semibold text-blue-600 hover:underline"
              >
                {course.community.name}
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
