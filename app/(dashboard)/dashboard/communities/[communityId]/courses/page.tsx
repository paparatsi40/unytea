import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { BookOpen, Clock, Users, Play, Plus, TrendingUp, Award, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function CommunityCoursesPage({
  params,
}: {
  params: { communityId: string };
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // Fetch community
  const community = await prisma.community.findFirst({
    where: {
      id: params.communityId,
    },
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
    },
  });

  if (!community) {
    redirect("/dashboard/communities");
  }

  const isOwner = community.ownerId === session.user.id;

  // Fetch courses for this community
  const courses = await prisma.course.findMany({
    where: {
      communityId: params.communityId,
      isPublished: true,
    },
    include: {
      _count: {
        select: {
          enrollments: true,
          modules: true,
        },
      },
      enrollments: {
        where: {
          userId: session.user.id,
        },
        select: {
          id: true,
          progress: true,
          completedAt: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  // Get user's enrollment for each course
  const coursesWithEnrollment = courses.map((course) => ({
    ...course,
    isEnrolled: course.enrollments.length > 0,
    userProgress: course.enrollments[0]?.progress || 0,
    isCompleted: course.enrollments[0]?.completedAt !== null,
  }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
      <div className="container py-8 space-y-8">
        {/* Header */}
        <div className="relative overflow-hidden rounded-3xl border border-border/50 bg-gradient-to-br from-card via-card to-primary/5 p-8 shadow-xl backdrop-blur-xl">
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-primary/10 blur-3xl animate-pulse" />
            <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-purple-500/10 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          </div>

          <div className="relative flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-foreground mb-2 flex items-center gap-3">
                <div className="rounded-2xl bg-primary/10 p-3">
                  <BookOpen className="h-8 w-8 text-primary" />
                </div>
                Courses
              </h1>
              <p className="text-lg text-muted-foreground">
                {courses.length === 0 
                  ? "Start learning by creating or enrolling in courses"
                  : `${courses.length} ${courses.length === 1 ? 'course' : 'courses'} available`
                }
              </p>
            </div>

            {isOwner && (
              <Link href={`/dashboard/communities/${params.communityId}/courses/create`}>
                <Button className="bg-gradient-to-r from-primary via-purple-500 to-pink-500 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/40">
                  <Plus className="h-5 w-5 mr-2" />
                  Create Course
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        {courses.length > 0 && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-border/50 bg-gradient-to-br from-card to-primary/5 p-6 shadow-lg backdrop-blur-xl">
              <div className="flex items-center justify-between mb-4">
                <div className="rounded-xl bg-primary/10 p-3">
                  <BookOpen className="h-6 w-6 text-primary" />
                </div>
                <TrendingUp className="h-5 w-5 text-green-500" />
              </div>
              <p className="text-3xl font-bold text-foreground">{courses.length}</p>
              <p className="text-sm text-muted-foreground">Total Courses</p>
            </div>

            <div className="rounded-2xl border border-border/50 bg-gradient-to-br from-card to-green-500/5 p-6 shadow-lg backdrop-blur-xl">
              <div className="flex items-center justify-between mb-4">
                <div className="rounded-xl bg-green-500/10 p-3">
                  <CheckCircle2 className="h-6 w-6 text-green-500" />
                </div>
                <TrendingUp className="h-5 w-5 text-green-500" />
              </div>
              <p className="text-3xl font-bold text-foreground">
                {coursesWithEnrollment.filter(c => c.isEnrolled).length}
              </p>
              <p className="text-sm text-muted-foreground">Enrolled</p>
            </div>

            <div className="rounded-2xl border border-border/50 bg-gradient-to-br from-card to-purple-500/5 p-6 shadow-lg backdrop-blur-xl">
              <div className="flex items-center justify-between mb-4">
                <div className="rounded-xl bg-purple-500/10 p-3">
                  <Play className="h-6 w-6 text-purple-500" />
                </div>
                <TrendingUp className="h-5 w-5 text-purple-500" />
              </div>
              <p className="text-3xl font-bold text-foreground">
                {coursesWithEnrollment.filter(c => c.isEnrolled && !c.isCompleted).length}
              </p>
              <p className="text-sm text-muted-foreground">In Progress</p>
            </div>

            <div className="rounded-2xl border border-border/50 bg-gradient-to-br from-card to-amber-500/5 p-6 shadow-lg backdrop-blur-xl">
              <div className="flex items-center justify-between mb-4">
                <div className="rounded-xl bg-amber-500/10 p-3">
                  <Award className="h-6 w-6 text-amber-500" />
                </div>
                <TrendingUp className="h-5 w-5 text-amber-500" />
              </div>
              <p className="text-3xl font-bold text-foreground">
                {coursesWithEnrollment.filter(c => c.isCompleted).length}
              </p>
              <p className="text-sm text-muted-foreground">Completed</p>
            </div>
          </div>
        )}

        {/* Courses Grid */}
        {courses.length === 0 ? (
          /* Empty State */
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
                  <BookOpen className="h-16 w-16 text-primary-foreground animate-bounce" style={{ animationDuration: '2s' }} />
                </div>
              </div>

              <h3 className="mb-3 text-3xl font-bold text-foreground">
                No Courses Yet 
              </h3>
              <p className="mb-8 text-lg text-muted-foreground">
                {isOwner 
                  ? "Create your first course to start teaching your community"
                  : "Check back soon for new courses"}
              </p>

              {isOwner && (
                <Link href={`/dashboard/communities/${params.communityId}/courses/create`}>
                  <Button className="bg-gradient-to-r from-primary via-purple-500 to-pink-500 shadow-2xl shadow-primary/30 hover:scale-105 hover:shadow-3xl transition-all">
                    <Plus className="h-5 w-5 mr-2" />
                    Create Your First Course
                  </Button>
                </Link>
              )}
            </div>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {coursesWithEnrollment.map((course) => (
              <Link
                key={course.id}
                href={`/dashboard/courses/${course.id}`}
                className="group relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-card to-card/50 shadow-lg backdrop-blur-xl transition-all hover:scale-[1.02] hover:shadow-2xl hover:border-primary/30"
              >
                {/* Course Image */}
                <div className="relative h-48 overflow-hidden bg-gradient-to-br from-primary/20 via-purple-500/20 to-pink-500/20">
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
                  
                  {/* Enrollment Badge */}
                  {course.isEnrolled && (
                    <div className="absolute top-4 right-4 rounded-full bg-primary/90 px-3 py-1 text-xs font-semibold text-primary-foreground backdrop-blur-xl">
                      {course.isCompleted ? " Completed" : "Enrolled"}
                    </div>
                  )}

                  {/* Price Badge */}
                  {course.isPaid && course.price && !course.isEnrolled && (
                    <div className="absolute top-4 left-4 rounded-full bg-green-500/90 px-3 py-1 text-xs font-semibold text-white backdrop-blur-xl">
                      ${course.price}
                    </div>
                  )}
                </div>

                <div className="p-6 space-y-4">
                  <div>
                    <h3 className="text-xl font-bold text-foreground mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                      {course.title}
                    </h3>
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
                  <Button className="w-full bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-all">
                    {course.isEnrolled 
                      ? (course.isCompleted ? "Review Course" : "Continue Learning")
                      : "View Course"
                    }
                  </Button>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
