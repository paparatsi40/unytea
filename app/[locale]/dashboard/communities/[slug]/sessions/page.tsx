import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Video, Calendar, Clock, Plus } from "lucide-react";
import { CreateSessionDialog } from "@/components/sessions/CreateSessionDialog";
import { SessionCard } from "@/components/sessions/SessionCard";

export default async function CommunitySessionsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  // Fetch community
  const community = await prisma.community.findUnique({
    where: { slug: slug },
  });

  if (!community) {
    redirect("/dashboard");
  }

  // Check if user is owner or member
  const isOwner = community.ownerId === session.user.id;
  let isMember = false;
  let canCreateSessions = isOwner; // Owners can always create sessions

  if (!isOwner) {
    const membership = await prisma.member.findFirst({
      where: {
        communityId: community.id,
        userId: session.user.id,
      },
      select: {
        role: true,
        permissions: true,
      },
    });

    isMember = !!membership;

    // Check if member has permission to create sessions
    if (membership) {
      canCreateSessions = 
        membership.role === "ADMIN" || 
        membership.role === "MODERATOR" || 
        membership.role === "MENTOR" ||
        (membership.permissions as any)?.canCreateSessions === true;
    }
  }

  if (!isOwner && !isMember) {
    redirect("/dashboard");
  }

  // Fetch sessions for this community
  const now = new Date();
  
  const upcomingSessions = await prisma.mentorSession.findMany({
    where: {
      communityId: community.id,
      scheduledAt: { gte: now },
    },
    include: {
      mentor: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
      mentee: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
    orderBy: { scheduledAt: "asc" },
  });

  const pastSessions = await prisma.mentorSession.findMany({
    where: {
      communityId: community.id,
      scheduledAt: { lt: now },
    },
    include: {
      mentor: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
      mentee: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
    orderBy: { scheduledAt: "desc" },
    take: 10,
  });

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
        {canCreateSessions && <CreateSessionDialog communityId={community.id} />}
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
              {canCreateSessions 
                ? "Schedule a video call to get started" 
                : "No sessions scheduled yet"}
            </p>
            {canCreateSessions && (
              <CreateSessionDialog 
                communityId={community.id} 
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
