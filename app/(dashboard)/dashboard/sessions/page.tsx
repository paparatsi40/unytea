import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getUserSessions } from "@/app/actions/sessions";
import { Video, Calendar, Clock } from "lucide-react";
import { CreateSessionDialog } from "@/components/sessions/CreateSessionDialog";
import { SessionCard } from "@/components/sessions/SessionCard";

export const metadata = {
  title: "Sessions | Unytea",
  description: "Video call sessions and meetings",
};

export default async function SessionsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const result = await getUserSessions();

  if (!result.success || !result.sessions) {
    return (
      <div className="flex min-h-[600px] items-center justify-center">
        <div className="text-center">
          <Video className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <h2 className="mb-2 text-xl font-semibold text-foreground">
            Failed to load sessions
          </h2>
          <p className="text-muted-foreground">
            {result.error || "An error occurred"}
          </p>
        </div>
      </div>
    );
  }

  const { upcoming, past } = result.sessions;

  return (
    <div className="space-y-8 p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10">
              <Video className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Sessions</h1>
              <p className="text-muted-foreground">
                Schedule and join video calls
              </p>
            </div>
          </div>
        </div>

        <CreateSessionDialog />
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
              Schedule a video call to get started
            </p>
            <CreateSessionDialog triggerText="Schedule Session" />
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {upcoming.map((session) => (
              <SessionCard key={session.id} session={session} />
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
            {past.map((session) => (
              <SessionCard key={session.id} session={session} isPast />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
