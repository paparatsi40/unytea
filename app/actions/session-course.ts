"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserId } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";

/**
 * Add a session to a course as a lesson
 * This converts a live session into permanent course content
 */
export async function addSessionToCourse(
  sessionId: string,
  courseId: string,
  options?: {
    moduleId?: string; // Optional: specific module, otherwise creates "Live Sessions" module
    lessonTitle?: string; // Optional: custom title, otherwise uses session title
    isFree?: boolean; // Optional: make lesson free (default: false)
  }
) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return { success: false, error: "Not authenticated" };
    }

    // Fetch session data
    const session = await prisma.mentorSession.findUnique({
      where: { id: sessionId },
      include: {
        recording: true,
        notes: true,
        series: true,
      },
    });

    if (!session) {
      return { success: false, error: "Session not found" };
    }

    // Verify user is the session host
    if (session.mentorId !== userId) {
      return { success: false, error: "Only the session host can add it to a course" };
    }

    // Verify session has a recording
    if (!session.recordingUrl && !session.recording?.url) {
      return { success: false, error: "Session recording not available yet" };
    }

    // Fetch course and verify ownership
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        community: true,
        modules: {
          orderBy: { position: "asc" },
        },
      },
    });

    if (!course || course.community.ownerId !== userId) {
      return { success: false, error: "Course not found or unauthorized" };
    }

    // Determine which module to use
    let moduleId = options?.moduleId;
    let module;

    if (!moduleId) {
      // Look for existing "Live Sessions" or "Session Recordings" module
      const liveSessionsModule = course.modules.find(
        (m) => m.title.toLowerCase().includes("live") || m.title.toLowerCase().includes("session")
      );

      if (liveSessionsModule) {
        moduleId = liveSessionsModule.id;
        module = liveSessionsModule;
      } else {
        // Create a new "Live Sessions" module
        const lastPosition = course.modules.length > 0 
          ? Math.max(...course.modules.map(m => m.position)) 
          : 0;

        module = await prisma.module.create({
          data: {
            title: "Live Sessions",
            description: "Recorded live sessions from the community",
            position: lastPosition + 1,
            courseId: courseId,
          },
        });
        moduleId = module.id;
      }
    } else {
      // Verify module belongs to course
      module = await prisma.module.findFirst({
        where: { id: moduleId, courseId: courseId },
      });
      if (!module) {
        return { success: false, error: "Module not found in this course" };
      }
    }

    // Count existing lessons in module to determine position
    const lessonCount = await prisma.lesson.count({
      where: { moduleId: moduleId },
    });

    // Create the lesson from session data
    const lessonTitle = options?.lessonTitle || session.title;
    const recordingUrl = session.recordingUrl || session.recording?.url || "";
    
    // Build rich content from session notes if available
    let content = "";
    if (session.notes?.content) {
      content = `## Session Notes\n\n${session.notes.content}`;
    }
    
    // Add metadata
    content += `\n\n---\n\n**Session Info:**\n- Duration: ${session.duration} minutes\n- Format: ${session.mode === "AUDIO" ? "Audio only" : "Video"}`;
    
    if (session.series) {
      content += `\n- Part of series: ${session.series.title}`;
    }

    const lesson = await prisma.lesson.create({
      data: {
        title: lessonTitle,
        content: content,
        contentType: session.mode === "AUDIO" ? "AUDIO" : "VIDEO",
        videoUrl: recordingUrl,
        duration: session.duration,
        position: lessonCount + 1,
        moduleId: moduleId,
        isFree: options?.isFree ?? false,
        isPublished: true,
      },
    });

    // Create a session resource to track this usage
    await prisma.sessionResource.create({
      data: {
        sessionId: sessionId,
        type: "video",
        title: `Added to course: ${course.title}`,
        url: `/dashboard/courses/${courseId}?lesson=${lesson.id}`,
        description: `This session has been converted into a course lesson`,
        createdById: userId,
      },
    });

    // Revalidate paths
    revalidatePath(`/dashboard/courses/${courseId}`);
    revalidatePath(`/dashboard/sessions/${sessionId}`);
    if (session.communityId) {
      revalidatePath(`/dashboard/communities/${session.communityId}/feed`);
    }

    return {
      success: true,
      lesson,
      module,
      courseId,
      message: `Session added to "${course.title}" as lesson "${lessonTitle}"`,
    };
  } catch (error) {
    console.error("Error adding session to course:", error);
    return { success: false, error: "Failed to add session to course" };
  }
}

