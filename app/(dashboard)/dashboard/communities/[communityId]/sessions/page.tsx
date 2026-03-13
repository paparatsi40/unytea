import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Video, Calendar, Clock, ArrowRight, Sparkles } from "lucide-react";
import { CreateSessionDialog } from "@/components/sessions/CreateSessionDialog";
import { format, isToday, isTomorrow, formatDistanceToNow } from "date-fns";
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
  try {
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

    const isOwner = community.ownerId === session.user.id;
    const canCreateSessions = true; // TEMP: Force true for debugging
    const hasAdminRole = community.members.some(m => m.role === "ADMIN" || m.role === "MODERATOR");
    
    console.log("DEBUG:", {
      userId: session.user.id,
      ownerId: community.ownerId,
      isOwner,
      hasAdminRole,
      memberCount: community.members.length,
      members: community.members.map(m => ({ role: m.role })),
    });

    // Get sessions - NOTE: temporarily fetching all sessions since communityId field 
    // doesn't exist in database yet. Will filter by community once migration is applied.
    let allSessions: any[] = [];
    try {
      allSessions = await prisma.mentorSession.findMany({
        // TODO: Add filter by communityId once field exists in database
        // where: { communityId },
        where: {
          // For now, show sessions where user is mentor or mentee
          OR: [
            { mentorId: session.user.id },
            { menteeId: session.user.id },
          ],
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
    } catch (dbError) {
      console.error("Database error fetching sessions:", dbError);
      // Continue with empty sessions
    }

    // Split into upcoming and past
    const now = new Date();
    const upcoming = allSessions.filter(s => new Date(s.scheduledAt) >= now);
    const past = allSessions.filter(s => new Date(s.scheduledAt) < now);

    // Calculate sessions this week
    const thisWeek = upcoming.filter(s => {
      const sessionDate = new Date(s.scheduledAt);
      const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      return sessionDate <= weekFromNow;
    });

    return (
      <div className="min-h-screen bg-zinc-950">
        <div className="container mx-auto max-w-6xl px-4 py-6">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-2xl font-semibold text-white">Live Sessions</h1>
                  <Badge variant="secondary" className="bg-zinc-800 text-zinc-400 text-xs">
                    {allSessions.length} sessions
                  </Badge>
                </div>
                <p className="text-zinc-400">{community.name} • Run live coaching, classes, and workshops</p>
                {upcoming.length > 0 && (
                  <div className="mt-2 flex items-center gap-2 text-sm">
                    <Sparkles className="h-4 w-4 text-yellow-500" />
                    <span className="text-zinc-300">
                      {thisWeek.length} {thisWeek.length === 1 ? "session" : "sessions"} this week
                    </span>
                  </div>
                )}
              </div>
              {canCreateSessions && (
                <CreateSessionDialog
                  triggerText="Schedule Session"
                  className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-lg font-medium flex items-center gap-2"
                  communityId={communityId}
                />
              )}
              {!canCreateSessions && (
                <div className="text-sm text-zinc-500">
                  (Owner only feature)
                </div>
              )}
            </div>
          </div>

          <Tabs defaultValue="upcoming" className="w-full">
            <TabsList className="bg-zinc-900 border-zinc-800 mb-6">
              <TabsTrigger value="upcoming" className="data-[state=active]:bg-zinc-800 text-zinc-300">
                Upcoming ({upcoming.length})
              </TabsTrigger>
              <TabsTrigger value="past" className="data-[state=active]:bg-zinc-800 text-zinc-300">
                Past ({past.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upcoming" className="space-y-4">
              {/* Show next session prominently if exists */}
              {upcoming.length > 0 && (
                <div className="rounded-xl border border-purple-500/30 bg-gradient-to-r from-purple-900/20 to-pink-900/20 p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="bg-purple-600 text-white text-xs">
                      Next Live Session
                    </Badge>
                    <span className="text-xs text-zinc-400">
                      {formatDistanceToNow(new Date(upcoming[0].scheduledAt), { addSuffix: true })}
                    </span>
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-1">
                    {upcoming[0].title}
                  </h3>
                  <div className="flex items-center gap-4 text-sm text-zinc-400 mb-4">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {formatSessionDate(new Date(upcoming[0].scheduledAt))}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {formatSessionTime(new Date(upcoming[0].scheduledAt))}
                    </span>
                    <span>{upcoming[0].duration} min</span>
                  </div>
                  <Link href={`/dashboard/sessions/${upcoming[0].id}/room`}>
                    <Button className="bg-purple-600 hover:bg-purple-700 text-white">
                      Join Session
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </Link>
                </div>
              )}

              {upcoming.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900 p-12 text-center">
                  <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-zinc-800">
                    <Video className="h-8 w-8 text-zinc-400" />
                  </div>
                  <h3 className="mb-2 text-lg font-medium text-white">
                    Host your first live session for this community
                  </h3>
                  <p className="mb-6 text-zinc-400 max-w-sm mx-auto">
                    Run coaching calls, workshops, or Q&A sessions. Members love live interactions!
                  </p>
                  {canCreateSessions && (
                    <CreateSessionDialog
                      triggerText="Schedule your first session"
                      className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-lg font-medium inline-flex items-center gap-2"
                      communityId={communityId}
                    />
                  )}
                  <div className="mt-6 flex items-center justify-center gap-2 text-sm text-zinc-500">
                    <Sparkles className="h-4 w-4" />
                    <span>Communities with weekly sessions grow 3x faster</span>
                  </div>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {upcoming.map((s) => (
                    <div
                      key={s.id}
                      className="group rounded-xl border border-zinc-800 bg-zinc-950 p-5 transition-all hover:border-zinc-700"
                    >
                      {/* Date badge */}
                      <div className="mb-3 flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-zinc-400" />
                        <span className="text-zinc-300">
                          {formatSessionDate(new Date(s.scheduledAt))}
                        </span>
                      </div>

                      {/* Title */}
                      <h3 className="mb-2 text-lg font-semibold text-white">
                        {s.title}
                      </h3>

                      {/* Host */}
                      <p className="mb-4 text-sm text-zinc-400">
                        with {s.mentor?.name || "Host"}
                      </p>

                      {/* Time & Duration */}
                      <div className="mb-4 flex items-center gap-3 text-sm text-zinc-500">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          <span>{formatSessionTime(new Date(s.scheduledAt))}</span>
                        </div>
                        <span>•</span>
                        <span>{s.duration || 60} min</span>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <Link href={`/dashboard/sessions/${s.id}/room`}>
                          <Button className="bg-purple-600 hover:bg-purple-700 text-white">
                            Join
                          </Button>
                        </Link>
                        {canCreateSessions && (
                          <Button variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
                            Edit
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="past" className="space-y-4">
              {past.length === 0 ? (
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-center">
                  <Video className="mx-auto mb-3 h-12 w-12 text-zinc-600" />
                  <p className="text-zinc-400">No past sessions yet</p>
                  <p className="text-sm text-zinc-500 mt-1">
                    Past sessions with recordings will appear here
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {past.slice(0, 6).map((s) => (
                    <div
                      key={s.id}
                      className="group rounded-xl border border-zinc-800 bg-zinc-950 p-5 transition-all hover:border-zinc-700"
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <span className="text-sm text-zinc-500">
                          {formatDistanceToNow(new Date(s.scheduledAt), { addSuffix: true })}
                        </span>
                        {s.recordingUrl && (
                          <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                            Recording available
                          </Badge>
                        )}
                      </div>

                      <h3 className="mb-4 text-base font-medium text-white">
                        {s.title}
                      </h3>

                      <div className="flex items-center gap-2">
                        {s.recordingUrl ? (
                          <Link href={s.recordingUrl} target="_blank">
                            <Button variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 flex items-center gap-2">
                              <ArrowRight className="h-4 w-4" />
                              Watch
                            </Button>
                          </Link>
                        ) : (
                          <Link href={`/dashboard/sessions/${s.id}/room`}>
                            <Button variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
                              Enter Room
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    );
  } catch (error) {
    console.error("Error in CommunitySessionsPage:", error);
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center p-8">
          <h1 className="text-xl font-semibold text-white mb-2">Something went wrong</h1>
          <p className="text-zinc-400 mb-4">Unable to load sessions</p>
          <Link href="/dashboard/communities">
            <Button variant="outline" className="border-zinc-700 text-zinc-300">
              Back to Communities
            </Button>
          </Link>
        </div>
      </div>
    );
  }
}
