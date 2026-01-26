"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserId } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

/**
 * Create a new course
 */
export async function createCourse(data: {
  title: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  communityId: string;
  isPaid?: boolean;
  price?: number;
  tier?: string;
  isLeadMagnet?: boolean;
  upgradeCourseId?: string;
  certificateEnabled?: boolean;
  liveSupportEnabled?: boolean;
  whatYouWillLearn?: string;
  previewVideoUrl?: string;
  salesPageContent?: string;
  testimonials?: any;
}) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return { success: false, error: "Not authenticated" };
    }

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

    // Create Stripe Product if paid course
    let stripeProductId: string | null = null;
    let stripePriceId: string | null = null;

    if (data.isPaid && (data.price ?? 0) > 0) {
      try {
        // Create Stripe Product
        const product = await stripe.products.create({
          name: data.title,
          description: data.description || undefined,
          metadata: {
            courseSlug: data.slug,
            communityId: data.communityId,
            type: "course",
          },
        });
        stripeProductId = product.id;

        // Create Stripe Price
        const price = await stripe.prices.create({
          product: stripeProductId,
          unit_amount: Math.round((data.price ?? 0) * 100), // Convert to cents
          currency: "usd",
          metadata: {
            courseSlug: data.slug,
          },
        });
        stripePriceId = price.id;
      } catch (stripeError) {
        console.error("Error creating Stripe product:", stripeError);
        return { 
          success: false, 
          error: "Failed to create payment product. Please check your Stripe configuration." 
        };
      }
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
        tier: data.tier || "standard",
        isLeadMagnet: data.isLeadMagnet || false,
        upgradeCourseId: data.upgradeCourseId,
        certificateEnabled: data.certificateEnabled || false,
        liveSupportEnabled: data.liveSupportEnabled || false,
        whatYouWillLearn: data.whatYouWillLearn || "",
        previewVideoUrl: data.previewVideoUrl,
        salesPageContent: data.salesPageContent,
        testimonials: data.testimonials,
        stripeProductId: stripeProductId,
        stripePriceId: stripePriceId,
      },
    });

    revalidatePath("/dashboard/courses");
    return { success: true, course };
  } catch (error) {
    console.error("Error creating course:", error);
    return { success: false, error: "Failed to create course" };
  }
}

/**
 * Get courses for a community
 */
export async function getCommunityCourses(communityId: string) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return { success: false, error: "Not authenticated" };
    }

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

/**
 * Get a specific course with modules and lessons
 */
export async function getCourse(courseId: string) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return { success: false, error: "Not authenticated" };
    }

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

/**
 * Update a course
 */
export async function updateCourse(
  courseId: string,
  data: {
    title?: string;
    description?: string;
    imageUrl?: string;
    isPaid?: boolean;
    price?: number;
    isPublished?: boolean;
    tier?: string;
    isLeadMagnet?: boolean;
    upgradeCourseId?: string;
    certificateEnabled?: boolean;
    liveSupportEnabled?: boolean;
    whatYouWillLearn?: string;
    previewVideoUrl?: string;
    salesPageContent?: string;
    testimonials?: any;
  }
) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return { success: false, error: "Not authenticated" };
    }

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

    const updatedCourse = await prisma.course.update({
      where: { id: courseId },
      data: {
        title: data.title,
        description: data.description,
        imageUrl: data.imageUrl,
        isPaid: data.isPaid,
        price: data.price,
        isPublished: data.isPublished,
        tier: data.tier,
        isLeadMagnet: data.isLeadMagnet,
        upgradeCourseId: data.upgradeCourseId,
        certificateEnabled: data.certificateEnabled,
        liveSupportEnabled: data.liveSupportEnabled,
        whatYouWillLearn: data.whatYouWillLearn,
        previewVideoUrl: data.previewVideoUrl,
        salesPageContent: data.salesPageContent,
        testimonials: data.testimonials,
      },
    });

    revalidatePath("/dashboard/courses");
    return { success: true, course: updatedCourse };
  } catch (error) {
    console.error("Error updating course:", error);
    return { success: false, error: "Failed to update course" };
  }
}

/**
 * Delete a course
 */
export async function deleteCourse(courseId: string) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return { success: false, error: "Not authenticated" };
    }

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

/**
 * Create a module
 */
export async function createModule(data: {
  courseId: string;
  title: string;
  description?: string;
  position: number;
}) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return { success: false, error: "Not authenticated" };
    }

    const course = await prisma.course.findUnique({
      where: { id: data.courseId },
      include: { community: true },
    });

    if (!course || course.community.ownerId !== userId) {
      return { success: false, error: "Unauthorized" };
    }

    const module = await prisma.module.create({
      data: {
        title: data.title,
        description: data.description,
        position: data.position,
        courseId: data.courseId,
      },
    });

    revalidatePath(`/dashboard/courses/${data.courseId}`);
    return { success: true, module };
  } catch (error) {
    console.error("Error creating module:", error);
    return { success: false, error: "Failed to create module" };
  }
}

/**
 * Create a lesson
 */
export async function createLesson(data: {
  moduleId: string;
  title: string;
  content: string;
  contentType?: "TEXT" | "VIDEO" | "AUDIO";
  videoUrl?: string;
  duration?: number;
  position: number;
  isFree?: boolean;
}) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return { success: false, error: "Not authenticated" };
    }

    const module = await prisma.module.findUnique({
      where: { id: data.moduleId },
      include: {
        course: {
          include: { community: true },
        },
      },
    });

    if (!module || module.course.community.ownerId !== userId) {
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

    revalidatePath(`/dashboard/courses/${module.courseId}`);
    return { success: true, lesson };
  } catch (error) {
    console.error("Error creating lesson:", error);
    return { success: false, error: "Failed to create lesson" };
  }
}

