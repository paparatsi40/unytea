"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { defineAction } from "@/lib/actions/define-action";
import { communityById, communityOfCourse, communityOfLesson, communityOfModule } from "@/lib/actions/resolvers";
import { prisma } from "@/lib/prisma";
import { getLimitsForPlan } from "@/lib/plans";

/**
 * Create a new course
 */
export const createCourse = defineAction(
  {
    name: "createCourse",
    auth: "admin",
    args: [
      z.object({
        communityId: z.string().min(1).max(64),
        title: z.string().min(1).max(300),
        slug: z.string().min(1).max(120),
        description: z.string().max(20_000).optional(),
        imageUrl: z.string().max(2000).optional(),
        isPaid: z.boolean().optional(),
        price: z.number().min(0).max(1_000_000).optional(),
      }),
    ],
    community: ([data]) => communityById(data.communityId),
    rateLimit: "create",
  },
  async (ctx, data: { title: string; slug: string; description?: string; imageUrl?: string; communityId: string; isPaid?: boolean; price?: number; }) => {
  try {

    const userId = ctx.userId;

    // Verify user owns the community
    const community = await prisma.community.findFirst({
      where: {
        id: data.communityId,
        ownerId: userId,
      },
    });

    if (!community) {
      return { success: false, error: "Community not found or unauthorized" };
    }

    // ── PLAN GATE: paidCourses ────────────────────────────────────────────
    if (data.isPaid) {
      const owner = await prisma.user.findUnique({
        where: { id: userId },
        select: { platformPlan: true },
      });
      const limits = getLimitsForPlan(owner?.platformPlan);
      if (!limits.paidCourses) {
        return {
          success: false,
          error: "Tu plan no permite cursos de pago. Actualiza a Creator o superior.",
          code: "PLAN_LIMIT_PAID_COURSES",
        };
      }
    }
    // ─────────────────────────────────────────────────────────────────────

    // Check if slug exists
    const existingCourse = await prisma.course.findFirst({
      where: {
        communityId: data.communityId,
        slug: data.slug,
      },
    });

    if (existingCourse) {
      return { success: false, error: "Course slug already exists" };
    }

    const course = await prisma.course.create({
      data: {
        title: data.title,
        slug: data.slug,
        description: data.description,
        imageUrl: data.imageUrl,
        communityId: data.communityId,
        isPaid: data.isPaid || false,
        price: data.price || 0,
        isPublished: false,
      },
    });

    revalidatePath("/dashboard/courses");
    return { success: true, course };
  } catch (error) {
    console.error("Error creating course:", error);
    return { success: false, error: "Failed to create course" };
  }
}
);

/**
 * Get courses for a community
 */
export const getCommunityCourses = defineAction(
  {
    name: "getCommunityCourses",
    auth: "member",
    args: [z.string().min(1).max(64)],
    community: ([communityId]) => communityById(communityId),
  },
  async (_ctx, communityId: string) => {
  try {


    const courses = await prisma.course.findMany({
      where: { communityId },
      include: {
        _count: {
          select: {
            modules: true,
            enrollments: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return { success: true, courses };
  } catch (error) {
    console.error("Error fetching courses:", error);
    return { success: false, error: "Failed to fetch courses" };
  }
}
);

/**
 * Get a specific course with modules and lessons
 */
export const getCourse = defineAction(
  {
    name: "getCourse",
    auth: "member",
    args: [z.string().min(1).max(64)],
    community: ([courseId]) => communityOfCourse(courseId),
  },
  async (ctx, courseId: string) => {
  try {

    const userId = ctx.userId;

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        modules: {
          include: {
            lessons: {
              orderBy: { position: "asc" },
            },
          },
          orderBy: { position: "asc" },
        },
        community: {
          select: {
            id: true,
            name: true,
            ownerId: true,
          },
        },
      },
    });

    if (!course) {
      return { success: false, error: "Course not found" };
    }

    // Check if user has access
    const isOwner = course.community.ownerId === userId;
    const enrollment = await prisma.enrollment.findFirst({
      where: {
        courseId,
        userId,
      },
    });

    const hasAccess = isOwner || enrollment || !course.isPaid;

    return { success: true, course, hasAccess, isOwner, enrollment };
  } catch (error) {
    console.error("Error fetching course:", error);
    return { success: false, error: "Failed to fetch course" };
  }
}
);

/**
 * Update a course
 */
export const updateCourse = defineAction(
  {
    name: "updateCourse",
    auth: "admin",
    args: [
      z.string().min(1).max(64),
      z.object({
        title: z.string().min(1).max(300).optional(),
        description: z.string().max(20_000).optional(),
        imageUrl: z.string().max(2000).optional(),
        isPaid: z.boolean().optional(),
        price: z.number().min(0).max(1_000_000).optional(),
        isPublished: z.boolean().optional(),
      }),
    ],
    community: ([courseId]) => communityOfCourse(courseId),
  },
  async (ctx, courseId: string, data: { title?: string; description?: string; imageUrl?: string; isPaid?: boolean; price?: number; isPublished?: boolean; }) => {
  try {

    const userId = ctx.userId;

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: { community: true },
    });

    if (!course) {
      return { success: false, error: "Course not found" };
    }

    if (course.community.ownerId !== userId) {
      return { success: false, error: "Unauthorized" };
    }

    // ── PLAN GATE: paidCourses (on update) ───────────────────────────────
    if (data.isPaid) {
      const owner = await prisma.user.findUnique({
        where: { id: userId },
        select: { platformPlan: true },
      });
      const limits = getLimitsForPlan(owner?.platformPlan);
      if (!limits.paidCourses) {
        return {
          success: false,
          error: "Tu plan no permite cursos de pago. Actualiza a Creator o superior.",
          code: "PLAN_LIMIT_PAID_COURSES",
        };
      }
    }
    // ─────────────────────────────────────────────────────────────────────

    const updatedCourse = await prisma.course.update({
      where: { id: courseId },
      data,
    });

    revalidatePath("/dashboard/courses");
    return { success: true, course: updatedCourse };
  } catch (error) {
    console.error("Error updating course:", error);
    return { success: false, error: "Failed to update course" };
  }
}
);

