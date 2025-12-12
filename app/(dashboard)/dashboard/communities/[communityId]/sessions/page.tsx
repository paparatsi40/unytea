import { auth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Video, Calendar, Clock, Plus } from "lucide-react";
import { CreateSessionDialog } from "@/components/sessions/CreateSessionDialog";
import { SessionCard } from "@/components/sessions/SessionCard";

export default async function CommunitySessionsPage({
  params,
}: {
  params: { communityId: string };
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  const supabase = createClient();

  // Fetch community
  const { data: community } = await supabase
    .from("communities")
    .select("*")
    .eq("id", params.communityId)
    .single();

  if (!community) {
    redirect("/dashboard");
  }

  // Check if user is owner or member
  const isOwner = community.ownerId === session.user.id;
  let isMember = false;

  if (!isOwner) {
    const { data: membership } = await supabase
      .from("community_members")
      .select("*")
      .eq("communityId", params.communityId)
      .eq("userId", session.user.id)
      .single();

    isMember = !!membership;
  }

  if (!isOwner && !isMember) {
    redirect("/dashboard");
  }

  // Fetch sessions for this community
  const now = new Date().toISOString();
  
  const { data: upcomingSessions } = await supabase
    .from("mentor_sessions")
    .select(`
      *,
      mentor:users!mentor_sessions_mentorId_fkey(id, name, email, image),
      mentee:users!mentor_sessions_menteeId_fkey(id, name, email, image)
    `)
    .eq("communityId", params.communityId)
    .gte("scheduledFor", now)
    .order("scheduledFor", { ascending: true });

  const { data: pastSessions } = await supabase
    .from("mentor_sessions")
    .select(`
      *,
      mentor:users!mentor_sessions_mentorId_fkey(id, name, email, image),
      mentee:users!mentor_sessions_menteeId_fkey(id, name, email, image)
    `)
    .eq("communityId", params.communityId)
    .lt("scheduledFor", now)
    .order("scheduledFor", { ascending: false })
    .limit(10);

  const upcoming = upcomingSessions || [];
  const past = pastSessions || [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10">
              <Video className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                {community.name} - Sessions
              </h1>
              <p className="text-muted-foreground">
                Video sessions for this community
              </p>
            </div>
          </div>
        </div>

        {/* Only owners can create sessions for now */}
        {isOwner && <CreateSessionDialog communityId={params.communityId} />}
      </div>

      {/* Upcoming Sessions */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-foreground" />
          <h2 className="text-2xl font-bold text-foreground">
            Upcoming Sessions
          </h2>
          <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
            {upcoming.length}
          </span>
        </div>

        {upcoming.length === 0 ? (
          <div className="rounded-xl border border-border/50 bg-card/50 p-12 text-center">
            <Calendar className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-semibold text-foreground">
              No upcoming sessions
            </h3>
            <p className="mb-4 text-sm text-muted-foreground">
              {isOwner 
                ? "Schedule a video call to get started" 
                : "No sessions scheduled yet"}
            </p>
            {isOwner && (
              <CreateSessionDialog 
                communityId={params.communityId} 
                triggerText="Schedule Session" 
              />
            )}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {upcoming.map((sessionItem) => (
              <SessionCard key={sessionItem.id} session={sessionItem} />
            ))}
          </div>
        )}
      </div>

      {/* Past Sessions */}
      {past.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-2xl font-bold text-foreground">Past Sessions</h2>
            <span className="rounded-full bg-muted px-3 py-1 text-sm font-semibold text-muted-foreground">
              {past.length}
            </span>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {past.map((sessionItem) => (
              <SessionCard key={sessionItem.id} session={sessionItem} isPast />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
