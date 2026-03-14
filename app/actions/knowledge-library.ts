"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserId } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";

/**
 * Get all sessions that can be converted to courses
 * Completed sessions with recordings that aren't yet in courses
 */
export async function getConvertibleSessions(communityId?: string) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return { success: false, error: "Not authenticated" };
    }

    const whereClause: any = {
      mentorId: userId,
      status: "COMPLETED",
      OR: [
        { recordingUrl: { not: null } },
        { recording: { url: { not: null } } },
      ],
    };

    if (communityId) {
      whereClause.communityId = communityId;
    }

    const sessions = await prisma.mentorSession.findMany({
      where: whereClause,
      include: {
        community: {
          select: { id: true, name: true, slug: true },
        },
        series: {
          select: { id: true, title: true },
        },
        notes: {
          select: { id: true, content: true },
        },
        recording: {
          select: { id: true, url: true, status: true },
        },
        participations: {
          select: { id: true, userId: true },
        },
        _count: {
          select: {
            participations: true,
            resources: true,
          },
        },
      },
      orderBy: { scheduledAt: "desc" },
    });

    // Calculate engagement score for each session
    const sessionsWithScore = sessions.map((session) => ({
      ...session,
      engagementScore: calculateEngagementScore(session),
    }));

    return { success: true, sessions: sessionsWithScore };
  } catch (error) {
    console.error("Error fetching convertible sessions:", error);
    return { success: false, error: "Failed to fetch sessions" };
  }
}

/**
 * Calculate engagement score based on attendance, duration, and resources
 */
function calculateEngagementScore(session: any): number {
  let score = 0;
  
  // Attendance (max 40 points)
  const attendeeCount = session._count?.participations || 0;
  score += Math.min(attendeeCount * 2, 40);
  
  // Duration (max 20 points) - longer sessions = more content
  score += Math.min(session.duration / 3, 20);
  
  // Has notes (15 points)
  if (session.notes?.content) {
    score += 15;
  }
  
  // Has resources (15 points)
  if (session._count?.resources > 0) {
    score += 15;
  }
  
  // Is part of series (10 points) - indicates structured content
  if (session.seriesId) {
    score += 10;
  }
  
  return Math.round(score);
}

/**
 * Analyze sessions and suggest course groupings
 * Groups by title similarity and community
 */
export async function analyzeCoursePotential(communityId?: string) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return { success: false, error: "Not authenticated" };
    }

    const result = await getConvertibleSessions(communityId);
    if (!result.success || !result.sessions) {
      return { success: false, error: "Failed to analyze sessions" };
    }

    const sessions = result.sessions;

    // Group sessions by potential topics (simple keyword matching)
    const groups = groupSessionsByTopic(sessions);
    
    // Calculate potential for each group
    const suggestions = groups
      .filter((group) => group.sessions.length >= 2) // Need at least 2 sessions
      .map((group) => ({
        title: group.title,
        sessionCount: group.sessions.length,
        sessions: group.sessions,
        totalDuration: group.sessions.reduce((sum: number, s: any) => sum + s.duration, 0),
        totalAttendees: group.sessions.reduce((sum: number, s: any) => sum + (s._count?.participations || 0), 0),
        potentialStudents: estimatePotentialStudents(group.sessions),
        avgEngagement: Math.round(
          group.sessions.reduce((sum: number, s: any) => sum + (s.engagementScore || 0), 0) / group.sessions.length
        ),
      }))
      .sort((a, b) => b.potentialStudents - a.potentialStudents) // Sort by potential
      .slice(0, 5); // Top 5 suggestions

    return { success: true, suggestions };
  } catch (error) {
    console.error("Error analyzing course potential:", error);
    return { success: false, error: "Failed to analyze" };
  }
}

/**
 * Group sessions by topic similarity
 */
