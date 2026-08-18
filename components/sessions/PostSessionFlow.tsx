"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle,
  FileText,
  Share2,
  BookOpen,
  Clock,
  Users,
  MessageSquare,
  Zap,
  ArrowRight,
  Scissors,
  ChevronLeft,
  Radio,
  Folder,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SessionNotesEditor } from "./SessionNotesEditor";
import { AddToCourseDialog } from "./AddToCourseDialog";
import { CreateSocialClipDialog } from "../public-content/CreateSocialClipDialog";
import { RecapReviewPanel } from "./RecapReviewPanel";

interface PostSessionFlowProps {
  // Shape aligned to SessionDetail (the getSession Prisma payload). Only the
  // fields this component actually reads are declared; nullable fields use
  // `null` (not `undefined`) to match what Prisma returns. Single consumer:
  // sessions/[sessionId]/page.tsx.
  session: {
    id: string;
    title: string;
    status: string;
    startedAt: Date | null;
    endedAt: Date | null;
    /** The denormalised copy on the session. Either source counts as a file. */
    recordingUrl: string | null;
    recording: {
      url: string | null;
      status: string;
      durationSeconds: number | null;
    } | null;
    mentor: { name: string | null } | null;
    _count: { participations: number };
    notes: { content: string } | null;
    /** Where the host uploads the session's materials. */
    community: { slug: string } | null;
    feedPostId: string | null;
  };
  isHost: boolean;
  /** Fetches the recap draft for review. Publishes nothing. */
  onLoadRecapDraft: () => Promise<string | null>;
  /** Publishes the reviewed text. Resolves true when the post was created. */
  onShareRecap: (content: string) => Promise<boolean>;
  onAddToCourse: () => void;
  onCreateClip: () => void;
  onPublishToLibrary: () => void;
}

