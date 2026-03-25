import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Video, Play, Plus, Library, Clock, Users, Calendar } from "lucide-react";
import { RecordingDistributionActions } from "@/components/sessions/RecordingDistributionActions";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";

export const metadata = {
  title: "Recordings Library | Unytea",
  description: "Your recorded live sessions",
};

async function getRecordedSessions(userId: string) {
  const sessions = await prisma.mentorSession.findMany({
    where: {
      OR: [
        { mentorId: userId },
        { menteeId: userId },
      ],
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

export default async function RecordingsLibraryPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  const [recordings, nextLiveSession] = await Promise.all([
    getRecordedSessions(session.user.id),
    getNextLiveSession(session.user.id),
  ]);

  return (
    <div className="space-y-8 p-8">
      {/* HEADER */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Recordings Library</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your recorded live sessions, ready to reuse
          </p>
        </div>
        <Link
          href="/dashboard/sessions"
          className="inline-flex items-center gap-2 rounded-full bg-purple-600 px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-purple-700"
        >
          <Plus className="h-4 w-4" />
          New Session
        </Link>
      </div>

      {nextLiveSession && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-400">
            Next live session
          </p>
          <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-lg font-semibold text-foreground">{nextLiveSession.title}</p>
              <p className="text-sm text-foreground/80">
                {new Date(nextLiveSession.scheduledAt).toLocaleString()}
              </p>
            </div>
            <Link
              href={`/dashboard/sessions/${nextLiveSession.id}`}
              className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              View Session
            </Link>
          </div>
        </div>
      )}

      {/* STATS */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10">
              <Library className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{recordings.length}</p>
              <p className="text-xs text-muted-foreground">Total recordings</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
              <Clock className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {Math.round(
                  recordings.reduce((acc, r) => acc + (r.duration || 0), 0) / 60
                )}h
              </p>
              <p className="text-xs text-muted-foreground">Total content</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
              <Users className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {recordings.reduce((acc, r) => acc + (r.participations?.length || 0), 0)}
              </p>
              <p className="text-xs text-muted-foreground">Total participants</p>
            </div>
          </div>
        </div>
      </div>

      {/* RECORDINGS GRID */}
      {recordings.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/30 p-12 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <Video className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="mb-2 text-lg font-semibold text-foreground">
            No recordings yet
          </h3>
          <p className="mb-6 text-sm text-muted-foreground">
            Start a live session and record it to build your library
          </p>
          <Link
            href="/dashboard/sessions"
            className="inline-flex items-center gap-2 rounded-full bg-purple-600 px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-purple-700"
          >
            <Plus className="h-4 w-4" />
            Create First Session
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recordings.map((recording) => (
            <div
              key={recording.id}
              className="group overflow-hidden rounded-xl border border-border bg-card transition-all hover:border-border/80 hover:shadow-lg"
            >
              {/* Thumbnail */}
              <div className="relative aspect-video bg-background">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-purple-500/20 transition-all group-hover:scale-110 group-hover:bg-purple-500/30">
                    <Play className="h-8 w-8 text-purple-500" />
                  </div>
                </div>

                {/* Duration badge */}
                <div className="absolute bottom-3 right-3 rounded-md bg-black/70 px-2 py-1 text-xs font-medium text-white">
                  {Math.floor(recording.duration / 60)}:
                  {String(recording.duration % 60).padStart(2, "0")}
                </div>

                {/* Recording indicator */}
                <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-md bg-red-500/20 px-2 py-1">
                  <div className="h-2 w-2 rounded-full bg-red-500" />
                  <span className="text-xs font-medium text-red-400">Recording</span>
                </div>
              </div>

              {/* Info */}
              <div className="p-4">
                <h3 className="font-semibold text-foreground line-clamp-1">
                  {recording.title}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground line-clamp-1">
                  {recording.description || "No description"}
                </p>

                <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {formatDistanceToNow(new Date(recording.scheduledAt), {
                      addSuffix: true,
                    })}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    {recording.participations?.length || 0} participants
                  </span>
                </div>

                {/* Actions */}
                <div className="mt-4 flex gap-2">
                  <a
                    href={recording.recording?.url || recording.recordingUrl || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-purple-600 px-3 py-2 text-sm font-medium text-white transition-all hover:bg-purple-700"
                  >
                    <Play className="h-4 w-4" />
                    Watch
                  </a>

                  <button className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-border bg-muted px-3 py-2 text-sm font-medium text-foreground transition-all hover:bg-accent">
                    <Plus className="h-4 w-4" />
                    Add to Course
                  </button>
                </div>

                <div className="mt-2">
                  <RecordingDistributionActions
                    recordingUrl={recording.recording?.url || recording.recordingUrl || null}
                    publicUrl={recording.slug ? `https://www.unytea.com/sessions/${recording.slug}` : null}
                    title={recording.title}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TIPS SECTION */}
      {recordings.length > 0 && (
        <div className="rounded-xl border border-border bg-muted/40 p-5">
          <h3 className="mb-2 font-semibold text-foreground">💡 Pro tip</h3>
          <p className="text-sm text-muted-foreground">
            Recordings are automatically saved after each live session. Use them to:
          </p>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            <li>• Add to your courses as premium content</li>
            <li>• Share with members who missed the live session</li>
            <li>• Repurpose as short clips for social media</li>
          </ul>
        </div>
      )}
    </div>
  );
}
