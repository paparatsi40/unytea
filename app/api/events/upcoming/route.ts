import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Get upcoming events for the user
 * GET /api/events/upcoming
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
    const now = new Date();

    // Get user's upcoming sessions as mentor
    const mentorSessions = await prisma.mentorSession.findMany({
      where: {
        mentorId: userId,
        scheduledAt: {
          gte: now,
        },
        status: "SCHEDULED",
      },
      orderBy: {
        scheduledAt: "asc",
      },
      take: 5,
    });

    // Get user's upcoming sessions as mentee
    const menteeSessions = await prisma.mentorSession.findMany({
      where: {
        menteeId: userId,
        scheduledAt: {
          gte: now,
        },
        status: "SCHEDULED",
      },
      orderBy: {
        scheduledAt: "asc",
      },
      take: 5,
    });

    // Combine and format events
    const allSessions = [...mentorSessions, ...menteeSessions];
    
    const events = allSessions.map((s) => {
      const startTime = new Date(s.scheduledAt);
      const diff = startTime.getTime() - now.getTime();
      const hours = Math.floor(diff / 3600000);
      const days = Math.floor(diff / 86400000);

      let timeLabel: string;
      if (hours < 1) {
        timeLabel = "Starting soon";
      } else if (hours < 24) {
        timeLabel = `In ${hours}h`;
      } else if (days < 7) {
        timeLabel = startTime.toLocaleDateString("en-US", { weekday: "short", hour: "numeric", minute: "2-digit" });
      } else {
        timeLabel = startTime.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
      }

      return {
        id: s.id,
        title: s.title,
        type: "session" as const,
        time: timeLabel,
        community: null, // MentorSession doesn't have community relation
      };
    });

    return NextResponse.json({ events });
  } catch (error: any) {
    console.error("Error fetching upcoming events:", error);
    return NextResponse.json(
      { error: "Failed to fetch events" },
      { status: 500 }
    );
  }
}