export function PostSessionFlow({
  session,
  isHost,
  onLoadRecapDraft,
  onShareRecap,
  onAddToCourse,
  onCreateClip,
  onPublishToLibrary,
}: PostSessionFlowProps) {
  const t = useTranslations("liveSession.postSessionFlow");
  const tHost = useTranslations("liveSession.publicPage.host");
  const tNotes = useTranslations("liveSession.room.notesPanel");
  const router = useRouter();
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [showNotes, setShowNotes] = useState(false);
  const [showAddToCourse, setShowAddToCourse] = useState(false);
  const [showCreateClip, setShowCreateClip] = useState(false);
  const [showRecapReview, setShowRecapReview] = useState(false);

  // Calculate session duration
  const duration =
    session.startedAt && session.endedAt
      ? Math.floor(
          (new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime()) / 60000
        )
      : 0;

  /**
   * Three of the five "next steps" need a recorded video file, and all three
   * fail closed today because no path produces one — `startRecording` in
   * lib/jobs/livekit-webhook.ts is still a `TODO: Implement actual Egress API
   * call`, so no egress event ever fires, no Recording row is written and
   * `recordingUrl` stays null forever.
   *
   * What that looked like: "Add to Course" opened a dialog whose action
   * returns "Session recording not available yet" every time; "Publish to
   * Library" builds a `type: "VIDEO"` resource whose `externalUrl` is the
   * recording, and bails with "Recording not available yet"; "Create Clips"
   * derives its moments from `session.recording` — null gives an empty list —
   * and mints a share URL under `/clip/{id}`, a route that does not exist in
   * app/ at all.
   *
   * They are hidden rather than labelled, because a card whose only outcome is
   * an error toast is not a feature preview. Tied to the URL rather than
   * deleted, so all three return by themselves the day egress ships.
   */
  const hasRecordingFile = !!(session.recordingUrl || session.recording?.url);

  // Stats
  const attendeeCount = session._count?.participations || 0;

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      {/* ==================== HEADER ==================== */}
      <div className="text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-green-500/10 px-4 py-2">
          <CheckCircle className="h-5 w-5 text-green-400" />
          <span className="font-medium text-green-400">{t("header.completed")}</span>
        </div>
        <h1 className="text-2xl font-bold text-white">{session.title}</h1>
        <p className="mt-2 text-zinc-400">
          {tHost("hostedBy", { name: session.mentor?.name ?? "" })} •{" "}
          {t("header.membersAttended", { count: attendeeCount })}
        </p>
      </div>

      {/*
        The recording card used to live here.
        Recording is withdrawn (2026-08-18), not delayed, so a card saying
        "coming soon" would be the same over-promise in a quieter voice — and it
        would be the first thing a host reads after every session, about the one
        thing the product has decided not to do. A card explaining an absence is
        still a card about recording.

        A session's outcome is now the notes, the recap built from them, and
        whatever the host uploads to the community library. Those are below, and
        they are all real.
      */}

      {/* ==================== NEXT STEPS ==================== */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-white">{t("nextSteps.title")}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Write Notes */}
          <Card
            className={cn(
              "cursor-pointer border-zinc-800 bg-zinc-900/50 transition-all hover:border-emerald-500/50 hover:bg-zinc-800/50",
              activeAction === "notes" && "border-emerald-500 bg-zinc-800"
            )}
            onClick={() => {
              setActiveAction("notes");
              setShowNotes(true);
            }}
          >
            <CardContent className="flex items-start gap-4 p-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20">
                <FileText className="h-6 w-6 text-emerald-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-white">{t("nextSteps.notesTitle")}</h3>
                <p className="text-sm text-zinc-400">{t("nextSteps.notesDesc")}</p>
                {session.notes?.content && (
                  <span className="mt-2 inline-flex items-center gap-1 text-xs text-emerald-400">
                    <CheckCircle className="h-3 w-3" />
                    {t("nextSteps.notesAdded")}
                  </span>
                )}
              </div>
              <ArrowRight className="h-5 w-5 text-zinc-500" />
            </CardContent>
          </Card>

          {/* Share Recap */}
          <Card
            className={cn(
              "cursor-pointer border-zinc-800 bg-zinc-900/50 transition-all hover:border-blue-500/50 hover:bg-zinc-800/50",
              activeAction === "share" && "border-blue-500 bg-zinc-800",
              session.feedPostId && "opacity-60"
            )}
            onClick={() => {
              // Opens the review panel. It does not publish — that is the
              // point: this card used to fire the share straight at the feed.
              if (!session.feedPostId) {
                setActiveAction("share");
                setShowRecapReview(true);
              }
            }}
          >
            <CardContent className="flex items-start gap-4 p-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-500/20">
                <Share2 className="h-6 w-6 text-blue-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-white">{t("nextSteps.shareTitle")}</h3>
                <p className="text-sm text-zinc-400">{t("nextSteps.shareDesc")}</p>
                {session.feedPostId ? (
                  <span className="mt-2 inline-flex items-center gap-1 text-xs text-blue-400">
                    <CheckCircle className="h-3 w-3" />
                    {t("nextSteps.shareDone")}
                  </span>
                ) : (
                  <span className="mt-2 inline-flex items-center gap-1 text-xs text-zinc-400">
                    {t("nextSteps.shareNotShared")}
                  </span>
                )}
              </div>
              {!session.feedPostId && <ArrowRight className="h-5 w-5 text-zinc-500" />}
            </CardContent>
          </Card>

          {/* Add to Course — needs the video file. See `hasRecordingFile`. */}
          {hasRecordingFile && (
            <Card
              className={cn(
                "cursor-pointer border-zinc-800 bg-zinc-900/50 transition-all hover:border-purple-500/50 hover:bg-zinc-800/50",
                activeAction === "course" && "border-purple-500 bg-zinc-800"
              )}
              onClick={() => {
                setActiveAction("course");
                onAddToCourse();
              }}
            >
              <CardContent className="flex items-start gap-4 p-5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-purple-500/20">
                  <BookOpen className="h-6 w-6 text-purple-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-white">{t("nextSteps.courseTitle")}</h3>
                  <p className="text-sm text-zinc-400">{t("nextSteps.courseDesc")}</p>
                </div>
                <ArrowRight className="h-5 w-5 text-zinc-500" />
              </CardContent>
            </Card>
          )}

          {/* Create Clips — needs the video file. */}
          {hasRecordingFile && (
            <Card
              className={cn(
                "cursor-pointer border-zinc-800 bg-zinc-900/50 transition-all hover:border-amber-500/50 hover:bg-zinc-800/50",
                activeAction === "clips" && "border-amber-500 bg-zinc-800"
              )}
              onClick={() => {
                setActiveAction("clips");
                onCreateClip();
              }}
            >
              <CardContent className="flex items-start gap-4 p-5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-500/20">
                  <Scissors className="h-6 w-6 text-amber-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-white">{t("nextSteps.clipsTitle")}</h3>
                  <p className="text-sm text-zinc-400">{t("nextSteps.clipsDesc")}</p>
                </div>
                <ArrowRight className="h-5 w-5 text-zinc-500" />
              </CardContent>
            </Card>
          )}

          {/* Publish to Library — despite the name this publishes the *replay*:
              `createResourceFromSession` writes a VIDEO resource whose
              externalUrl is the recording, and returns "Recording not available
              yet" without one. The notes only supply its description. */}
          {hasRecordingFile && (
            <Card
              className={cn(
                "cursor-pointer border-zinc-800 bg-zinc-900/50 transition-all hover:border-cyan-500/50 hover:bg-zinc-800/50",
                activeAction === "library" && "border-cyan-500 bg-zinc-800"
              )}
              onClick={() => {
                setActiveAction("library");
                onPublishToLibrary();
              }}
            >
              <CardContent className="flex items-start gap-4 p-5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cyan-500/20">
                  <Folder className="h-6 w-6 text-cyan-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-white">{t("nextSteps.libraryTitle")}</h3>
                  <p className="text-sm text-zinc-400">{t("nextSteps.libraryDesc")}</p>
                </div>
                <ArrowRight className="h-5 w-5 text-zinc-500" />
              </CardContent>
            </Card>
          )}

          {/*
            What replaced the recording.
            With no video, the way a member catches up on a session they missed
            is the recap and whatever the host puts in the library. The three
            cards above are all gated on a recording file and therefore never
            render, so without this the flow ended at "write notes" and pointed
            nowhere. This is a plain link — the library upload it opens is real:
            an upload modal on the community library page, a `documentUploader`
            route, and `createResource` behind an owner/admin/moderator/mentor
            check.
          */}
          {session.community?.slug && (
            <Link href={`/dashboard/c/${session.community.slug}/library`} className="block">
              <Card className="cursor-pointer border-zinc-800 bg-zinc-900/50 transition-all hover:border-cyan-500/50 hover:bg-zinc-800/50">
                <CardContent className="flex items-start gap-4 p-5">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cyan-500/20">
                    <Folder className="h-6 w-6 text-cyan-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-white">{t("nextSteps.materialsTitle")}</h3>
                    <p className="text-sm text-zinc-400">{t("nextSteps.materialsDesc")}</p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-zinc-500" />
                </CardContent>
              </Card>
            </Link>
          )}
        </div>
      </div>

      {/* ============ RECAP REVIEW (nothing is posted until shared) ============ */}
      {showRecapReview && !session.feedPostId && (
        <RecapReviewPanel
          onLoadDraft={onLoadRecapDraft}
          onShare={onShareRecap}
          onDismiss={() => {
            setShowRecapReview(false);
            setActiveAction(null);
          }}
          alreadyShared={Boolean(session.feedPostId)}
        />
      )}

      {/* ==================== SESSION STATS ==================== */}
      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardContent className="p-6">
          <h3 className="mb-4 font-semibold text-white">{t("stats.title")}</h3>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 text-2xl font-bold text-white">
                <Users className="h-5 w-5 text-zinc-400" />
                {attendeeCount}
              </div>
              <p className="text-xs text-zinc-500">{t("stats.attendees")}</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 text-2xl font-bold text-white">
                <Clock className="h-5 w-5 text-zinc-400" />
                {duration}
              </div>
              <p className="text-xs text-zinc-500">{t("stats.minutes")}</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 text-2xl font-bold text-white">
                <MessageSquare className="h-5 w-5 text-zinc-400" />
                --
              </div>
              <p className="text-xs text-zinc-500">{t("stats.messages")}</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 text-2xl font-bold text-white">
                <Zap className="h-5 w-5 text-zinc-400" />
                100%
              </div>
              <p className="text-xs text-zinc-500">{t("stats.completion")}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ==================== BACK TO DASHBOARD ==================== */}
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard/sessions"
          className="flex items-center gap-2 text-sm text-zinc-400 transition-colors hover:text-white"
        >
          <ChevronLeft className="h-4 w-4" />
          {t("actions.backToSessions")}
        </Link>
        {isHost && (
          <Button
            onClick={() => router.push(`/dashboard/sessions/${session.id}/room`)}
            variant="outline"
            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
          >
            <Radio className="mr-2 h-4 w-4" />
            {t("actions.reEnterRoom")}
          </Button>
        )}
      </div>

      {/* ==================== DIALOGS ==================== */}
      {/* Notes Dialog */}
      {showNotes && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-3xl rounded-2xl border border-zinc-800 bg-zinc-900">
            <div className="flex items-center justify-between border-b border-zinc-800 p-4">
              <h3 className="font-semibold text-white">{tNotes("title")}</h3>
              <button
                onClick={() => setShowNotes(false)}
                className="text-zinc-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="p-4">
              <SessionNotesEditor sessionId={session.id} />
            </div>
          </div>
        </div>
      )}

      {/* Add to Course Dialog */}
      <AddToCourseDialog
        sessionId={session.id}
        sessionTitle={session.title}
        open={showAddToCourse}
        onOpenChange={setShowAddToCourse}
      />

      {/* Create Clip Dialog */}
      <CreateSocialClipDialog
        sessionId={session.id}
        open={showCreateClip}
        onOpenChange={setShowCreateClip}
      />
    </div>
  );
}