function groupSessionsByTopic(sessions: any[]) {
  const groups: { title: string; sessions: any[] }[] = [];
  
  // Define topic keywords and their variations
  const topicKeywords: { [key: string]: string[] } = {
    "Marketing": ["marketing", "growth", "ads", "facebook", "google", "seo", "email", "funnel", "conversion", "acquisition"],
    "Sales": ["sales", "selling", "closing", "prospecting", "negotiation", "deal", "revenue"],
    "Product": ["product", "ux", "design", "user research", "feature", "roadmap", "pm"],
    "Engineering": ["engineering", "coding", "development", "architecture", "tech", "software", "dev"],
    "Leadership": ["leadership", "management", "team", "hiring", "culture", "lead", "executive"],
    "Finance": ["finance", "fundraising", "investment", "money", "accounting", "revenue", "profit"],
    "Strategy": ["strategy", "business model", "planning", "vision", "mission", "goals"],
    "Operations": ["ops", "operations", "process", "efficiency", "systems", "automation"],
  };
  
  // Track assigned sessions
  const assignedSessionIds = new Set<string>();
  
  // Try to match sessions to topics
  for (const [topicName, keywords] of Object.entries(topicKeywords)) {
    const matchedSessions = sessions.filter((session) => {
      if (assignedSessionIds.has(session.id)) return false;
      
      const titleLower = session.title.toLowerCase();
      const descLower = (session.description || "").toLowerCase();
      
      return keywords.some((keyword) => 
        titleLower.includes(keyword) || descLower.includes(keyword)
      );
    });
    
    if (matchedSessions.length >= 2) {
      groups.push({
        title: `${topicName} Mastery`,
        sessions: matchedSessions,
      });
      matchedSessions.forEach((s) => assignedSessionIds.add(s.id));
    }
  }
  
  // Group remaining sessions by series
  const remainingBySeries: { [key: string]: any[] } = {};
  sessions.forEach((session) => {
    if (!assignedSessionIds.has(session.id) && session.seriesId) {
      if (!remainingBySeries[session.seriesId]) {
        remainingBySeries[session.seriesId] = [];
      }
      remainingBySeries[session.seriesId].push(session);
    }
  });
  
  for (const [_seriesId, seriesSessions] of Object.entries(remainingBySeries)) {
    if (seriesSessions.length >= 2) {
      const seriesTitle = seriesSessions[0].series?.title || "Series";
      groups.push({
        title: seriesTitle,
        sessions: seriesSessions,
      });
      seriesSessions.forEach((s) => assignedSessionIds.add(s.id));
    }
  }
  
  return groups;
}

/**
 * Estimate potential students based on past attendance
 */
function estimatePotentialStudents(sessions: any[]): number {
  // Average unique attendees across sessions
  const uniqueAttendees = new Set<string>();
  let totalAttendees = 0;
  
  sessions.forEach((session) => {
    session.participations?.forEach((p: any) => {
      uniqueAttendees.add(p.userId);
    });
    totalAttendees += session._count?.participations || 0;
  });
  
  // Estimate: unique attendees + 20% of total (for people who missed but are interested)
  const estimate = uniqueAttendees.size + Math.floor(totalAttendees * 0.2);
  return Math.max(estimate, sessions.length * 5); // Minimum 5 per session
}

/**
 * Get knowledge impact stats for the user
 */
export async function getKnowledgeImpact(communityId?: string) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return { success: false, error: "Not authenticated" };
    }

    const whereClause: any = {
      mentorId: userId,
    };

    if (communityId) {
      whereClause.communityId = communityId;
    }

    // Get all sessions
    const sessions = await prisma.mentorSession.findMany({
      where: whereClause,
      include: {
        _count: {
          select: {
            participations: true,
          },
        },
      },
    });

    // Get courses created from sessions (via session resources)
    const coursesFromSessions = await prisma.sessionResource.findMany({
      where: {
        createdById: userId,
        type: "video",
        OR: [
          { title: { contains: "course" } },
          { title: { contains: "Course" } },
        ],
      },
      select: {
        sessionId: true,
      },
      distinct: ["sessionId"],
    });

    // Get total enrollments across user's courses
    const userCourses = await prisma.course.findMany({
      where: {
        community: {
          ownerId: userId,
        },
      },
      include: {
        _count: {
          select: {
            enrollments: true,
          },
        },
        modules: {
          include: {
            lessons: true,
          },
        },
      },
    });

    const totalSessions = sessions.length;
    const completedSessions = sessions.filter((s) => s.status === "COMPLETED").length;
    const totalAttendees = sessions.reduce((sum, s) => sum + (s._count?.participations || 0), 0);
    
    const totalCourses = userCourses.length;
    const coursesFromSessionsCount = coursesFromSessions.length;
    const totalEnrollments = userCourses.reduce((sum, c) => sum + (c._count?.enrollments || 0), 0);
    const totalLessons = userCourses.reduce((sum, c) => 
      sum + c.modules.reduce((mSum, m) => mSum + m.lessons.length, 0), 0
    );

    return {
      success: true,
      stats: {
        totalSessions,
        completedSessions,
        totalAttendees,
        totalCourses,
        coursesFromSessions: coursesFromSessionsCount,
        totalEnrollments,
        totalLessons,
        conversionRate: totalSessions > 0 ? Math.round((coursesFromSessionsCount / totalSessions) * 100) : 0,
      },
    };
  } catch (error) {
    console.error("Error getting knowledge impact:", error);
    return { success: false, error: "Failed to get stats" };
  }
}

