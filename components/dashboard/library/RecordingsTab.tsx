import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { RecordingsTabView } from "./RecordingsTabView";

// Server-thin: keeps the Prisma fetch server-side and passes results to the
// client view (which localizes via useTranslations). Types are exported for
// the view via `import type` (no prisma in the client bundle).
async function getRecordedSessions(userId: string) {
  const sessions = await prisma.mentorSession.findMany({
    where: {
      OR: [{ mentorId: userId }, { menteeId: userId }],
      status: "COMPLETED",
      recordingUrl: { not: null },
    },
    orderBy: {
      endedAt: "desc",
    },
    select: {
      id: true,
      title: true,
      slug: true,
      description: true,
      scheduledAt: true,
      duration: true,
      recordingUrl: true,
      endedAt: true,
      recording: {
        select: {
          url: true,
        },
      },
      mentor: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
      participations: {
        select: {
          id: true,
        },
      },
    },
  });

  return sessions;
}

async function getNextLiveSession(userId: string) {
  return prisma.mentorSession.findFirst({
    where: {
      OR: [{ mentorId: userId }, { menteeId: userId }],
      status: "SCHEDULED",
      scheduledAt: { gt: new Date() },
    },
    orderBy: { scheduledAt: "asc" },
    select: {
      id: true,
      title: true,
      scheduledAt: true,
      duration: true,
    },
  });
}

export type RecordingRow = Awaited<ReturnType<typeof getRecordedSessions>>[number];
export type NextLiveSession = Awaited<ReturnType<typeof getNextLiveSession>>;

export async function RecordingsTab() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  const [recordings, nextLiveSession] = await Promise.all([
    getRecordedSessions(session.user.id),
    getNextLiveSession(session.user.id),
  ]);

  return <RecordingsTabView recordings={recordings} nextLiveSession={nextLiveSession} />;
}
