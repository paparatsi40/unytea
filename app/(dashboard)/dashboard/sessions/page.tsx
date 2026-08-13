import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getUserSessions } from "@/app/actions/sessions";
import { prisma } from "@/lib/prisma";
import { isThisWeek } from "date-fns";
import { SessionsPageClient, type SessionItem } from "./SessionsPageClient";

export const metadata = {
  title: "Live Sessions | Unytea",
  description: "Run live coaching, classes, and workshops",
};

export default async function SessionsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  // Only the community OWNER may create or host a live session, so the
  // community a new session would attach to must be one the viewer owns.
  //
  // This previously resolved owner-OR-active-member and offered the create
  // control to everyone, which is now a server-side FORBIDDEN. Resolving the
  // owned community instead keeps the control working for owners — matching on
  // membership would have hidden it from an owner whose oldest community is
  // merely one they joined.
  //
  // A non-owner still sees their own sessions below; getUserSessions() does not
  // depend on this, and communityId feeds nothing but the create dialog.
  const ownedCommunity = await prisma.community.findFirst({
    where: { ownerId: session.user.id },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });
  const canCreateSessions = ownedCommunity !== null;

  const result = await getUserSessions();

  // The (dashboard) route group has no [locale] segment, so the strings/dates
  // are localized in the client view. The page stays a thin fetcher and keeps
  // the minute-level time computations server-side to avoid hydration drift.
  if (!result.success || !result.sessions) {
    return (
      <SessionsPageClient
        upcoming={[]}
        past={[]}
        communityId={ownedCommunity?.id}
        canCreateSessions={canCreateSessions}
        sessionsThisWeek={0}
        liveSessionId={null}
        startingSoon={null}
        error={result.error || ""}
      />
    );
  }

  const { upcoming: upcomingRaw, past: pastRaw } = result.sessions;

  const toItem = (s: (typeof upcomingRaw)[number]): SessionItem => ({
    id: s.id,
    title: s.title,
    scheduledAt: s.scheduledAt.toISOString(),
    duration: s.duration,
    status: s.status,
    recordingUrl: s.recordingUrl,
    mentorName: s.mentor?.name ?? null,
  });

  const upcoming = upcomingRaw.map(toItem);
  const past = pastRaw.map(toItem);

  // Sessions scheduled this week (Mon-start, matches original behavior)
  const sessionsThisWeek = upcomingRaw.filter((s) =>
    isThisWeek(new Date(s.scheduledAt), { weekStartsOn: 1 })
  ).length;

  // A session is "live" if it started within the last hour.
  const now = new Date();
  const liveSession = upcomingRaw.find((s) => {
    const diffMinutes = (now.getTime() - new Date(s.scheduledAt).getTime()) / (1000 * 60);
    return diffMinutes >= 0 && diffMinutes <= 60;
  });

  // Next session, surfaced as a "starting soon" banner when ≤10 min away.
  const nextSession = upcomingRaw[0] ?? null;
  const nextSessionStartsInMinutes = nextSession
    ? Math.floor((new Date(nextSession.scheduledAt).getTime() - now.getTime()) / (1000 * 60))
    : null;
  const startingSoon =
    nextSession &&
    nextSessionStartsInMinutes !== null &&
    nextSessionStartsInMinutes >= 0 &&
    nextSessionStartsInMinutes <= 10
      ? { id: nextSession.id, startsInMinutes: nextSessionStartsInMinutes }
      : null;

  return (
    <SessionsPageClient
      upcoming={upcoming}
      past={past}
      communityId={ownedCommunity?.id}
      canCreateSessions={canCreateSessions}
      sessionsThisWeek={sessionsThisWeek}
      liveSessionId={liveSession?.id ?? null}
      startingSoon={startingSoon}
      error={null}
    />
  );
}
