import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Video, Calendar, Clock, Play, Radio, Users, ArrowRight, Sparkles } from "lucide-react";
import { CreateSessionDialog } from "@/components/sessions/CreateSessionDialog";
import { format, isToday, isTomorrow, isThisWeek, formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface CommunitySessionsPageProps {
  params: Promise<{
    communityId: string;
  }>;
}

function formatSessionDate(date: Date): string {
  if (isToday(date)) return "Today";
  if (isTomorrow(date)) return "Tomorrow";
  return format(date, "EEEE, MMMM d");
}

function formatSessionTime(date: Date): string {
  return format(date, "h:mm a");
}

export default async function CommunitySessionsPage({ params }: CommunitySessionsPageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  const { communityId } = await params;

  // Verify community exists and user is a member
  const community = await prisma.community.findUnique({
    where: { id: communityId },
    include: {
      members: {
        where: { userId: session.user.id },
        select: { id: true, role: true },
      },
    },
  });

  if (!community) {
    notFound();
  }

  const isMember = community.members.length > 0;
  const isOwner = community.ownerId === session.user.id;
  const canCreateSessions = isOwner || community.members.some(m => m.role === "ADMIN" || m.role === "MODERATOR");

  // Get sessions for this community
  const allSessions = await prisma.mentorSession.findMany({
    where: {
      communityId,
    },
    select: {
      id: true,
      title: true,
      description: true,
      scheduledAt: true,
      duration: true,
      status: true,
      recordingUrl: true,
      mentorId: true,
      mentor: {
        select: {
          id: true,
          name: true,
          image: true,
          username: true,
        },
      },
    },
    orderBy: {
      scheduledAt: "asc",
    },
  });

  // Separate upcoming and past
  const now = new Date();
  const upcoming = allSessions.filter((s) => new Date(s.scheduledAt) > now);
  const past = allSessions.filter((s) => new Date(s.scheduledAt) <= now);

  // Check for live session
  const liveSession = upcoming.find((s) => {
    const sessionDate = new Date(s.scheduledAt);
    const diffMinutes = (now.getTime() - sessionDate.getTime()) / (1000 * 60);
    return diffMinutes >= -5 && diffMinutes <= 60; // Starting in 5 min or started within last hour
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Live Sessions</h1>
          <p className="mt-1 text-sm text-zinc-400">
            {community.name} • Run live coaching, classes, and workshops
          </p>
          {upcoming.length > 0 && (
            <p className="mt-2 text-sm font-medium text-purple-400">
              <Sparkles className="mr-1 inline h-4 w-4" />
              {upcoming.length} upcoming session{upcoming.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>
        {canCreateSessions && (
          <CreateSessionDialog
            triggerText="Schedule Session"
            className="inline-flex items-center gap-2 rounded-full bg-purple-600 px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-purple-700"
          />
        )}
      </div>

      {/* LIVE NOW */}
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

      {/* Tabs for Upcoming and Past */}
      <Tabs defaultValue="upcoming" className="space-y-6">
        <TabsList className="bg-zinc-900">
          <TabsTrigger value="upcoming" className="data-[state=active]:bg-zinc-800">
            Upcoming ({upcoming.length})
          </TabsTrigger>
          <TabsTrigger value="past" className="data-[state=active]:bg-zinc-800">
            Past ({past.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="space-y-4">
          {upcoming.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-900 p-8">
              <div className="flex flex-col items-center text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-purple-600/20">
                  <Video className="h-8 w-8 text-purple-400" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-white">
                  No upcoming sessions
                </h3>
                <p className="mt-2 max-w-sm text-sm text-zinc-400">
                  {canCreateSessions
                    ? "Schedule your first live session for this community."
                    : "The host hasn't scheduled any sessions yet."}
                </p>
                {canCreateSessions && (
                  <div className="mt-6">
                    <CreateSessionDialog
                      triggerText="Schedule Session"
                      className="inline-flex items-center gap-2 rounded-full bg-purple-600 px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-purple-700"
                    />
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {upcoming.map((s) => (
                <div
                  key={s.id}
                  className="group relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 p-5 transition-all hover:border-zinc-700 hover:bg-zinc-900"
                >
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

                  <h3 className="font-semibold text-white group-hover:text-purple-400 transition-colors">
                    {s.title}
                  </h3>
                  <p className="mt-1 text-sm text-zinc-400">
                    with {s.mentor.name}
                  </p>

                  <div className="mt-4 flex items-center gap-4 text-xs text-zinc-500">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {s.duration} min
                    </span>
                  </div>

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
                    {canCreateSessions && (
                      <CreateSessionDialog
                        triggerText="Edit"
                        className="inline-flex items-center justify-center rounded-full border border-zinc-700 bg-transparent px-3 py-1.5 text-xs text-zinc-400 transition-all hover:bg-zinc-800 hover:text-zinc-200"
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="past" className="space-y-4">
          {past.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-900 p-8 text-center">
              <p className="text-sm text-zinc-500">No past sessions yet</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {past.map((s) => (
                <div
                  key={s.id}
                  className="group relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 p-5 transition-all hover:border-zinc-700 hover:bg-zinc-900"
                >
                  {s.recordingUrl && (
                    <div className="absolute right-3 top-3">
                      <Badge className="bg-green-500/10 text-green-400 border-green-500/20 text-xs">
                        <Video className="mr-1 h-3 w-3" />
                        Recording
                      </Badge>
                    </div>
                  )}

                  <div className="mb-3 flex items-center gap-2 text-sm text-zinc-500">
                    <Calendar className="h-4 w-4" />
                    {formatDistanceToNow(new Date(s.scheduledAt), { addSuffix: true })}
                  </div>

                  <h3 className="font-medium text-white group-hover:text-zinc-200 transition-colors">
                    {s.title}
                  </h3>

                  <div className="mt-2 flex items-center gap-1 text-xs text-zinc-500">
                    <Clock className="h-3 w-3" />
                    {s.duration} min
                  </div>

                  <div className="mt-4 flex items-center gap-2">
                    <Link href={`/dashboard/sessions/${s.id}/room`} className="flex-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full rounded-full border-zinc-700 bg-transparent text-xs text-zinc-300 hover:bg-zinc-800"
                      >
                        Enter Room
                      </Button>
                    </Link>
                    {s.recordingUrl && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-green-400 hover:text-green-300 hover:bg-green-500/10"
                      >
                        <Play className="mr-1 h-3 w-3" />
                        Watch
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
