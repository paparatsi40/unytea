"use client";

import { useState } from "react";
import Link from "next/link";
import { BookOpen, Users, Plus, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CourseActions } from "./CourseActions";

type Course = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  isPaid: boolean;
  price: number;
  isPublished: boolean;
  isArchived: boolean;
  _count: {
    enrollments: number;
    modules: number;
  };
  isEnrolled: boolean;
  userProgress: number;
  isCompleted: boolean;
};

interface CoursesPageClientProps {
  slug: string;
  locale: string;
  isOwner: boolean;
  activeCourses: Course[];
  archivedCourses: Course[];
}

export function CoursesPageClient({
  slug,
  locale,
  isOwner,
  activeCourses,
  archivedCourses,
}: CoursesPageClientProps) {
  const [activeTab, setActiveTab] = useState<"active" | "archived">("active");

  const renderCourseGrid = (courses: Course[], showArchived = false) => {
    if (courses.length === 0) {
      return (
        <div className="relative overflow-hidden rounded-3xl border-2 border-dashed border-primary/20 bg-gradient-to-br from-card/50 via-accent/20 to-primary/5 p-16 text-center backdrop-blur-xl">
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-24 -left-24 h-64 w-64 rounded-full bg-primary/5 blur-3xl animate-pulse" />
            <div className="absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-purple-500/5 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          </div>

          <div className="relative">
            <div className="relative mx-auto mb-8 h-32 w-32">
              <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" style={{ animationDuration: '3s' }} />
              <div className="absolute inset-4 rounded-full bg-gradient-to-br from-primary/30 to-purple-500/30 blur-xl" />
              <div className="relative flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-primary via-primary to-primary/70 shadow-2xl shadow-primary/30">
                {showArchived ? (
                  <Archive className="h-16 w-16 text-primary-foreground animate-bounce" style={{ animationDuration: '2s' }} />
                ) : (
                  <BookOpen className="h-16 w-16 text-primary-foreground animate-bounce" style={{ animationDuration: '2s' }} />
                )}
              </div>
            </div>

            <h3 className="mb-3 text-3xl font-bold text-foreground">
              {showArchived ? "No Archived Courses" : "No Active Courses"}
            </h3>
            <p className="mb-8 text-lg text-muted-foreground">
              {showArchived 
                ? "Courses you archive will appear here"
                : (isOwner 
                    ? "Create your first course to start teaching your community"
                    : "Check back soon for new courses"
                  )
              }
            </p>

            {isOwner && !showArchived && (
              <Link href={`/dashboard/communities/${slug}/courses/create`}>
                <Button className="bg-gradient-to-r from-primary via-purple-500 to-pink-500 shadow-2xl shadow-primary/30 hover:scale-105 hover:shadow-3xl transition-all">
                  <Plus className="h-5 w-5 mr-2" />
                  Create Your First Course
                </Button>
              </Link>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {courses.map((course) => (
          <div
            key={course.id}
            className="group relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-card to-card/50 shadow-lg backdrop-blur-xl transition-all hover:scale-[1.02] hover:shadow-2xl hover:border-primary/30"
          >
            {/* Course Image */}
            <div className="relative h-48 overflow-hidden bg-gradient-to-br from-primary/20 via-purple-500/20 to-pink-500/20">
              <Link href={
                isOwner && !course.isPublished 
                  ? `/${locale}/dashboard/courses/${course.id}/edit`
                  : `/${locale}/dashboard/courses/${course.id}`
              }>
                {course.imageUrl ? (
                  <img
                    src={course.imageUrl}
                    alt={course.title}
                    className="h-full w-full object-cover transition-transform group-hover:scale-110"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <BookOpen className="h-16 w-16 text-primary/40" />
                  </div>
                )}
              </Link>
              
              {/* Owner Actions */}
              {isOwner && (
                <div className="absolute top-4 right-4">
                  <CourseActions
                    courseId={course.id}
                    courseTitle={course.title}
                    isArchived={course.isArchived}
                    enrollmentCount={course._count.enrollments}
                  />
                </div>
              )}
              
              {/* Draft Badge (only for owners on unpublished courses) */}
              {isOwner && !course.isPublished && (
                <div className="absolute top-4 left-4 rounded-full bg-amber-500/90 px-3 py-1 text-xs font-semibold text-white backdrop-blur-xl">
                  📝 Draft
                </div>
              )}

              {/* Enrollment Badge */}
              {course.isEnrolled && course.isPublished && (
                <div className="absolute top-4 left-4 rounded-full bg-primary/90 px-3 py-1 text-xs font-semibold text-primary-foreground backdrop-blur-xl">
                  {course.isCompleted ? "✓ Completed" : "Enrolled"}
                </div>
              )}

              {/* Price Badge */}
              {course.isPaid && course.price && !course.isEnrolled && (
                <div className="absolute bottom-4 left-4 rounded-full bg-green-500/90 px-3 py-1 text-xs font-semibold text-white backdrop-blur-xl">
                  ${course.price}
                </div>
              )}

              {/* Archived Badge */}
              {showArchived && (
                <div className="absolute bottom-4 right-4 rounded-full bg-amber-500/90 px-3 py-1 text-xs font-semibold text-white backdrop-blur-xl flex items-center gap-1">
                  <Archive className="h-3 w-3" />
                  Archived
                </div>
              )}
            </div>

            <div className="p-6 space-y-4">
              <div>
                <Link href={`/${locale}/dashboard/courses/${course.id}`}>
                  <h3 className="text-xl font-bold text-foreground mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                    {course.title}
                  </h3>
                </Link>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {course.description || "Learn new skills with this course"}
                </p>
              </div>

              {/* Progress Bar (if enrolled) */}
              {course.isEnrolled && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-semibold text-primary">{Math.round(course.userProgress)}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-accent">
                    <div
                      className="h-full bg-gradient-to-r from-primary via-purple-500 to-pink-500 transition-all duration-500"
                      style={{ width: `${course.userProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Course Stats */}
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <BookOpen className="h-4 w-4" />
                  <span>{course._count.modules} modules</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Users className="h-4 w-4" />
                  <span>{course._count.enrollments} enrolled</span>
                </div>
              </div>

              {/* CTA Button */}
              <Link href={
                isOwner && !course.isPublished 
                  ? `/${locale}/dashboard/courses/${course.id}/edit`
                  : `/${locale}/dashboard/courses/${course.id}`
              }>
                <Button className="w-full bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-all">
                  {isOwner && !course.isPublished
                    ? "Edit Course"
                    : course.isEnrolled 
                      ? (course.isCompleted ? "Review Course" : "Continue Learning")
                      : "View Course"
                  }
                </Button>
              </Link>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "active" | "archived")} className="space-y-6">
      {/* Tabs */}
      <TabsList className="grid w-full max-w-md grid-cols-2">
        <TabsTrigger value="active" className="flex items-center gap-2">
          <BookOpen className="h-4 w-4" />
          Active Courses
          <span className="ml-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
            {activeCourses.length}
          </span>
        </TabsTrigger>
        <TabsTrigger value="archived" className="flex items-center gap-2">
          <Archive className="h-4 w-4" />
          Archived
          <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs font-bold text-muted-foreground">
            {archivedCourses.length}
          </span>
        </TabsTrigger>
      </TabsList>

      {/* Active Courses Tab */}
      <TabsContent value="active" className="space-y-6">
        {renderCourseGrid(activeCourses)}
      </TabsContent>

      {/* Archived Courses Tab */}
      <TabsContent value="archived" className="space-y-6">
        {renderCourseGrid(archivedCourses, true)}
      </TabsContent>
    </Tabs>
  );
}