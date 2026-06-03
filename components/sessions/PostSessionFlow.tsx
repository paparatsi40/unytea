"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle,
  Play,
  FileText,
  Share2,
  BookOpen,
  Loader2,
  Clock,
  Users,
  MessageSquare,
  Zap,
  ArrowRight,
  Video,
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
    recording: {
      url: string | null;
      status: string;
      durationSeconds: number | null;
    } | null;
    mentor: { name: string | null } | null;
    _count: { participations: number };
    notes: { content: string } | null;
    feedPostId: string | null;
  };
  isHost: boolean;
  onShareRecap: () => Promise<void>;
  onAddToCourse: () => void;
  onCreateClip: () => void;
  onPublishToLibrary: () => void;
}

export function PostSessionFlow({
  session,
  isHost,
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

  // Calculate session duration
  const duration =
    session.startedAt && session.endedAt
      ? Math.floor(
          (new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime()) / 60000
        )
      : 0;

  // Recording status
  const recordingStatus = session.recording?.status || "PROCESSING";
  const isRecordingReady = recordingStatus === "READY";
  const isRecordingProcessing = recordingStatus === "PROCESSING";

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

      {/* ==================== RECORDING STATUS ==================== */}
      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div
              className={cn(
                "flex h-14 w-14 items-center justify-center rounded-full",
                isRecordingReady ? "bg-green-500/20" : "bg-amber-500/20"
              )}
            >
              {isRecordingReady ? (
                <Video className="h-7 w-7 text-green-400" />
              ) : (
                <Loader2 className="h-7 w-7 animate-spin text-amber-400" />
              )}
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-white">
                {isRecordingReady
                  ? t("recording.readyTitle")
                  : isRecordingProcessing
                    ? t("recording.processingTitle")
                    : t("recording.defaultTitle")}
              </h3>
              <p className="text-sm text-zinc-400">
                {isRecordingReady
                  ? t("recording.readyDesc")
                  : isRecordingProcessing
                    ? t("recording.processingDesc")
                    : t("recording.defaultDesc")}
              </p>
            </div>
            {isRecordingReady && session.recording?.url && (
              <Button
                onClick={() => setActiveAction("recording")}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Play className="mr-2 h-4 w-4" />
                {t("recording.watch")}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

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
              if (!session.feedPostId) {
                setActiveAction("share");
                onShareRecap();
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
                {session.feedPostId && (
                  <span className="mt-2 inline-flex items-center gap-1 text-xs text-blue-400">
                    <CheckCircle className="h-3 w-3" />
                    {t("nextSteps.shareDone")}
                  </span>
                )}
              </div>
              {!session.feedPostId && <ArrowRight className="h-5 w-5 text-zinc-500" />}
            </CardContent>
          </Card>

          {/* Add to Course */}
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

          {/* Create Clips */}
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

          {/* Publish to Library */}
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
        </div>
      </div>

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