/**
 * Delete a course
 */
export const deleteCourse = defineAction(
  {
    name: "deleteCourse",
    auth: "admin",
    args: [z.string().min(1).max(64)],
    community: ([courseId]) => communityOfCourse(courseId),
  },
  async (ctx, courseId: string) => {
  try {

    const userId = ctx.userId;

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: { community: true },
    });

    if (!course) {
      return { success: false, error: "Course not found" };
    }

    if (course.community.ownerId !== userId) {
      return { success: false, error: "Unauthorized" };
    }

    await prisma.course.delete({
      where: { id: courseId },
    });

    revalidatePath("/dashboard/courses");
    return { success: true };
  } catch (error) {
    console.error("Error deleting course:", error);
    return { success: false, error: "Failed to delete course" };
  }
}
);

/**
 * Create a module
 */
export const createModule = defineAction(
  {
    name: "createModule",
    auth: "admin",
    args: [
      z.object({
        courseId: z.string().min(1).max(64),
        title: z.string().min(1).max(300),
        description: z.string().max(10_000).optional(),
        position: z.number().int().min(0).max(10_000),
      }),
    ],
    community: ([data]) => communityOfCourse(data.courseId),
  },
  async (ctx, data: { courseId: string; title: string; description?: string; position: number; }) => {
  try {

    const userId = ctx.userId;

    const course = await prisma.course.findUnique({
      where: { id: data.courseId },
      include: { community: true },
    });

    if (!course || course.community.ownerId !== userId) {
      return { success: false, error: "Unauthorized" };
    }

    const courseModule = await prisma.module.create({
      data: {
        title: data.title,
        description: data.description,
        position: data.position,
        courseId: data.courseId,
      },
    });

    revalidatePath(`/dashboard/courses/${data.courseId}`);
    return { success: true, module: courseModule };
  } catch (error) {
    console.error("Error creating module:", error);
    return { success: false, error: "Failed to create module" };
  }
}
);

/**
 * Create a lesson
 */
export const createLesson = defineAction(
  {
    name: "createLesson",
    auth: "admin",
    args: [
      z.object({
        moduleId: z.string().min(1).max(64),
        title: z.string().min(1).max(300),
        content: z.string().max(200_000),
        contentType: z.enum(["TEXT", "VIDEO", "AUDIO"]).optional(),
        videoUrl: z.string().max(2000).optional(),
        duration: z.number().int().min(0).max(1_000_000).optional(),
        position: z.number().int().min(0).max(10_000),
        isFree: z.boolean().optional(),
      }),
    ],
    community: ([data]) => communityOfModule(data.moduleId),
  },
  async (ctx, data: { moduleId: string; title: string; content: string; contentType?: "TEXT" | "VIDEO" | "AUDIO"; videoUrl?: string; duration?: number; position: number; isFree?: boolean; }) => {
  try {

    const userId = ctx.userId;

    const courseModule = await prisma.module.findUnique({
      where: { id: data.moduleId },
      include: {
        course: {
          include: { community: true },
        },
      },
    });

    if (!courseModule || courseModule.course.community.ownerId !== userId) {
      return { success: false, error: "Unauthorized" };
    }

    const lesson = await prisma.lesson.create({
      data: {
        title: data.title,
        content: data.content,
        contentType: data.contentType || "TEXT",
        videoUrl: data.videoUrl,
        duration: data.duration,
        position: data.position,
        moduleId: data.moduleId,
        isFree: data.isFree || false,
        isPublished: true,
      },
    });

    revalidatePath(`/dashboard/courses/${courseModule.courseId}`);
    return { success: true, lesson };
  } catch (error) {
    console.error("Error creating lesson:", error);
    return { success: false, error: "Failed to create lesson" };
  }
}
);