/**
 * Enroll in a course
 */
export async function enrollInCourse(courseId: string) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return { success: false, error: "Not authenticated" };
    }

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

/**
 * Mark lesson as complete
 */
export async function markLessonComplete(lessonId: string) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return { success: false, error: "Not authenticated" };
    }

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

/**
 * Get user's enrollments
 */
export async function getUserEnrollments() {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return { success: false, error: "Not authenticated" };
    }

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

/**
 * Update a course
 */
export async function updateCourse(courseId: string, data: {
  title?: string;
  description?: string;
  imageUrl?: string;
  isPaid?: boolean;
  price?: number;
  isPublished?: boolean;
}) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return { success: false, error: "Not authenticated" };
    }

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: { community: true },
    });

    if (!course || course.community.ownerId !== userId) {
      return { success: false, error: "Unauthorized" };
    }

    const updatedCourse = await prisma.course.update({
      where: { id: courseId },
      data: {
        ...data,
        publishedAt: data.isPublished && !course.isPublished ? new Date() : course.publishedAt,
      },
    });

    revalidatePath(`/dashboard/courses/${courseId}`);
    return { success: true, course: updatedCourse };
  } catch (error) {
    console.error("Error updating course:", error);
    return { success: false, error: "Failed to update course" };
  }
}

/**
 * Update a module
 */
export async function updateModule(moduleId: string, data: {
  title?: string;
  description?: string;
  position?: number;
}) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return { success: false, error: "Not authenticated" };
    }

    const module = await prisma.module.findUnique({
      where: { id: moduleId },
      include: {
        course: {
          include: { community: true },
        },
      },
    });

    if (!module || module.course.community.ownerId !== userId) {
      return { success: false, error: "Unauthorized" };
    }

    const updatedModule = await prisma.module.update({
      where: { id: moduleId },
      data,
    });

    revalidatePath(`/dashboard/courses/${module.courseId}`);
    return { success: true, module: updatedModule };
  } catch (error) {
    console.error("Error updating module:", error);
    return { success: false, error: "Failed to update module" };
  }
}

/**
 * Delete a module
 */
export async function deleteModule(moduleId: string) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return { success: false, error: "Not authenticated" };
    }

    const module = await prisma.module.findUnique({
      where: { id: moduleId },
      include: {
        course: {
          include: { community: true },
        },
      },
    });

    if (!module || module.course.community.ownerId !== userId) {
      return { success: false, error: "Unauthorized" };
    }

    await prisma.module.delete({
      where: { id: moduleId },
    });

    revalidatePath(`/dashboard/courses/${module.courseId}`);
    return { success: true };
  } catch (error) {
    console.error("Error deleting module:", error);
    return { success: false, error: "Failed to delete module" };
  }
}

/**
 * Update a lesson
 */
export async function updateLesson(lessonId: string, data: {
  title?: string;
  content?: string;
  contentType?: "TEXT" | "VIDEO" | "AUDIO" | "QUIZ" | "ASSIGNMENT";
  videoUrl?: string;
  duration?: number;
  position?: number;
  isFree?: boolean;
  isPublished?: boolean;
}) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return { success: false, error: "Not authenticated" };
    }

    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        module: {
          include: {
            course: {
              include: { community: true },
            },
          },
        },
      },
    });

    if (!lesson || lesson.module.course.community.ownerId !== userId) {
      return { success: false, error: "Unauthorized" };
    }

    const updatedLesson = await prisma.lesson.update({
      where: { id: lessonId },
      data,
    });

    revalidatePath(`/dashboard/courses/${lesson.module.courseId}`);
    return { success: true, lesson: updatedLesson };
  } catch (error) {
    console.error("Error updating lesson:", error);
    return { success: false, error: "Failed to update lesson" };
  }
}

/**
 * Delete a lesson
 */
export async function deleteLesson(lessonId: string) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return { success: false, error: "Not authenticated" };
    }

    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        module: {
          include: {
            course: {
              include: { community: true },
            },
          },
        },
      },
    });

    if (!lesson || lesson.module.course.community.ownerId !== userId) {
      return { success: false, error: "Unauthorized" };
    }

    const courseId = lesson.module.courseId;

    await prisma.lesson.delete({
      where: { id: lessonId },
    });

    revalidatePath(`/dashboard/courses/${courseId}`);
    return { success: true };
  } catch (error) {
    console.error("Error deleting lesson:", error);
    return { success: false, error: "Failed to delete lesson" };
  }
}

/**
 * Get all available courses for browsing
 */
export async function getAvailableCourses() {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return { success: false, error: "Not authenticated" };
    }

    const courses = await prisma.course.findMany({
      where: {
        isPublished: true,
      },
      include: {
        community: {
          select: {
            id: true,
            name: true,
            imageUrl: true,
          },
        },
        _count: {
          select: {
            modules: true,
            enrollments: true,
          },
        },
      },
      orderBy: [
        { enrollmentCount: "desc" },
        { createdAt: "desc" },
      ],
    });

    return { success: true, courses };
  } catch (error) {
    console.error("Error fetching available courses:", error);
    return { success: false, error: "Failed to fetch courses" };
  }
}