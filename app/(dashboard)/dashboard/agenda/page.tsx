import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AgendaPageClient, type AgendaSession } from "./AgendaPageClient";

export const metadata = {
  title: "Agenda | Unytea",
  description: "All your upcoming sessions across communities",
};

export default async function AgendaPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  // Get all sessions where user is mentor or mentee
  const allSessions = await prisma.mentorSession.findMany({
    where: {
      OR: [{ mentorId: session.user.id }, { menteeId: session.user.id }],
      // Only show sessions with communityId (new architecture)
      communityId: { not: null },
    },
    select: {
      id: true,
      title: true,
      scheduledAt: true,
      duration: true,
      recordingUrl: true,
      community: {
        select: {
          name: true,
          imageUrl: true,
        },
      },
    },
    orderBy: {
      scheduledAt: "asc",
    },
  });

  // Serialize to plain props so the client view can localize dates/strings
  // (the dashboard route group has no [locale] segment for server getTranslations).
  const mapped: AgendaSession[] = allSessions.map((s) => ({
    id: s.id,
    title: s.title,
    scheduledAt: s.scheduledAt.toISOString(),
    duration: s.duration,
    recordingUrl: s.recordingUrl,
    communityName: s.community?.name ?? null,
    communityImageUrl: s.community?.imageUrl ?? null,
  }));

  const now = new Date();
  const upcoming = mapped.filter((s) => new Date(s.scheduledAt) > now);
  const past = mapped.filter((s) => new Date(s.scheduledAt) <= now);

  return <AgendaPageClient upcoming={upcoming} past={past} />;
}