/**
 * Create a course from multiple selected sessions
 */
export async function createCourseFromSessions(
  sessionIds: string[],
  courseData: {
    title: string;
    description?: string;
    communityId: string;
    isPaid?: boolean;
    price?: number;
  }
) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return { success: false, error: "Not authenticated" };
    }

    if (!sessionIds || sessionIds.length === 0) {
      return { success: false, error: "No sessions selected" };
    }

    // Verify all sessions belong to user and have recordings
    const sessions = await prisma.mentorSession.findMany({
      where: {
        id: { in: sessionIds },
        mentorId: userId,
        status: "COMPLETED",
      },
      include: {
        notes: true,
        recording: true,
      },
      orderBy: { scheduledAt: "asc" }, // Chronological order
    });

    if (sessions.length === 0) {
      return { success: false, error: "No valid sessions found" };
    }

    if (sessions.length !== sessionIds.length) {
      return { success: false, error: "Some sessions not found or not completed" };
    }

    // Check community ownership
    const community = await prisma.community.findFirst({
      where: {
        id: courseData.communityId,
        ownerId: userId,
      },
    });

    if (!community) {
      return { success: false, error: "Community not found or unauthorized" };
    }

    // Generate unique slug
    const baseSlug = courseData.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const uniqueSlug = `${baseSlug}-${Date.now()}`;

    // Create course
    const course = await prisma.course.create({
      data: {
        title: courseData.title,
        slug: uniqueSlug,
        description: courseData.description || `Course created from ${sessions.length} live sessions`,
        communityId: courseData.communityId,
        isPaid: courseData.isPaid || false,
        price: courseData.price || 0,
        isPublished: true,
      },
    });

    // Create module for the sessions
    const module = await prisma.module.create({
      data: {
        title: "Live Sessions",
        description: "Recorded live sessions from the community",
        position: 1,
        courseId: course.id,
      },
    });

    // Create lessons from each session
    const createdLessons = [];
    for (let i = 0; i < sessions.length; i++) {
      const session = sessions[i];
      const recordingUrl = session.recordingUrl || session.recording?.url || "";
      
      // Build content from notes
      let content = "";
      if (session.notes?.content) {
        content = `## Session Notes\n\n${session.notes.content}`;
      }
      content += `\n\n---\n\n**Session Info:**\n- Duration: ${session.duration} minutes\n- Original session date: ${session.scheduledAt.toLocaleDateString()}`;

      const lesson = await prisma.lesson.create({
        data: {
          title: session.title,
          content: content,
          contentType: session.mode === "AUDIO" ? "AUDIO" : "VIDEO",
          videoUrl: recordingUrl,
          duration: session.duration,
          position: i + 1,
          moduleId: module.id,
          isFree: i === 0 && sessions.length > 1, // First lesson free as preview if multiple
          isPublished: true,
        },
      });
      createdLessons.push(lesson);

      // Track conversion
      await prisma.sessionResource.create({
        data: {
          sessionId: session.id,
          type: "video",
          title: `Added to course: ${course.title}`,
          url: `/dashboard/courses/${course.id}`,
          description: `Session converted to course lesson`,
          createdById: userId,
        },
      });
    }

    revalidatePath(`/dashboard/courses/${course.id}`);
    revalidatePath(`/dashboard/knowledge-library`);
    revalidatePath(`/dashboard/communities/${courseData.communityId}/feed`);

    return {
      success: true,
      course,
      lessons: createdLessons,
      message: `Created "${course.title}" with ${createdLessons.length} lessons from your sessions`,
    };
  } catch (error) {
    console.error("Error creating course from sessions:", error);
    return { success: false, error: "Failed to create course" };
  }
}
