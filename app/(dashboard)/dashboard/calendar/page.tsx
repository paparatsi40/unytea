import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CalendarPageClient } from "./CalendarPageClient";

export const metadata = {
  title: "Calendar | Unytea",
  description: "View all your upcoming and past sessions in a calendar view",
};

export default async function CalendarPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  const userId = session.user.id;

  // Fetch all sessions for this user (as host, participant, or community member)
  const sessions = await prisma.mentorSession.findMany({
    where: {
      OR: [
        { mentorId: userId },
        { menteeId: userId },
        {
          participations: {
            some: { userId },
          },
        },
      ],
      communityId: { not: null },
    },
    select: {
      id: true,
      title: true,
      scheduledAt: true,
      duration: true,
      status: true,
      slug: true,
      mentor: {
        select: { name: true, image: true },
      },
      community: {
        select: { name: true, slug: true },
      },
      _count: {
        select: { participations: true },
      },
    },
    orderBy: { scheduledAt: "asc" },
  });

  const calendarSessions = sessions.map((s) => ({
    id: s.id,
    title: s.title,
    scheduledAt: s.scheduledAt.toISOString(),
    duration: s.duration || 60,
    status: s.status,
    hostName: s.mentor?.name || undefined,
    hostImage: s.mentor?.image || undefined,
    communityName: s.community?.name || undefined,
    communitySlug: s.community?.slug || undefined,
    slug: s.slug || undefined,
    participantCount: s._count.participations,
  }));

  return <CalendarPageClient sessions={calendarSessions} />;
}
