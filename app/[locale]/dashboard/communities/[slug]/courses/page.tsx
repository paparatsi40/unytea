import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { BookOpen, Play, Plus, TrendingUp, Award, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CoursesPageClient } from "@/components/courses/CoursesPageClient";

export default async function CommunityCoursesPage({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}) {
  const { slug, locale } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  // Fetch community
  const community = await prisma.community.findFirst({
    where: {
      slug: slug,
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

  // Check if user is member or owner
  const membership = await prisma.member.findFirst({
    where: {
      communityId: community.id,
      userId: session.user.id,
    },
  });

  // Redirect non-members to community preview page
  if (!isOwner && !membership) {
    redirect(`/${locale}/dashboard/communities/${slug}`);
  }

  // Fetch ACTIVE courses
  const activeCourses = await prisma.course.findMany({
    where: {
      communityId: community.id,
      isPublished: true,
      isArchived: false,
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

  // Fetch ARCHIVED courses (only for owners)
  const archivedCourses = isOwner
    ? await prisma.course.findMany({
        where: {
          communityId: community.id,
          isPublished: true,
          isArchived: true,
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
      })
    : [];

  // Transform courses with enrollment data
  const transformCourses = (courses: typeof activeCourses) =>
    courses.map((course) => ({
      ...course,
      isEnrolled: course.enrollments.length > 0,
      userProgress: course.enrollments[0]?.progress || 0,
      isCompleted: course.enrollments[0]?.completedAt !== null,
    }));

  const activeCoursesWithEnrollment = transformCourses(activeCourses);
  const archivedCoursesWithEnrollment = transformCourses(archivedCourses);

  const totalCourses = activeCoursesWithEnrollment.length + archivedCoursesWithEnrollment.length;

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
                {totalCourses === 0 
                  ? "Start learning by creating or enrolling in courses"
                  : `${totalCourses} ${totalCourses === 1 ? 'course' : 'courses'} total`
                }
              </p>
            </div>

            {isOwner && (
              <Link href={`/dashboard/communities/${slug}/courses/create`}>
                <Button className="bg-gradient-to-r from-primary via-purple-500 to-pink-500 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/40">
                  <Plus className="h-5 w-5 mr-2" />
                  Create Course
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        {totalCourses > 0 && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-border/50 bg-gradient-to-br from-card to-primary/5 p-6 shadow-lg backdrop-blur-xl">
              <div className="flex items-center justify-between mb-4">
                <div className="rounded-xl bg-primary/10 p-3">
                  <BookOpen className="h-6 w-6 text-primary" />
                </div>
                <TrendingUp className="h-5 w-5 text-green-500" />
              </div>
              <p className="text-3xl font-bold text-foreground">{totalCourses}</p>
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
                {activeCoursesWithEnrollment.filter(c => c.isEnrolled).length}
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
                {activeCoursesWithEnrollment.filter(c => c.isEnrolled && !c.isCompleted).length}
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
                {activeCoursesWithEnrollment.filter(c => c.isCompleted).length}
              </p>
              <p className="text-sm text-muted-foreground">Completed</p>
            </div>
          </div>
        )}

        {/* Courses Tabs */}
        <CoursesPageClient
          slug={slug}
          locale={locale}
          isOwner={isOwner}
          activeCourses={activeCoursesWithEnrollment}
          archivedCourses={archivedCoursesWithEnrollment}
        />
      </div>
    </div>
  );
}
