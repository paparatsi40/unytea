import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getUserSessions } from "@/app/actions/sessions";
import { Video, Calendar, Clock, Play, Radio } from "lucide-react";
import { CreateSessionDialog } from "@/components/sessions/CreateSessionDialog";
import { format, isToday, isTomorrow, formatDistanceToNow } from "date-fns";

export const metadata = {
  title: "Live Sessions | Unytea",
  description: "Run live coaching, classes, and workshops",
};

function SessionSectionTitle({
  icon: Icon,
  title,
  count,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  count?: number;
}) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="h-5 w-5 text-zinc-400" />
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      {count !== undefined && (
        <span className="rounded-full bg-zinc-800 px-2.5 py-0.5 text-xs font-medium text-zinc-400">
          {count}
        </span>
      )}
    </div>
  );
}

function formatSessionDate(date: Date): string {
  if (isToday(date)) return "Today";
  if (isTomorrow(date)) return "Tomorrow";
  return format(date, "EEEE, MMMM d");
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

  return (
    <div className="space-y-8 p-8">
      {/* HEADER */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Live Sessions</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Run live coaching, classes, and workshops
          </p>
        </div>
        <CreateSessionDialog
          triggerText="Schedule Session"
          className="inline-flex items-center gap-2 rounded-full bg-purple-600 px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-purple-700"
        />
      </div>

      {/* CTA Banner - si no hay sesiones */}
      {totalSessions === 0 && (
        <div className="rounded-2xl border border-zinc-800 bg-gradient-to-r from-zinc-900 to-zinc-800 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-white">
                Communities with weekly sessions grow 3x faster
              </h3>
              <p className="mt-1 text-sm text-zinc-400">
                Start building engagement with live sessions
              </p>
            </div>
            <CreateSessionDialog
              triggerText="Create Session"
              className="inline-flex items-center gap-2 rounded-full bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-purple-700"
            />
          </div>
        </div>
      )}

      {/* UPCOMING SESSIONS */}
      <div className="space-y-4">
        <SessionSectionTitle
          icon={Radio}
          title="Upcoming Sessions"
          count={upcoming.length}
        />

        {upcoming.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/30 p-8 text-center">
            <p className="text-sm text-zinc-500">No upcoming sessions</p>
            <CreateSessionDialog
              triggerText="Schedule one now"
              className="mt-4 inline-flex text-sm text-purple-400 hover:text-purple-300"
            />
          </div>
        ) : (
          <div className="grid gap-4">
            {upcoming.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900 p-5 transition-all hover:border-zinc-700 hover:bg-zinc-800/50"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-500/10">
                    <Calendar className="h-6 w-6 text-purple-500" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-white">{s.title}</p>
                      {s.status === "IN_PROGRESS" && (
                        <span className="flex items-center gap-1 rounded-full bg-green-500/20 px-2 py-0.5 text-xs font-medium text-green-400">
                          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
                          Live now
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-sm text-zinc-400">
                      <span>{formatSessionDate(new Date(s.scheduledAt))}</span>
                      <span>•</span>
                      <span>{format(new Date(s.scheduledAt), "h:mm a")}</span>
                      <span>•</span>
                      <span>{s.duration} min</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {s.status === "SCHEDULED" && (
                    <>
                      {session?.user?.id === s.mentorId && (
                        <button className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-300 transition-all hover:bg-zinc-700">
                          Edit
                        </button>
                      )}
                      <a
                        href={`/dashboard/sessions/${s.id}/room`}
                        className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-purple-700"
                      >
                        Join
                      </a>
                    </>
                  )}
                  {s.status === "IN_PROGRESS" && (
                    <a
                      href={`/dashboard/sessions/${s.id}/room`}
                      className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-green-700"
                    >
                      <Play className="h-4 w-4" />
                      Join Live
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* PAST SESSIONS */}
      {past.length > 0 && (
        <div className="space-y-4">
          <SessionSectionTitle
            icon={Clock}
            title="Past Sessions"
            count={past.length}
          />

          <div className="grid gap-4">
            {past.slice(0, 5).map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 transition-all hover:border-zinc-700"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-zinc-800">
                    <Video className="h-5 w-5 text-zinc-400" />
                  </div>
                  <div>
                    <p className="font-medium text-white">{s.title}</p>
                    <div className="mt-1 flex items-center gap-3 text-sm text-zinc-500">
                      <span>
                        {formatDistanceToNow(new Date(s.scheduledAt), {
                          addSuffix: true,
                        })}
                      </span>
                      <span>•</span>
                      <span>{s.duration} min</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {s.status === "COMPLETED" && (
                    <>
                      <span className="rounded-full bg-green-500/10 px-3 py-1 text-xs font-medium text-green-400">
                        Recording available
                      </span>
                      <button className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-300 transition-all hover:bg-zinc-700">
                        Watch
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}

            {past.length > 5 && (
              <button className="w-full rounded-xl border border-dashed border-zinc-800 py-3 text-sm font-medium text-zinc-400 transition-all hover:border-zinc-700 hover:text-zinc-300">
                View {past.length - 5} more past sessions
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
