"use client";

import { useEffect, useState } from "react";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getSession, getSessionRSVPStatus, setSessionRSVPStatus } from "@/app/actions/sessions";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useCurrentUser } from "@/hooks/use-current-user";
import { AddToCourseDialog } from "@/components/sessions/AddToCourseDialog";
import { CreateSocialClipDialog } from "@/components/public-content/CreateSocialClipDialog";
import { PostSessionFlow } from "@/components/sessions/PostSessionFlow";
import { toast } from "sonner";
import { shareSessionRecap } from "@/app/actions/session-jobs";
import { createResourceFromSession } from "@/app/actions/session-course";

interface SessionPageProps {
  params: { sessionId: string };
}

export default function SessionDetailPage({ params }: SessionPageProps) {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useCurrentUser();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("recording");
  const [showAddToCourse, setShowAddToCourse] = useState(false);
  const [showCreateClip, setShowCreateClip] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [rsvpStatus, setRsvpStatus] = useState<"attending" | "interested" | null>(null);
  const [attendingCount, setAttendingCount] = useState(0);
  const [interestedCount, setInterestedCount] = useState(0);
  const [attendingPreview, setAttendingPreview] = useState<Array<{ id: string; name: string | null; image: string | null }>>([]);
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

  async function handleShareRecap() {
    if (!session) return;

    setIsSharing(true);
    try {
      // If recap post already exists, show message
      if (session.feedPostId) {
        toast.info("This session has already been shared to the community feed");
        return;
      }

      // Generate recap post
      const result = await shareSessionRecap(session.id);
      if (result.success) {
        toast.success("Session recap shared to community feed!");
        // Reload session to get updated feedPostId
        await loadSession();
      } else {
        toast.error(result.error || "Failed to share recap");
      }
    } catch (error) {
      toast.error("Error sharing recap");
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
        toast.error(result.error || "Failed to publish to library");
        return;
      }

      toast.success("Session published to library");
      if (session.community?.slug) {
        router.push(`/dashboard/c/${session.community.slug}/library?src=session_reuse`);
      }
      await loadSession();
    } catch {
      toast.error("Failed to publish to library");
    }
  }

  async function handleSetRSVP(status: "attending" | "interested") {
    if (!session || session.status !== "SCHEDULED") return;

    setIsRSVPLoading(true);
    try {
      const result = await setSessionRSVPStatus(session.id, status, window.location.pathname);
      if (!result.success) {
        toast.error(result.error || "Failed to update RSVP");
        return;
      }

      setRsvpStatus(result.status ?? null);
      setAttendingCount(result.attendingCount || 0);
      setInterestedCount(result.interestedCount || 0);
      setAttendingPreview(result.attendingPreview || []);

      if (!result.status) {
        toast.success("RSVP removed");
      } else if (result.status === "attending") {
        toast.success("You are attending this session");
      } else {
        toast.success("Marked as interested");
      }
    } catch {
      toast.error("Failed to update RSVP");
    } finally {
      setIsRSVPLoading(false);
    }
  }

  if (isAuthLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
          <p className="text-zinc-400">Loading session...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="text-center">
          <p className="text-lg text-red-400">Session not found</p>
          <Link
            href="/dashboard/sessions"
            className="mt-4 text-sm text-purple-400 hover:underline"
          >
            Back to sessions
          </Link>
        </div>
      </div>
    );
  }

  const isAudioOnly = session.mode === "AUDIO";
  const isProcessing = session.status === "PROCESSING";
  const hasRecording = session.recordingUrl || session.status === "COMPLETED";
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
              <span>Back to Sessions</span>
            </Link>

            {/* Center: Session info */}
            <div className="flex flex-col items-center">
              <h1 className="text-lg font-semibold text-white">{session.title}</h1>
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <span className="flex items-center gap-1">
                  {session.status === "COMPLETED" ? (
                    <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                  ) : (
                    <Radio className="h-3.5 w-3.5 text-red-500" />
                  )}
                  {session.status === "COMPLETED" ? "Completed" : session.status}
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
                      Audio only
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
        {/* ACTION BAR */}
        <div className="mb-6 flex items-center gap-3">
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
                {isRSVPLoading && rsvpStatus !== "attending" ? "Updating..." : rsvpStatus === "attending" ? "Attending" : "Attending"}
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
                  Add to Google Calendar
                </a>
              </Button>
              <Button
                variant="outline"
                className="gap-2 border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800"
                onClick={downloadAppleCalendarIcs}
              >
                <Calendar className="h-4 w-4" />
                Add to Apple Calendar
              </Button>
            </>
          )}

          {hasRecording && !isProcessing && (
            <Button 
              className="gap-2 bg-purple-600 hover:bg-purple-700"
              onClick={() => setActiveTab("recording")}
            >
              <Play className="h-4 w-4" />
              Watch Recording
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
                Add to Course
              </Button>

              <Button
                variant="outline"
                className="gap-2 border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
                onClick={() => setShowCreateClip(true)}
              >
                <Sparkles className="h-4 w-4" />
                Create Clip
              </Button>
            </>
          )}
          
          <Button 
            variant="outline" 
            className="gap-2 border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
            onClick={handleShareRecap}
            disabled={isSharing || session?.feedPostId}
          >
            <Share2 className="h-4 w-4" />
            {isSharing ? "Sharing..." : session?.feedPostId ? "Already Shared" : "Share Recap"}
          </Button>

          {session.recordingUrl && (
            <Button 
              variant="ghost" 
              className="gap-2 text-zinc-400 hover:text-white"
              asChild
            >
              <a href={session.recordingUrl} download>
                <Download className="h-4 w-4" />
                Download
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
                  Recording
                </TabsTrigger>
                <TabsTrigger 
                  value="notes"
                  className="flex-1 data-[state=active]:bg-zinc-800 data-[state=active]:text-white"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Notes
                </TabsTrigger>
                <TabsTrigger 
                  value="resources"
                  className="flex-1 data-[state=active]:bg-zinc-800 data-[state=active]:text-white"
                >
                  <Folder className="mr-2 h-4 w-4" />
                  Resources
                </TabsTrigger>
                <TabsTrigger 
                  value="discussion"
                  className="flex-1 data-[state=active]:bg-zinc-800 data-[state=active]:text-white"
                >
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Discussion
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
                        <p className="text-lg font-medium text-white">Processing recording...</p>
                        <p className="text-sm text-zinc-400">
                          The video will be available soon. You can review notes in the meantime.
                        </p>
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
                        Your browser does not support the video tag.
                      </video>
                    </div>
                  ) : (
                    <div className="flex h-[400px] flex-col items-center justify-center gap-4">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-800">
                        <Play className="h-8 w-8 text-zinc-500" />
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-medium text-white">No recording available</p>
                        <p className="text-sm text-zinc-400">
                          This session was not recorded or the recording is still being processed.
                        </p>
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
                      <h3 className="mb-4 text-lg font-semibold text-white">Session Notes</h3>
                      <div className="whitespace-pre-wrap text-zinc-300">
                        {session.notes.content || "No notes content yet."}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-4 py-12">
                      <FileText className="h-12 w-12 text-zinc-600" />
                      <div className="text-center">
                        <p className="text-lg font-medium text-white">No notes yet</p>
                        <p className="text-sm text-zinc-400">
                          Capture key takeaways, resources, and action items from this session.
                        </p>
                      </div>
                      <Button 
                        variant="outline" 
                        className="mt-2 border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                      >
                        Add Notes
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
                      <p className="text-lg font-medium text-white">No resources added yet</p>
                      <p className="text-sm text-zinc-400">
                        Add links, templates, or files from this session.
                      </p>
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
                      <p className="text-lg font-medium text-white">No follow-up discussion yet</p>
                      <p className="text-sm text-zinc-400">
                        Start a conversation with your community about this session.
                      </p>
                    </div>
                    <Button 
                      variant="outline" 
                      className="mt-2 border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                    >
                      Start Discussion
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
                Session Summary
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-400">Status</span>
                  <span className={cn(
                    "text-sm font-medium",
                    session.status === "COMPLETED" ? "text-green-400" : "text-yellow-400"
                  )}>
                    {session.status}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-400">Date</span>
                  <span className="text-sm text-white">{formattedDate}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-400">Time</span>
                  <span className="text-sm text-white">{formattedTime}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-400">Duration</span>
                  <span className="text-sm text-white">{session.duration} min</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-400">Mode</span>
                  <span className={cn(
                    "text-sm font-medium",
                    isAudioOnly ? "text-blue-400" : "text-white"
                  )}>
                    {isAudioOnly ? "Audio only" : "Video"}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-400">Host</span>
                  <span className="text-sm text-white">{session.mentor?.name || "Unknown"}</span>
                </div>

                {session.communityId && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-zinc-400">Community</span>
                    <span className="text-sm text-white">{session.community?.name || "Unknown"}</span>
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
                      <span>Posted to community feed</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions Card */}
            <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-500">
                Quick Actions
              </h3>
              <div className="space-y-2">
                {session?.mentorId === user?.id && (
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2 border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                    onClick={() => setShowAddToCourse(true)}
                  >
                    <BookOpen className="h-4 w-4" />
                    Add to Course
                  </Button>
                )}
                {session?.mentorId === user?.id && (
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2 border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
                    onClick={() => setShowCreateClip(true)}
                  >
                    <Sparkles className="h-4 w-4" />
                    Create Clip
                  </Button>
                )}
                <Button 
                  variant="outline" 
                  className="w-full justify-start gap-2 border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                  onClick={handleShareRecap}
                  disabled={isSharing || session?.feedPostId}
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
                  Schedule Follow-up
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
        </>
      )}
    </div>
  );
}
