import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Video, Calendar, Clock, ArrowRight, Sparkles, Users } from "lucide-react";
import { format, isToday, isTomorrow, formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

function formatSessionDate(date: Date): string {
  if (isToday(date)) return "Today";
  if (isTomorrow(date)) return "Tomorrow";
  return format(date, "EEEE, MMM d");
}

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
      OR: [
        { mentorId: session.user.id },
        { menteeId: session.user.id },
      ],
      // Only show sessions with communityId (new architecture)
      communityId: { not: null },
    },
    select: {
      id: true,
      title: true,
      scheduledAt: true,
      duration: true,
      status: true,
      recordingUrl: true,
      communityId: true,
      mentor: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
      community: {
        select: {
          id: true,
          name: true,
          slug: true,
          imageUrl: true,
        },
      },
    },
    orderBy: {
      scheduledAt: "asc",
    },
  });

  const now = new Date();
  const upcoming = allSessions.filter((s) => new Date(s.scheduledAt) > now);
  const past = allSessions.filter((s) => new Date(s.scheduledAt) <= now);

  // Group upcoming by date
  const groupedByDate = upcoming.reduce((acc, session) => {
    const date = formatSessionDate(new Date(session.scheduledAt));
    if (!acc[date]) acc[date] = [];
    acc[date].push(session);
    return acc;
  }, {} as Record<string, typeof upcoming>);

  return (
    <div className="space-y-8 p-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Your Agenda</h1>
        <p className="mt-1 text-sm text-zinc-400">
          All your upcoming sessions across communities
        </p>
        {upcoming.length > 0 && (
          <p className="mt-2 text-sm font-medium text-purple-400">
            <Sparkles className="mr-1 inline h-4 w-4" />
            {upcoming.length} upcoming session{upcoming.length !== 1 ? "s" : ""} this week
          </p>
        )}
      </div>

      {/* UPCOMING SESSIONS GROUPED BY DATE */}
      {upcoming.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-900 p-8 text-center">
          <Video className="mx-auto mb-4 h-12 w-12 text-zinc-500" />
          <h2 className="mb-2 text-xl font-semibold text-white">
            No upcoming sessions
          </h2>
          <p className="text-zinc-400">
            You don&apos;t have any scheduled sessions. Join a community to find live events.
          </p>
          <Link href="/dashboard/communities">
            <Button className="mt-4 rounded-full bg-purple-600 hover:bg-purple-700">
              Explore Communities
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedByDate).map(([date, sessions]) => (
            <div key={date} className="space-y-3">
              <h2 className="flex items-center gap-2 text-sm font-medium text-zinc-400">
                <Calendar className="h-4 w-4" />
                {date}
              </h2>

              <div className="space-y-3">
                {sessions.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-950 p-4 transition-all hover:border-zinc-700"
                  >
                    {/* Community Avatar */}
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-zinc-900">
                      {s.community?.imageUrl ? (
                        <img
                          src={s.community.imageUrl}
                          alt={s.community.name}
                          className="h-full w-full rounded-lg object-cover"
                        />
                      ) : (
                        <Users className="h-6 w-6 text-zinc-500" />
                      )}
                    </div>

                    {/* Session Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-white truncate">
                          {s.title}
                        </h3>
                        {isToday(new Date(s.scheduledAt)) && (
                          <Badge className="bg-purple-600 text-white text-xs">
                            Today
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-zinc-400">
                        {s.community?.name} • {format(new Date(s.scheduledAt), "h:mm a")}
                      </p>
                    </div>

                    {/* Duration */}
                    <div className="hidden sm:flex items-center gap-1 text-xs text-zinc-500">
                      <Clock className="h-3 w-3" />
                      {s.duration} min
                    </div>

                    {/* Actions */}
                    <Link href={`/dashboard/sessions/${s.id}/room`}>
                      <Button
                        size="sm"
                        className="rounded-full bg-purple-600 hover:bg-purple-700"
                      >
                        Join
                        <ArrowRight className="ml-1 h-3 w-3" />
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* PAST SESSIONS SUMMARY */}
      {past.length > 0 && (
        <div className="pt-4 border-t border-zinc-800">
          <h2 className="text-sm font-medium text-zinc-400 mb-3">
            Recent Past Sessions ({past.length})
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {past.slice(0, 4).map((s) => (
              <div
                key={s.id}
                className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-950/50 p-3"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-zinc-900">
                  <Users className="h-5 w-5 text-zinc-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-white truncate">{s.title}</p>
                  <p className="text-xs text-zinc-500">
                    {s.community?.name} • {formatDistanceToNow(new Date(s.scheduledAt), { addSuffix: true })}
                  </p>
                </div>
                {s.recordingUrl && (
                  <Badge className="bg-green-500/10 text-green-400 border-0 text-xs">
                    Recording
                  </Badge>
                )}
              </div>
            ))}
          </div>
          {past.length > 4 && (
            <div className="mt-4 text-center">
              <Link href="/dashboard/sessions">
                <Button variant="ghost" className="text-zinc-400 hover:text-white">
                  View all {past.length} sessions
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