/**
 * Update a module
 */
export const updateModule = defineAction(
  {
    name: "updateModule",
    auth: "admin",
    args: [
      z.string().min(1).max(64),
      z.object({
        title: z.string().min(1).max(300).optional(),
        description: z.string().max(10_000).optional(),
        position: z.number().int().min(0).max(10_000).optional(),
      }),
    ],
    community: ([moduleId]) => communityOfModule(moduleId),
  },
  async (ctx, moduleId: string, data: { title?: string; description?: string; position?: number }) => {
  try {

    const userId = ctx.userId;

    const mod = await prisma.module.findUnique({
      where: { id: moduleId },
      include: { course: { include: { community: true } } },
    });
    if (!mod || mod.course.community.ownerId !== userId)
      return { success: false, error: "Unauthorized" };

    const updated = await prisma.module.update({
      where: { id: moduleId },
      data,
    });

    revalidatePath(`/dashboard/courses/${mod.courseId}`);
    return { success: true, module: updated };
  } catch (error) {
    console.error("Error updating module:", error);
    return { success: false, error: "Failed to update module" };
  }
}
);

/**
 * Delete a module
 */
export const deleteModule = defineAction(
  {
    name: "deleteModule",
    auth: "admin",
    args: [z.string().min(1).max(64)],
    community: ([moduleId]) => communityOfModule(moduleId),
  },
  async (ctx, moduleId: string) => {
  try {

    const userId = ctx.userId;

    const mod = await prisma.module.findUnique({
      where: { id: moduleId },
      include: { course: { include: { community: true } } },
    });
    if (!mod || mod.course.community.ownerId !== userId)
      return { success: false, error: "Unauthorized" };

    await prisma.module.delete({ where: { id: moduleId } });

    revalidatePath(`/dashboard/courses/${mod.courseId}`);
    return { success: true };
  } catch (error) {
    console.error("Error deleting module:", error);
    return { success: false, error: "Failed to delete module" };
  }
}
);

/**
 * Update a lesson
 */
export const updateLesson = defineAction(
  {
    name: "updateLesson",
    auth: "admin",
    args: [
      z.string().min(1).max(64),
      z.object({
        title: z.string().min(1).max(300).optional(),
        content: z.string().max(200_000).optional(),
        contentType: z.enum(["TEXT", "VIDEO", "AUDIO"]).optional(),
        videoUrl: z.string().max(2000).optional(),
        duration: z.number().int().min(0).max(1_000_000).optional(),
        position: z.number().int().min(0).max(10_000).optional(),
        isFree: z.boolean().optional(),
        isPublished: z.boolean().optional(),
      }),
    ],
    community: ([lessonId]) => communityOfLesson(lessonId),
  },
  async (ctx, lessonId: string, data: { title?: string; content?: string; contentType?: "TEXT" | "VIDEO" | "AUDIO"; videoUrl?: string; duration?: number; position?: number; isFree?: boolean; isPublished?: boolean; }) => {
  try {

    const userId = ctx.userId;

    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { module: { include: { course: { include: { community: true } } } } },
    });
    if (!lesson || lesson.module.course.community.ownerId !== userId)
      return { success: false, error: "Unauthorized" };

    const updated = await prisma.lesson.update({
      where: { id: lessonId },
      data,
    });

    revalidatePath(`/dashboard/courses/${lesson.module.courseId}`);
    return { success: true, lesson: updated };
  } catch (error) {
    console.error("Error updating lesson:", error);
    return { success: false, error: "Failed to update lesson" };
  }
}
);

/**
 * Delete a lesson
 */
