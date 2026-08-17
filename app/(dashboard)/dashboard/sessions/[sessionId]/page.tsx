"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Play,
  BookOpen,
  Share2,
  Download,
  FileText,
  MessageSquare,
  Folder,
  Clock,
  Users,
  Calendar,
  CheckCircle,
  Loader2,
  Radio,
  Headphones,
  Sparkles,
  BellRing,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getSession,
  getSessionRSVPStatus,
  setSessionRSVPStatus,
  type SessionDetail,
} from "@/app/actions/sessions";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useCurrentUser } from "@/hooks/use-current-user";
import { AddToCourseDialog } from "@/components/sessions/AddToCourseDialog";
import { CreateSocialClipDialog } from "@/components/public-content/CreateSocialClipDialog";
import { RecapReviewPanel } from "@/components/sessions/RecapReviewPanel";
import { PostSessionFlow } from "@/components/sessions/PostSessionFlow";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { getRecapDraft, shareSessionRecap } from "@/app/actions/session-jobs";
import { createResourceFromSession } from "@/app/actions/session-course";

interface SessionPageProps {
  params: Promise<{ sessionId: string }>;
}

export default function SessionDetailPage(props: SessionPageProps) {
  const params = use(props.params);
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useCurrentUser();
  const t = useTranslations("dashboard.sessions.detail");
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("recording");
  const [showAddToCourse, setShowAddToCourse] = useState(false);
  const [showCreateClip, setShowCreateClip] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [showRecapReview, setShowRecapReview] = useState(false);
  const [rsvpStatus, setRsvpStatus] = useState<"attending" | "interested" | null>(null);
  const [attendingCount, setAttendingCount] = useState(0);
  const [interestedCount, setInterestedCount] = useState(0);
  const [attendingPreview, setAttendingPreview] = useState<
    Array<{ id: string; name: string | null; image: string | null }>
  >([]);
  const [isRSVPLoading, setIsRSVPLoading] = useState(false);

  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.push("/auth/signin");
      return;
    }

    if (!isAuthLoading && user) {
      loadSession();
    }
  }, [params.sessionId, user, isAuthLoading, router]);

  async function loadSession() {
    try {
      setLoading(true);
      const result = await getSession(params.sessionId);
      if (result.success && result.session) {
        setSession(result.session);

        if (result.session.status === "SCHEDULED") {
          const rsvp = await getSessionRSVPStatus(result.session.id);
          if (rsvp.success) {
            setRsvpStatus(rsvp.status);
            setAttendingCount(rsvp.attendingCount);
            setInterestedCount(rsvp.interestedCount || 0);
            setAttendingPreview(rsvp.attendingPreview || []);
          }
        }
      } else {
        router.push("/dashboard/sessions");
      }
    } catch (error) {
      console.error("Failed to load session:", error);
    } finally {
      setLoading(false);
    }
  }

  /**
   * Fetches the draft for review. Read-only: nothing reaches the feed here.
   * Returns null so the panel can show its own error state.
   */
  async function handleLoadRecapDraft(): Promise<string | null> {
    if (!session) return null;
    try {
      const result = await getRecapDraft(session.id);
      return result.success ? result.content : null;
    } catch {
      return null;
    }
  }

  /** Publishes the text the host approved. The only path that creates a post. */
  async function handleShareRecap(content: string): Promise<boolean> {
    if (!session) return false;

    setIsSharing(true);
    try {
      if (session.feedPostId) {
        toast.info(t("share.already"));
        return false;
      }

      const result = await shareSessionRecap(session.id, content);
      if (result.success) {
        toast.success(t("share.success"));
        // Reload session to get updated feedPostId
        await loadSession();
        return true;
      }
      toast.error(result.error || t("share.failed"));
      return false;
    } catch {
      toast.error(t("share.error"));
      return false;
    } finally {
      setIsSharing(false);
    }
  }

  async function handlePublishToLibrary() {
    if (!session || session.status !== "COMPLETED") return;

    try {
      const result = await createResourceFromSession(session.id, {
        source: "session_detail_post_session_flow",
      });

      if (!result.success) {
        toast.error(result.error || t("library.failed"));
        return;
      }

      toast.success(t("library.success"));
      if (session.community?.slug) {
        router.push(`/dashboard/c/${session.community.slug}/library?src=session_reuse`);
      }
      await loadSession();
    } catch {
      toast.error(t("library.failed"));
    }
  }

  async function handleSetRSVP(status: "attending" | "interested") {
    if (!session || session.status !== "SCHEDULED") return;

    setIsRSVPLoading(true);
    try {
      const result = await setSessionRSVPStatus(session.id, status, window.location.pathname);
      if (!result.success) {
        toast.error(result.error || t("rsvp.failed"));
        return;
      }

      setRsvpStatus(result.status ?? null);
      setAttendingCount(result.attendingCount || 0);
      setInterestedCount(result.interestedCount || 0);
      setAttendingPreview(result.attendingPreview || []);

      if (!result.status) {
        toast.success(t("rsvp.removed"));
      } else if (result.status === "attending") {
        toast.success(t("rsvp.attending"));
      } else {
        toast.success(t("rsvp.interested"));
      }
    } catch {
      toast.error(t("rsvp.failed"));
    } finally {
      setIsRSVPLoading(false);
    }
  }

  if (isAuthLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
          <p className="text-zinc-400">{t("loading")}</p>
        </div>
      </div>
    );
  }

  if (!session) {
    router.replace("/dashboard/sessions");
    return null;
  }

  const isAudioOnly = session.mode === "AUDIO";
  const isProcessing = session.recording?.status === "PROCESSING";
  const hasRecording = !!session.recordingUrl;
  const formattedDate = new Date(session.scheduledAt).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const formattedTime = new Date(session.scheduledAt).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  const publicSessionUrl = session.slug
    ? `${window.location.origin}/sessions/${session.slug}?src=session_detail_share`
    : `${window.location.origin}/dashboard/sessions/${session.id}?src=session_detail_share`;

  const startsInMinutes = Math.floor(
    (new Date(session.scheduledAt).getTime() - Date.now()) / (1000 * 60)
  );
  const isStartingSoon =
    session.status === "SCHEDULED" && startsInMinutes >= 0 && startsInMinutes <= 10;

  const handleCopyInviteLink = async () => {
    await navigator.clipboard.writeText(publicSessionUrl);
    toast.success(t("inviteCopied"));
  };

  const shareToNetwork = (network: "twitter" | "linkedin" | "whatsapp") => {
    const text = encodeURIComponent(`Join this session: ${session.title}`);
    const url = encodeURIComponent(publicSessionUrl);

    const target =
      network === "twitter"
        ? `https://twitter.com/intent/tweet?text=${text}&url=${url}`
        : network === "linkedin"
          ? `https://www.linkedin.com/sharing/share-offsite/?url=${url}`
          : `https://wa.me/?text=${text}%20${url}`;

    window.open(target, "_blank", "noopener,noreferrer");
  };

  const buildGoogleCalendarUrl = () => {
    const start = new Date(session.scheduledAt);
    const end = new Date(start.getTime() + (session.duration || 60) * 60 * 1000);
    const formatCalDate = (d: Date) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

    const params = new URLSearchParams({
      action: "TEMPLATE",
      text: session.title,
      details: session.description || "Join this live session on Unytea.",
      dates: `${formatCalDate(start)}/${formatCalDate(end)}`,
    });

    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  };

  const downloadAppleCalendarIcs = () => {
    const start = new Date(session.scheduledAt);
    const end = new Date(start.getTime() + (session.duration || 60) * 60 * 1000);
    const formatCalDate = (d: Date) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    const uid = `${session.id}@unytea`;

    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Unytea//Session//EN",
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTAMP:${formatCalDate(new Date())}`,
      `DTSTART:${formatCalDate(start)}`,
      `DTEND:${formatCalDate(end)}`,
      `SUMMARY:${(session.title || "Unytea Session").replace(/,/g, "\\,")}`,
      `DESCRIPTION:${(session.description || "Join this live session on Unytea.").replace(/\n/g, " ").replace(/,/g, "\\,")}`,
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${session.title || "unytea-session"}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Show Post-Session Flow for completed sessions
  if (session.status === "COMPLETED") {
    return (
      <div className="min-h-screen bg-zinc-950">
        <PostSessionFlow
          session={session}
          isHost={session.mentorId === user?.id}
          onLoadRecapDraft={handleLoadRecapDraft}
          onShareRecap={handleShareRecap}
          onAddToCourse={() => setShowAddToCourse(true)}
          onCreateClip={() => setShowCreateClip(true)}
          onPublishToLibrary={handlePublishToLibrary}
        />

        {/* Dialogs */}
        <AddToCourseDialog
          sessionId={session.id}
          sessionTitle={session.title}
          open={showAddToCourse}
          onOpenChange={setShowAddToCourse}
        />

        <CreateSocialClipDialog
          sessionId={session.id}
          open={showCreateClip}
          onOpenChange={setShowCreateClip}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* HEADER */}
      <header className="border-b border-zinc-800 bg-zinc-900/50 px-6 py-4">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center justify-between">
            {/* Left: Back */}
            <Link
              href="/dashboard/sessions"
              className="flex items-center gap-2 text-sm text-zinc-400 transition-colors hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>{t("back")}</span>
            </Link>

            {/* Center: Session info */}
            <div className="flex flex-col items-center">
              <h1 className="text-lg font-semibold text-white">{session.title}</h1>
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <span className="flex items-center gap-1">
                  {/* Non-completed render only (COMPLETED early-returns at L286 to PostSessionFlow). */}
                  <Radio className="h-3.5 w-3.5 text-red-500" />
                  {session.status}
                </span>
                <span>•</span>
                <span>{formattedDate}</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {session.duration} min
                </span>
                {session.status === "SCHEDULED" && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-zinc-300">
                      <Users className="h-3 w-3" />
                      {attendingCount} attending · {interestedCount} interested
                    </span>
                    {attendingPreview.length > 0 && (
                      <span className="ml-1 flex -space-x-1">
                        {attendingPreview.slice(0, 4).map((member) => (
                          <Avatar key={member.id} className="h-5 w-5 border border-zinc-900">
                            <AvatarImage src={member.image || ""} alt={member.name || "Member"} />
                            <AvatarFallback className="bg-zinc-800 text-[9px] text-zinc-200">
                              {(member.name || "M").slice(0, 1).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                      </span>
                    )}
                  </>
                )}
                {isAudioOnly && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-blue-400">
                      <Headphones className="h-3 w-3" />
                      {t("audioOnly")}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Right: Spacer for centering */}
            <div className="w-32" />
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="mx-auto max-w-7xl p-6">
        {isStartingSoon && (
          <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
            <div className="flex items-center gap-2 text-amber-200">
              <BellRing className="h-4 w-4 animate-pulse" />
              <span className="text-sm font-medium">Starting soon · {startsInMinutes} min</span>
            </div>
            <Link href={`/dashboard/sessions/${session.id}/room`}>
              <Button size="sm" className="bg-amber-500 text-zinc-900 hover:bg-amber-400">
                {t("joinNext")}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        )}

        {/* ACTION BAR */}
        <div className="mb-6 flex items-center gap-3">
          {session.status === "SCHEDULED" && (
            <Link href={`/dashboard/sessions/${session.id}/room`}>
              <Button className="gap-2 bg-purple-600 hover:bg-purple-700">
                <Play className="h-4 w-4" />
                {t("joinNext")}
              </Button>
            </Link>
          )}

          {session.status === "SCHEDULED" && (
            <>
              <Button
                variant={rsvpStatus === "attending" ? "outline" : "default"}
                className={cn(
                  "gap-2",
                  rsvpStatus === "attending"
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
                    : "bg-emerald-600 hover:bg-emerald-700"
                )}
                disabled={isRSVPLoading}
                onClick={() => handleSetRSVP("attending")}
              >
                <Users className="h-4 w-4" />
                {isRSVPLoading && rsvpStatus !== "attending"
                  ? "Updating..."
                  : rsvpStatus === "attending"
                    ? "Attending"
                    : "Attending"}
              </Button>
              <Button
                variant={rsvpStatus === "interested" ? "outline" : "secondary"}
                className={cn(
                  "gap-2",
                  rsvpStatus === "interested"
                    ? "border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20"
                    : "bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
                )}
                disabled={isRSVPLoading}
                onClick={() => handleSetRSVP("interested")}
              >
                <Calendar className="h-4 w-4" />
                {isRSVPLoading && rsvpStatus !== "interested" ? "Updating..." : "Interested"}
              </Button>
            </>
          )}

          {session.status === "SCHEDULED" && (
            <>
              <Button
                variant="outline"
                className="gap-2 border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800"
                asChild
              >
                <a href={buildGoogleCalendarUrl()} target="_blank" rel="noreferrer">
                  <Calendar className="h-4 w-4" />
                  {t("addToGoogleCalendar")}
                </a>
              </Button>
              <Button
                variant="outline"
                className="gap-2 border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800"
                onClick={downloadAppleCalendarIcs}
              >
                <Calendar className="h-4 w-4" />
                {t("addToAppleCalendar")}
              </Button>
              <Button
                variant="outline"
                className="gap-2 border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800"
                onClick={handleCopyInviteLink}
              >
                <Users className="h-4 w-4" />
                {t("inviteMembers")}
              </Button>
              <Button
                variant="outline"
                className="gap-2 border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800"
                onClick={() => shareToNetwork("twitter")}
              >
                {t("shareOn", { network: "X" })}
              </Button>
              <Button
                variant="outline"
                className="gap-2 border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800"
                onClick={() => shareToNetwork("linkedin")}
              >
                {t("shareOn", { network: "LinkedIn" })}
              </Button>
              <Button
                variant="outline"
                className="gap-2 border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800"
                onClick={() => shareToNetwork("whatsapp")}
              >
                {t("shareOn", { network: "WhatsApp" })}
              </Button>
            </>
          )}

          {hasRecording && !isProcessing && (
            <Button
              className="gap-2 bg-purple-600 hover:bg-purple-700"
              onClick={() => setActiveTab("recording")}
            >
              <Play className="h-4 w-4" />
              {t("watchRecording")}
            </Button>
          )}

          {session?.mentorId === user?.id && (
            <>
              <Button
                variant="outline"
                className="gap-2 border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
                onClick={() => setShowAddToCourse(true)}
              >
                <BookOpen className="h-4 w-4" />
                {t("addToCourse")}
              </Button>

              <Button
                variant="outline"
                className="gap-2 border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
                onClick={() => setShowCreateClip(true)}
              >
                <Sparkles className="h-4 w-4" />
                {t("createClip")}
              </Button>
            </>
          )}

          <Button
            variant="outline"
            className="gap-2 border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
            onClick={() => setShowRecapReview(true)}
            disabled={isSharing || !!session?.feedPostId}
          >
            <Share2 className="h-4 w-4" />
            {isSharing ? "Sharing..." : session?.feedPostId ? "Already Shared" : "Share Recap"}
          </Button>

          {session.recordingUrl && (
            <Button variant="ghost" className="gap-2 text-zinc-400 hover:text-white" asChild>
              <a href={session.recordingUrl} download>
                <Download className="h-4 w-4" />
                {t("download")}
              </a>
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* LEFT: Main Content (Recording/Notes/Resources) */}
          <div className="lg:col-span-2">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="w-full bg-zinc-900">
                <TabsTrigger
                  value="recording"
                  className="flex-1 data-[state=active]:bg-zinc-800 data-[state=active]:text-white"
                >
                  <Play className="mr-2 h-4 w-4" />
                  {t("tabs.recording")}
                </TabsTrigger>
                <TabsTrigger
                  value="notes"
                  className="flex-1 data-[state=active]:bg-zinc-800 data-[state=active]:text-white"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  {t("tabs.notes")}
                </TabsTrigger>
                <TabsTrigger
                  value="resources"
                  className="flex-1 data-[state=active]:bg-zinc-800 data-[state=active]:text-white"
                >
                  <Folder className="mr-2 h-4 w-4" />
                  {t("tabs.resources")}
                </TabsTrigger>
                <TabsTrigger
                  value="discussion"
                  className="flex-1 data-[state=active]:bg-zinc-800 data-[state=active]:text-white"
                >
                  <MessageSquare className="mr-2 h-4 w-4" />
                  {t("tabs.discussion")}
                </TabsTrigger>
              </TabsList>

              {/* RECORDING TAB */}
              <TabsContent value="recording" className="mt-4">
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-1">
                  {isProcessing ? (
                    <div className="flex h-[400px] flex-col items-center justify-center gap-4">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-800">
                        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-medium text-white">
                          {t("recording.processingTitle")}
                        </p>
                        <p className="text-sm text-zinc-400">{t("recording.processingBody")}</p>
                      </div>
                    </div>
                  ) : session.recordingUrl ? (
                    <div className="aspect-video overflow-hidden rounded-xl bg-black">
                      <video
                        src={session.recordingUrl}
                        controls
                        className="h-full w-full"
                        poster="/images/video-poster.jpg"
                      >
                        {t("recording.unsupported")}
                      </video>
                    </div>
                  ) : (
                    <div className="flex h-[400px] flex-col items-center justify-center gap-4">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-800">
                        <Play className="h-8 w-8 text-zinc-500" />
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-medium text-white">{t("recording.noneTitle")}</p>
                        <p className="text-sm text-zinc-400">{t("recording.noneBody")}</p>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* NOTES TAB */}
              <TabsContent value="notes" className="mt-4">
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
                  {session.notes ? (
                    <div className="prose prose-invert max-w-none">
                      <h3 className="mb-4 text-lg font-semibold text-white">{t("notes.title")}</h3>
                      <div className="whitespace-pre-wrap text-zinc-300">
                        {session.notes.content || "No notes content yet."}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-4 py-12">
                      <FileText className="h-12 w-12 text-zinc-600" />
                      <div className="text-center">
                        <p className="text-lg font-medium text-white">{t("notes.emptyTitle")}</p>
                        <p className="text-sm text-zinc-400">{t("notes.emptyBody")}</p>
                      </div>
                      <Button
                        variant="outline"
                        className="mt-2 border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                      >
                        {t("notes.add")}
                      </Button>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* RESOURCES TAB */}
              <TabsContent value="resources" className="mt-4">
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
                  <div className="flex flex-col items-center justify-center gap-4 py-12">
                    <Folder className="h-12 w-12 text-zinc-600" />
                    <div className="text-center">
                      <p className="text-lg font-medium text-white">{t("resources.emptyTitle")}</p>
                      <p className="text-sm text-zinc-400">{t("resources.emptyBody")}</p>
                    </div>
                    <Button
                      variant="outline"
                      className="mt-2 border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                    >
                      + Add Resource
                    </Button>
                  </div>
                </div>
              </TabsContent>

              {/* DISCUSSION TAB */}
              <TabsContent value="discussion" className="mt-4">
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
                  <div className="flex flex-col items-center justify-center gap-4 py-12">
                    <MessageSquare className="h-12 w-12 text-zinc-600" />
                    <div className="text-center">
                      <p className="text-lg font-medium text-white">{t("discussion.emptyTitle")}</p>
                      <p className="text-sm text-zinc-400">{t("discussion.emptyBody")}</p>
                    </div>
                    <Button
                      variant="outline"
                      className="mt-2 border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                    >
                      {t("discussion.start")}
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* RIGHT: Session Summary */}
          <div className="lg:col-span-1">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-500">
                {t("summary.title")}
              </h3>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-400">{t("summary.status")}</span>
                  <span
                    className={cn(
                      "text-sm font-medium",
                      // Non-completed render only (COMPLETED early-returns at L286).
                      "text-yellow-400"
                    )}
                  >
                    {session.status}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-400">{t("summary.date")}</span>
                  <span className="text-sm text-white">{formattedDate}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-400">{t("summary.time")}</span>
                  <span className="text-sm text-white">{formattedTime}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-400">{t("summary.duration")}</span>
                  <span className="text-sm text-white">{session.duration} min</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-400">{t("summary.mode")}</span>
                  <span
                    className={cn(
                      "text-sm font-medium",
                      isAudioOnly ? "text-blue-400" : "text-white"
                    )}
                  >
                    {isAudioOnly ? "Audio only" : "Video"}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-400">{t("summary.host")}</span>
                  <span className="text-sm text-white">{session.mentor?.name || "Unknown"}</span>
                </div>

                {session.communityId && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-zinc-400">{t("summary.community")}</span>
                    <span className="text-sm text-white">
                      {session.community?.name || "Unknown"}
                    </span>
                  </div>
                )}

                <div className="border-t border-zinc-800 pt-4">
                  <div className="flex items-center gap-2 text-sm text-zinc-400">
                    <Users className="h-4 w-4" />
                    <span>{session.attendeeCount || 0} participants</span>
                  </div>
                </div>

                {session.feedPostId && (
                  <div className="border-t border-zinc-800 pt-4">
                    <div className="flex items-center gap-2 text-sm text-green-400">
                      <CheckCircle className="h-4 w-4" />
                      <span>{t("summary.postedToFeed")}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions Card */}
            <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-500">
                {t("quickActions.title")}
              </h3>
              <div className="space-y-2">
                {session?.mentorId === user?.id && (
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2 border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                    onClick={() => setShowAddToCourse(true)}
                  >
                    <BookOpen className="h-4 w-4" />
                    {t("addToCourse")}
                  </Button>
                )}
                {session?.mentorId === user?.id && (
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2 border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
                    onClick={() => setShowCreateClip(true)}
                  >
                    <Sparkles className="h-4 w-4" />
                    {t("createClip")}
                  </Button>
                )}
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2 border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                  onClick={() => setShowRecapReview(true)}
                  disabled={isSharing || !!session?.feedPostId}
                >
                  <Share2 className="h-4 w-4" />
                  {session?.feedPostId ? "Shared to Feed" : "Share Recap"}
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2 border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                  onClick={() => router.push(`/dashboard/sessions/create?template=${session.id}`)}
                >
                  <Calendar className="h-4 w-4" />
                  {t("quickActions.scheduleFollowUp")}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Add to Course Dialog */}
      {session && (
        <>
          <AddToCourseDialog
            sessionId={session.id}
            sessionTitle={session.title}
            open={showAddToCourse}
            onOpenChange={setShowAddToCourse}
            onSuccess={() => {
              loadSession();
            }}
          />

          <CreateSocialClipDialog
            sessionId={session.id}
            open={showCreateClip}
            onOpenChange={setShowCreateClip}
          />

          {/* The two "Share Recap" buttons on this branch used to post straight
              to the feed, exactly like the post-session card did. They open the
              same review panel now, so there is no path left that publishes
              without the host reading the text. */}
          {showRecapReview && !session.feedPostId && (
            <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/80 p-4">
              <div className="w-full max-w-3xl">
                <RecapReviewPanel
                  onLoadDraft={handleLoadRecapDraft}
                  onShare={handleShareRecap}
                  onDismiss={() => setShowRecapReview(false)}
                  alreadyShared={Boolean(session.feedPostId)}
                />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
