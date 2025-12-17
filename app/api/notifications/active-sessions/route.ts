import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ notifications: [] });
    }

    const userId = session.user.id;
    const now = new Date();
    const in15Minutes = new Date(now.getTime() + 15 * 60 * 1000);

    // Get user's notification preferences
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        sessionReminders: true,
        sessionStarted: true,
        pushNotifications: true,
      },
    });

    if (!user || !user.pushNotifications) {
      return NextResponse.json({ notifications: [] });
    }

    // Find sessions where user is a participant
    // 1. Sessions starting in next 15 minutes (SCHEDULED)
    // 2. Sessions that have started (IN_PROGRESS)
    const upcomingSessions = await prisma.mentorSession.findMany({
      where: {
        OR: [
          {
            // Sessions starting soon
            status: "SCHEDULED",
            scheduledAt: {
              gte: now,
              lte: in15Minutes,
            },
            OR: [
              { mentorId: userId },
              { menteeId: userId },
              {
                communityId: {
                  not: null,
                },
              },
            ],
          },
          {
            // Sessions in progress
            status: "IN_PROGRESS",
            OR: [
              { mentorId: userId },
              { menteeId: userId },
              {
                communityId: {
                  not: null,
                },
              },
            ],
          },
        ],
      },
      include: {
        community: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        participations: {
          where: {
            userId,
          },
          select: {
            joinedAt: true,
            leftAt: true,
          },
        },
      },
    });

    // Filter based on user preferences and membership
    const notifications = await Promise.all(
      upcomingSessions.map(async (s) => {
        const hasStarted = s.status === "IN_PROGRESS";

        // Check preferences
        if (hasStarted && !user.sessionStarted) return null;
        if (!hasStarted && !user.sessionReminders) return null;

        // Check if user has already joined
        const hasJoined = s.participations.some(
          (p) => p.joinedAt && !p.leftAt
        );
        if (hasJoined) return null;

        // If it's a community session, check if user is a member
        if (s.communityId) {
          const member = await prisma.member.findUnique({
            where: {
              userId_communityId: {
                userId,
                communityId: s.communityId,
              },
            },
          });

          if (!member || member.status !== "ACTIVE") return null;
        }

        // Calculate time until start
        const timeUntilStart = hasStarted
          ? 0
          : Math.ceil((s.scheduledAt.getTime() - now.getTime()) / (1000 * 60));

        return {
          id: `session-${s.id}`,
          sessionId: s.id,
          sessionTitle: s.title,
          communityName: s.community?.name,
          communitySlug: s.community?.slug,
          timeUntilStart,
          hasStarted,
        };
      })
    );

    // Filter out nulls
    const validNotifications = notifications.filter((n) => n !== null);

    return NextResponse.json({ notifications: validNotifications });
  } catch (error) {
    console.error("Error fetching active sessions:", error);
    return NextResponse.json({ notifications: [] });
  }
}