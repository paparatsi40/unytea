import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getUserSessions } from "@/app/actions/sessions";
import { Video, Calendar, Clock, Play, Radio, Users, ArrowRight, VideoIcon, Sparkles } from "lucide-react";
import { CreateSessionDialog } from "@/components/sessions/CreateSessionDialog";
import { format, isToday, isTomorrow, isThisWeek, formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export const metadata = {
  title: "Live Sessions | Unytea",
  description: "Run live coaching, classes, and workshops",
};

function formatSessionDate(date: Date): string {
  if (isToday(date)) return "Today";
  if (isTomorrow(date)) return "Tomorrow";
  return format(date, "EEEE, MMMM d");
}

function formatSessionTime(date: Date): string {
  return format(date, "h:mm a");
}

export default async function SessionsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  const result = await getUserSessions();

  if (!result.success || !result.sessions) {
    return (
      <div className="flex min-h-[600px] items-center justify-center">
        <div className="text-center">
          <Video className="mx-auto mb-4 h-12 w-12 text-zinc-500" />
          <h2 className="mb-2 text-xl font-semibold text-white">
            Failed to load sessions
          </h2>
          <p className="text-zinc-400">{result.error || "An error occurred"}</p>
        </div>
      </div>
    );
  }

  const { upcoming, past } = result.sessions;
  const totalSessions = upcoming.length + past.length;
  
  // Calculate sessions this week
  const sessionsThisWeek = upcoming.filter(s => 
    isThisWeek(new Date(s.scheduledAt), { weekStartsOn: 1 })
  ).length;

  // Check if there's a live session (for demo purposes, we'll check status)
  // In production, you'd check if session.status === "LIVE" or similar
  const liveSession = upcoming.find(s => {
    const sessionDate = new Date(s.scheduledAt);
    const now = new Date();
    // Consider "live" if scheduled within last hour and not ended
    const diffMinutes = (now.getTime() - sessionDate.getTime()) / (1000 * 60);
    return diffMinutes >= 0 && diffMinutes <= 60;
  });

  return (
    <div className="space-y-8 p-8">
      {/* HEADER with Stats */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Live Sessions</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Run live coaching, classes, and workshops
          </p>
          {sessionsThisWeek > 0 && (
            <p className="mt-2 text-sm font-medium text-purple-400">
              <Sparkles className="mr-1 inline h-4 w-4" />
              {sessionsThisWeek} session{sessionsThisWeek !== 1 ? "s" : ""} this week
            </p>
          )}
        </div>
        <CreateSessionDialog
          triggerText="Schedule Session"
          className="inline-flex items-center gap-2 rounded-full bg-purple-600 px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-purple-700"
        />
      </div>

      {/* LIVE NOW SECTION */}
      {liveSession && (
        <div className="relative overflow-hidden rounded-2xl border border-red-500/30 bg-gradient-to-r from-red-950/50 to-zinc-900 p-6">
          <div className="absolute left-0 top-0 h-full w-1 bg-red-500" />
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/20">
                <Radio className="h-6 w-6 animate-pulse text-red-500" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-red-500 text-white">LIVE NOW</Badge>
                  <span className="text-xs text-zinc-400">
                    Started {formatDistanceToNow(new Date(liveSession.scheduledAt))} ago
                  </span>
                </div>
                <h2 className="mt-1 text-xl font-semibold text-white">
                  {liveSession.title}
                </h2>
                <p className="mt-1 text-sm text-zinc-400">
                  with {liveSession.mentor.name}
                </p>
                <div className="mt-3 flex items-center gap-4 text-sm text-zinc-400">
                  <span className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {/* In production, fetch actual participant count */}
                    12 participants
                  </span>
                </div>
              </div>
            </div>
            <Link href={`/dashboard/sessions/${liveSession.id}/room`}>
              <Button className="rounded-full bg-red-500 px-6 hover:bg-red-600">
                Join Session
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* UPCOMING SESSIONS */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Radio className="h-5 w-5 text-purple-400" />
            <h2 className="text-lg font-semibold text-white">Upcoming Sessions</h2>
            {upcoming.length > 0 && (
              <Badge variant="secondary" className="bg-zinc-800 text-zinc-300">
                {upcoming.length}
              </Badge>
            )}
          </div>
        </div>

        {upcoming.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/30 p-8">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-purple-500/10">
                <Video className="h-8 w-8 text-purple-400" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-white">
                Host your first live session
              </h3>
              <p className="mt-2 max-w-sm text-sm text-zinc-400">
                Run coaching calls, workshops, or Q&A sessions. Engage your community in real-time.
              </p>
              <div className="mt-6 flex items-center gap-4">
                <CreateSessionDialog
                  triggerText="Schedule Session"
                  className="inline-flex items-center gap-2 rounded-full bg-purple-600 px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-purple-700"
                />
                <span className="text-xs text-zinc-500">Takes 2 minutes</span>
              </div>
              <p className="mt-4 text-xs text-zinc-500">
                Communities with weekly sessions grow 3x faster
              </p>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {upcoming.map((s) => (
              <div
                key={s.id}
                className="group relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 transition-all hover:border-zinc-700 hover:bg-zinc-900"
              >
                {/* Date Badge */}
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-zinc-400" />
                    <span className="text-zinc-300">
                      {formatSessionDate(new Date(s.scheduledAt))}
                    </span>
                  </div>
                  <span className="text-xs text-zinc-500">
                    {formatSessionTime(new Date(s.scheduledAt))}
                  </span>
                </div>

                {/* Title & Host */}
                <h3 className="font-semibold text-white group-hover:text-purple-400 transition-colors">
                  {s.title}
                </h3>
                <p className="mt-1 text-sm text-zinc-400">
                  with {s.mentor.name}
                </p>

                {/* Meta Info */}
                <div className="mt-4 flex items-center gap-4 text-xs text-zinc-500">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {s.duration} min
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {/* In production, fetch actual count */}
                    0 attending
                  </span>
                </div>

                {/* Actions */}
                <div className="mt-4 flex items-center gap-2">
                  <Link href={`/dashboard/sessions/${s.id}/room`} className="flex-1">
                    <Button 
                      variant="default" 
                      size="sm"
                      className="w-full rounded-full bg-purple-600 hover:bg-purple-700"
                    >
                      Join
                    </Button>
                  </Link>
                  <CreateSessionDialog
                    triggerText="Edit"
                    className="inline-flex items-center justify-center rounded-full border border-zinc-700 bg-transparent px-3 py-1.5 text-xs text-zinc-400 transition-all hover:bg-zinc-800 hover:text-zinc-200"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* PAST SESSIONS */}
      {past.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Play className="h-5 w-5 text-zinc-400" />
            <h2 className="text-lg font-semibold text-white">Past Sessions</h2>
            <Badge variant="secondary" className="bg-zinc-800 text-zinc-300">
              {past.length}
            </Badge>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {past.slice(0, 6).map((s) => (
              <div
                key={s.id}
                className="group relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/30 p-5 transition-all hover:border-zinc-700 hover:bg-zinc-900/50"
              >
                {/* Recording Badge */}
                {s.status === "COMPLETED" && (
                  <div className="absolute right-3 top-3">
                    <Badge className="bg-green-500/10 text-green-400 border-green-500/20 text-xs">
                      <VideoIcon className="mr-1 h-3 w-3" />
                      Recording available
                    </Badge>
                  </div>
                )}

                {/* Date */}
                <div className="mb-3 flex items-center gap-2 text-sm text-zinc-500">
                  <Calendar className="h-4 w-4" />
                  {formatDistanceToNow(new Date(s.scheduledAt), { addSuffix: true })}
                </div>

                {/* Title */}
                <h3 className="font-medium text-white group-hover:text-zinc-200 transition-colors">
                  {s.title}
                </h3>

                {/* Duration */}
                <div className="mt-2 flex items-center gap-1 text-xs text-zinc-500">
                  <Clock className="h-3 w-3" />
                  {s.duration} min
                </div>

                {/* Actions */}
                <div className="mt-4 flex items-center gap-2">
                  {s.status === "COMPLETED" ? (
                    <>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="flex-1 rounded-full border-zinc-700 bg-transparent text-xs text-zinc-300 hover:bg-zinc-800"
                      >
                        <Play className="mr-1 h-3 w-3" />
                        Watch
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="text-xs text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
                      >
                        Add to course
                      </Button>
                    </>
                  ) : (
                    <span className="text-xs text-zinc-500">
                      Recording processing...
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {past.length > 6 && (
            <div className="text-center">
              <Button variant="ghost" className="text-zinc-400 hover:text-white">
                View all {past.length} past sessions
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
