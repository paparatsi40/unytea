import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

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

    // Get upcoming mentor sessions where user is mentor
    const sessions = await prisma.mentorSession.findMany({
      where: {
        mentorId: userId,
        scheduledAt: {
          gte: new Date(),
        },
        status: {
          in: ["SCHEDULED", "IN_PROGRESS"],
        },
      },
      orderBy: {
        scheduledAt: "asc",
      },
      take: 3,
      include: {
        participations: {
          select: {
            id: true,
          },
        },
        mentee: {
          select: {
            name: true,
          },
        },
      },
    });

    // Format events
    const events = sessions.map((session) => ({
      id: session.id,
      title: session.title,
      type: session.status === "IN_PROGRESS" ? "live" : "session" as const,
      time: formatTime(session.scheduledAt),
      community: session.mentee?.name || "Session",
      attendees: session.participations.length,
    }));

    return NextResponse.json({ events });
  } catch (error) {
    console.error("Error fetching dashboard events:", error);
    return NextResponse.json(
      { error: "Failed to fetch events" },
      { status: 500 }
    );
  }
}

function formatTime(date: Date): string {
  const now = new Date();
  const eventDate = new Date(date);
  const diff = eventDate.getTime() - now.getTime();
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (hours < 1) return "Starting soon";
  if (hours < 24) return `In ${hours}h`;
  if (days === 1) return "Tomorrow";
  return `In ${days}d`;
}
