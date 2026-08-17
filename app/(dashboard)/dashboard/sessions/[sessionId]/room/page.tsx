"use client";

import { useEffect, useState, useCallback, useRef, use } from "react";
import { getSession, type SessionDetail } from "@/app/actions/sessions";
import { endSession } from "@/app/actions/session-jobs";
import { VideoRoom } from "@/components/sessions/VideoRoom";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import {
  getRecordingStatus,
  startCompositeRecording,
  stopRecording,
} from "@/app/actions/recording";

export default function SessionRoomPage(props: { params: Promise<{ sessionId: string }> }) {
  const params = use(props.params);
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useCurrentUser();
  const t = useTranslations("liveSession.room");
  // Held in a ref, and the callbacks below read `tRef.current` rather than
  // closing over `t`. next-intl memoises the translator against the intl
  // context, which is rebuilt every time the route's RSC payload is
  // re-delivered — so `t` changes identity for no semantic reason. Putting it
  // in a useCallback dependency array would rebuild `onEndSession` and
  // `onToggleRecording` on each of those, and handing `VideoRoom` fresh props
  // is exactly the shape that produced the live-room reconnect loop
  // (tests/unit/room-reconnect.test.tsx). The ref keeps the copy current
  // without making the callbacks churn.
  const tRef = useRef(t);
  useEffect(() => {
    tRef.current = t;
  }, [t]);
  const [videoSession, setVideoSession] = useState<SessionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEnding, setIsEnding] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isRecordingBusy, setIsRecordingBusy] = useState(false);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    // Check auth
    if (!isAuthLoading && !user) {
      router.push("/auth/signin");
      return;
    }

    // Only load session once
    if (!isAuthLoading && user && !hasLoadedRef.current) {
      hasLoadedRef.current = true;
      loadSession();
    }
  }, [params.sessionId, user, isAuthLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadSession = async () => {
    try {
      setLoading(true);
      const result = await getSession(params.sessionId);
      if (!result.success || !result.session) {
        router.push("/dashboard/sessions");
        return;
      }

      // Check if session is already ended
      if (result.session.status === "COMPLETED" || result.session.status === "CANCELLED") {
        router.push(`/dashboard/sessions/${params.sessionId}`);
        return;
      }

      setVideoSession(result.session);

      const recordingStatus = await getRecordingStatus(params.sessionId);
      if (recordingStatus.success && recordingStatus.recording) {
        setIsRecording(recordingStatus.recording.status === "PROCESSING");
      } else {
        setIsRecording(false);
      }
    } catch (error) {
      console.error("Failed to load session:", error);
      toast.error(tRef.current("toasts.loadFailed"));
    } finally {
      setLoading(false);
    }
  };

  const handleEndSession = useCallback(async () => {
    if (
      !confirm(
        "Are you sure you want to end this session? This will stop the recording and generate a session recap."
      )
    ) {
      return;
    }

    setIsEnding(true);
    try {
      const result = await endSession(params.sessionId);
      if (result.success) {
        toast.success(tRef.current("toasts.ended"));
        // Redirect to session recap page
        setTimeout(() => {
          router.push(`/dashboard/sessions/${params.sessionId}`);
        }, 1500);
      } else {
        toast.error(result.error || "Failed to end session");
        setIsEnding(false);
      }
    } catch (error) {
      console.error("Error ending session:", error);
      toast.error(tRef.current("toasts.endError"));
      setIsEnding(false);
    }
  }, [params.sessionId, router]);

  const handleLeave = useCallback(() => {
    router.push("/dashboard/sessions");
  }, [router]);

  const handleToggleRecording = useCallback(async () => {
    if (!videoSession?.id || isRecordingBusy) return;

    const roomId = videoSession.videoRoomName || videoSession.roomId;
    if (!roomId) return;

    setIsRecordingBusy(true);
    try {
      if (isRecording) {
        const result = await stopRecording(videoSession.id);
        if (result.success) {
          setIsRecording(false);
          toast.success(tRef.current("toasts.recordingPaused"));
        } else {
          toast.error(result.error || "Failed to pause recording");
        }
      } else {
        const result = await startCompositeRecording({
          sessionId: videoSession.id,
          roomName: roomId,
          layout: "grid",
          audioOnly: (videoSession.mode || "VIDEO").toUpperCase() === "AUDIO",
        });

        if (result.success) {
          setIsRecording(true);
          toast.success(tRef.current("toasts.recordingStarted"));
        } else {
          toast.error(result.error || "Failed to start recording");
        }
      }
    } catch (error) {
      console.error("Error toggling recording:", error);
      toast.error(tRef.current("toasts.recordingFailed"));
    } finally {
      setIsRecordingBusy(false);
    }
  }, [videoSession, isRecording, isRecordingBusy]);

  if (isAuthLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
          <p className="text-zinc-400">{t("status.loading")}</p>
        </div>
      </div>
    );
  }

  // Use videoRoomName (LiveKit) first, fall back to roomId
  const roomName = videoSession?.videoRoomName || videoSession?.roomId;

  if (!roomName) {
    router.replace("/dashboard/sessions");
    return null;
  }

  const isHost = user?.id === videoSession.mentorId;

  // Normalize mode to lowercase (Prisma enum is "VIDEO"/"AUDIO", LiveKit expects "video"/"audio")
  const normalizedMode = (videoSession.mode || "VIDEO").toLowerCase() as "video" | "audio";

  return (
    <div className="h-screen bg-zinc-950">
      <VideoRoom
        sessionId={videoSession.id}
        sessionMode={normalizedMode}
        sessionTitle={videoSession.title}
        isHost={isHost}
        isRecording={isRecording}
        isRecordingBusy={isRecordingBusy}
        onToggleRecording={isHost ? handleToggleRecording : undefined}
        onLeave={handleLeave}
        onEndSession={isHost ? handleEndSession : undefined}
      />

      {isEnding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="text-center">
            <div className="border-3 mb-4 h-12 w-12 animate-spin rounded-full border-purple-500 border-t-transparent" />
            <p className="text-lg font-medium text-white">{t("status.endingTitle")}</p>
            {/* Says only what `endSessionJob` does: mark the session COMPLETED
                and revalidate. It used to promise a recap and a recording —
                neither runs here. The recap is drafted on demand when the host
                opens the review panel, and nothing produces a recording at
                all (the Egress call is still a TODO). */}
            <p className="text-sm text-zinc-400">{t("status.endingBody")}</p>
          </div>
        </div>
      )}
    </div>
  );
}