export const deleteLesson = defineAction(
  {
    name: "deleteLesson",
    auth: "admin",
    args: [z.string().min(1).max(64)],
    community: ([lessonId]) => communityOfLesson(lessonId),
  },
  async (ctx, lessonId: string) => {
  try {

    const userId = ctx.userId;

    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { module: { include: { course: { include: { community: true } } } } },
    });
    if (!lesson || lesson.module.course.community.ownerId !== userId)
      return { success: false, error: "Unauthorized" };

    await prisma.lesson.delete({ where: { id: lessonId } });

    revalidatePath(`/dashboard/courses/${lesson.module.courseId}`);
    return { success: true };
  } catch (error) {
    console.error("Error deleting lesson:", error);
    return { success: false, error: "Failed to delete lesson" };
  }
}
);

/**
 * Enroll in a course
 */
export const enrollInCourse = defineAction(
  {
    name: "enrollInCourse",
    auth: "member",
    args: [z.string().min(1).max(64)],
    community: ([courseId]) => communityOfCourse(courseId),
    rateLimit: "create",
  },
  async (ctx, courseId: string) => {
  try {

    const userId = ctx.userId;

    // Check if already enrolled
    const existing = await prisma.enrollment.findFirst({
      where: {
        userId,
        courseId,
      },
    });

    if (existing) {
      return { success: false, error: "Already enrolled" };
    }

    const enrollment = await prisma.enrollment.create({
      data: {
        userId,
        courseId,
      },
    });

    // Increment enrollment count
    await prisma.course.update({
      where: { id: courseId },
      data: {
        enrollmentCount: { increment: 1 },
      },
    });

    revalidatePath(`/dashboard/courses/${courseId}`);
    return { success: true, enrollment };
  } catch (error) {
    console.error("Error enrolling in course:", error);
    return { success: false, error: "Failed to enroll" };
  }
}
);

/**
 * Mark lesson as complete
 */
export const markLessonComplete = defineAction(
  {
    name: "markLessonComplete",
    auth: "member",
    args: [z.string().min(1).max(64)],
    community: ([lessonId]) => communityOfLesson(lessonId),
  },
  async (ctx, lessonId: string) => {
  try {

    const userId = ctx.userId;

    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        module: {
          include: { course: true },
        },
      },
    });

    if (!lesson) {
      return { success: false, error: "Lesson not found" };
    }

    // Get or create enrollment
    let enrollment = await prisma.enrollment.findFirst({
      where: {
        userId,
        courseId: lesson.module.courseId,
      },
    });

    if (!enrollment) {
      enrollment = await prisma.enrollment.create({
        data: {
          userId,
          courseId: lesson.module.courseId,
        },
      });
    }

    // Create or update lesson progress
    const progress = await prisma.lessonProgress.upsert({
      where: {
        enrollmentId_lessonId: {
          enrollmentId: enrollment.id,
          lessonId,
        },
      },
      create: {
        enrollmentId: enrollment.id,
        lessonId,
        isCompleted: true,
        completedAt: new Date(),
      },
      update: {
        isCompleted: true,
        completedAt: new Date(),
      },
    });

    // Update enrollment progress
    const totalLessons = await prisma.lesson.count({
      where: {
        module: {
          courseId: lesson.module.courseId,
        },
      },
    });

    const completedLessons = await prisma.lessonProgress.count({
      where: {
        enrollmentId: enrollment.id,
        isCompleted: true,
      },
    });

    const progressPercent = (completedLessons / totalLessons) * 100;

    await prisma.enrollment.update({
      where: { id: enrollment.id },
      data: {
        progress: progressPercent,
        completedAt: progressPercent === 100 ? new Date() : null,
      },
    });

    revalidatePath(`/dashboard/courses/${lesson.module.courseId}`);
    return { success: true, progress };
  } catch (error) {
    console.error("Error marking lesson complete:", error);
    return { success: false, error: "Failed to mark lesson complete" };
  }
}
);

/**
 * Get user's enrollments
 */
export const getUserEnrollments = defineAction(
  {
    name: "getUserEnrollments",
    auth: "user",
    args: [],
  },
  async (ctx) => {
  try {

    const userId = ctx.userId;

    const enrollments = await prisma.enrollment.findMany({
      where: { userId },
      include: {
        course: {
          include: {
            community: {
              select: {
                id: true,
                name: true,
              },
            },
            _count: {
              select: {
                modules: true,
              },
            },
          },
        },
      },
      orderBy: { enrolledAt: "desc" },
    });

    return { success: true, enrollments };
  } catch (error) {
    console.error("Error fetching enrollments:", error);
    return { success: false, error: "Failed to fetch enrollments" };
  }
}
);