/**
 * Get courses available for a session to be added to
 */
export async function getAvailableCourses(sessionId: string) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return { success: false, error: "Not authenticated" };
    }

    const session = await prisma.mentorSession.findUnique({
      where: { id: sessionId },
    });

    if (!session || session.mentorId !== userId) {
      return { success: false, error: "Session not found or unauthorized" };
    }

    // Get courses from the session's community
    const courses = await prisma.course.findMany({
      where: {
        communityId: session.communityId || undefined,
        community: {
          ownerId: userId,
        },
      },
      include: {
        modules: {
          select: { id: true, title: true },
          orderBy: { position: "asc" },
        },
        _count: {
          select: { enrollments: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return { success: true, courses };
  } catch (error) {
    console.error("Error fetching available courses:", error);
    return { success: false, error: "Failed to fetch courses" };
  }
}

/**
 * Create a new course from a session
 * Quick action: converts session into a single-lesson course
 */
export async function createCourseFromSession(
  sessionId: string,
  courseTitle: string,
  options?: {
    description?: string;
    isPaid?: boolean;
    price?: number;
  }
) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return { success: false, error: "Not authenticated" };
    }

    const session = await prisma.mentorSession.findUnique({
      where: { id: sessionId },
      include: {
        recording: true,
        notes: true,
        community: true,
      },
    });

    if (!session || session.mentorId !== userId) {
      return { success: false, error: "Session not found or unauthorized" };
    }

    if (!session.recordingUrl && !session.recording?.url) {
      return { success: false, error: "Recording not available yet" };
    }

    if (!session.communityId) {
      return { success: false, error: "Session must belong to a community" };
    }

    // Generate slug
    const baseSlug = courseTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const uniqueSlug = `${baseSlug}-${Date.now()}`;

    // Create course
    const course = await prisma.course.create({
      data: {
        title: courseTitle,
        slug: uniqueSlug,
        description: options?.description || `Course created from live session: ${session.title}`,
        communityId: session.communityId,
        isPaid: options?.isPaid || false,
        price: options?.price || 0,
        isPublished: true,
      },
    });

    // Create initial module
    const module = await prisma.module.create({
      data: {
        title: "Session Recording",
        description: "Recorded live session",
        position: 1,
        courseId: course.id,
      },
    });

    // Create lesson from session
    let content = "";
    if (session.notes?.content) {
      content = `## Session Notes\n\n${session.notes.content}`;
    }

    const lesson = await prisma.lesson.create({
      data: {
        title: session.title,
        content: content,
        contentType: session.mode === "AUDIO" ? "AUDIO" : "VIDEO",
        videoUrl: session.recordingUrl || session.recording?.url || "",
        duration: session.duration,
        position: 1,
        moduleId: module.id,
        isFree: !options?.isPaid,
        isPublished: true,
      },
    });

    // Track this usage
    await prisma.sessionResource.create({
      data: {
        sessionId: sessionId,
        type: "video",
        title: `Converted to course: ${courseTitle}`,
        url: `/dashboard/courses/${course.id}`,
        description: `This session was converted into a standalone course`,
        createdById: userId,
      },
    });

    revalidatePath(`/dashboard/courses/${course.id}`);
    revalidatePath(`/dashboard/sessions/${sessionId}`);
    revalidatePath(`/dashboard/communities/${session.communityId}/feed`);

    return {
      success: true,
      course,
      lesson,
      message: `Created course "${courseTitle}" from session`,
    };
  } catch (error) {
    console.error("Error creating course from session:", error);
    return { success: false, error: "Failed to create course" };
  }
}
