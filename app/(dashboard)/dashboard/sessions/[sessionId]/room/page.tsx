"use client";

import { useEffect, useState, useCallback } from "react";
import { getSession } from "@/app/actions/sessions";
import { endSession } from "@/app/actions/session-jobs";
import { VideoRoom } from "@/components/sessions/VideoRoom";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";

export default function SessionRoomPage({
  params,
}: {
  params: { sessionId: string };
}) {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useCurrentUser();
  const [videoSession, setVideoSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEnding, setIsEnding] = useState(false);

  useEffect(() => {
    // Check auth
    if (!isAuthLoading && !user) {
      router.push("/auth/signin");
      return;
    }

    if (!isAuthLoading && user) {
      // Get session data
      loadSession();
    }
  }, [params.sessionId, user, isAuthLoading, router]);

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
    } catch (error) {
      console.error("Failed to load session:", error);
      toast.error("Failed to load session");
    } finally {
      setLoading(false);
    }
  };

  const handleEndSession = useCallback(async () => {
    if (!confirm("Are you sure you want to end this session? This will stop the recording and generate a session recap.")) {
      return;
    }

    setIsEnding(true);
    try {
      const result = await endSession(params.sessionId);
      if (result.success) {
        toast.success("Session ended! Recap will be available shortly.");
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
      toast.error("An error occurred while ending the session");
      setIsEnding(false);
    }
  }, [params.sessionId, router]);

  const handleLeave = useCallback(() => {
    router.push("/dashboard/sessions");
  }, [router]);

  if (isAuthLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
          <p className="text-zinc-400">Loading session...</p>
        </div>
      </div>
    );
  }

  if (!videoSession?.roomId) {
    router.replace("/dashboard/sessions");
    return null;
  }

  const isHost = user?.id === videoSession.mentorId;

  return (
    <div className="h-screen bg-zinc-950">
      <VideoRoom
        roomName={videoSession.roomId}
        sessionId={videoSession.id}
        sessionMode={videoSession.mode || "video"}
        sessionTitle={videoSession.title}
        isHost={isHost}
        onLeave={handleLeave}
        onEndSession={isHost ? handleEndSession : undefined}
      />
      
      {isEnding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="text-center">
            <div className="mb-4 h-12 w-12 animate-spin rounded-full border-3 border-purple-500 border-t-transparent" />
            <p className="text-lg font-medium text-white">Ending session...</p>
            <p className="text-sm text-zinc-400">Generating recap and processing recording</p>
          </div>
        </div>
      )}
    </div>
  );
}
