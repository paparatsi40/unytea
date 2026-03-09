import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Get user's course progress
 * GET /api/courses/progress
 */
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Get enrollments with course and lesson progress
    const enrollments = await prisma.enrollment.findMany({
      where: {
        userId,
      },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            imageUrl: true,
            modules: {
              select: {
                id: true,
                lessons: {
                  select: {
                    id: true,
                  },
                },
              },
            },
          },
        },
        lessonProgress: {
          where: {
            isCompleted: true,
          },
          select: {
            lessonId: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: 5,
    });

    // Calculate progress for each course
    const courses = enrollments.map((enrollment) => {
      const totalLessons = enrollment.course.modules.reduce(
        (acc, module) => acc + module.lessons.length,
        0
      );
      const completedLessons = enrollment.lessonProgress.length;
      const progress = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;

      return {
        id: enrollment.course.id,
        title: enrollment.course.title,
        progress: Math.round(progress),
        imageUrl: enrollment.course.imageUrl,
        totalLessons,
        completedLessons,
      };
    });

    return NextResponse.json({ courses });
  } catch (error: any) {
    console.error("Error fetching course progress:", error);
    return NextResponse.json(
      { error: "Failed to fetch course progress" },
      { status: 500 }
    );
  }
}
