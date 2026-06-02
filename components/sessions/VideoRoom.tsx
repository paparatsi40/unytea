"use client";

import { useEffect, useState, useRef } from "react";
import { LiveKitRoom, RoomAudioRenderer } from "@livekit/components-react";
import "@livekit/components-styles";
import { useTranslations } from "next-intl";
import { Loader2, AlertCircle } from "lucide-react";
import { VideoRoomUI } from "./VideoRoomUI";

interface VideoRoomProps {
  roomName: string;
  sessionId?: string;
  sessionMode?: "video" | "audio";
  sessionTitle?: string;
  isHost?: boolean;
  isRecording?: boolean;
  isRecordingBusy?: boolean;
  onToggleRecording?: () => void;
  onLeave?: () => void;
  onEndSession?: () => void;
}

/**
 * AudioUnlocker - Resumes suspended AudioContexts on the first user interaction.
 */
function AudioUnlocker() {
  const hasUnlocked = useRef(false);

  useEffect(() => {
    const resumeAudio = async () => {
      if (hasUnlocked.current) return;
      hasUnlocked.current = true;

      try {
        // @ts-expect-error webkitAudioContext is not in types
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          if (ctx.state === "suspended") {
            await ctx.resume();
          }
        }
      } catch (e) {
        console.error("[LiveKit] Failed to resume AudioContext:", e);
      }
    };

    // Listen for ANY user interaction to unlock audio
    const events = ["click", "touchstart", "keydown"] as const;
    events.forEach((evt) => document.addEventListener(evt, resumeAudio, { once: true }));

    return () => {
      events.forEach((evt) => document.removeEventListener(evt, resumeAudio));
    };
  }, []);

  return null;
}

export function VideoRoom({
  roomName,
  sessionId,
  sessionMode = "video",
  sessionTitle,
  isHost = false,
  isRecording = false,
  isRecordingBusy = false,
  onToggleRecording,
  onLeave,
  onEndSession,
}: VideoRoomProps) {
  const t = useTranslations("liveSession.videoRoom");
  const [token, setToken] = useState<string | null>(null);
  const [wsUrl, setWsUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function getToken() {
      try {
        setLoading(true);
        const response = await fetch("/api/livekit/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomName }),
        });

        if (!response.ok) {
          throw new Error(t("tokenError"));
        }

        const data = await response.json();

        if (!mounted) return;

        setToken(data.token);
        setWsUrl(data.wsUrl);
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : t("unknownError"));
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    getToken();

    return () => {
      mounted = false;
    };
  }, [roomName, t]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (error || !token || !wsUrl) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950 text-red-500">
        <AlertCircle className="mr-2 h-5 w-5" />
        {error || t("missingConfig")}
      </div>
    );
  }

  return (
    <div className="h-screen">
      <LiveKitRoom
        token={token}
        serverUrl={wsUrl}
        connect={true}
        video={sessionMode === "video"}
        audio={true}
        onDisconnected={() => {
          onLeave?.();
        }}
        onError={(err) => {
          console.error("[LiveKit] Error:", err);
        }}
        onMediaDeviceFailure={(failure) => {
          console.error("[LiveKit] Media device failure:", failure);
        }}
        className="flex h-full flex-col"
      >
        <VideoRoomUI
          sessionId={sessionId}
          sessionMode={sessionMode}
          sessionTitle={sessionTitle}
          isHost={isHost}
          isRecording={isRecording}
          isRecordingBusy={isRecordingBusy}
          onToggleRecording={onToggleRecording}
          onLeave={onLeave}
          onEndSession={onEndSession}
        />
        <RoomAudioRenderer />
        <AudioUnlocker />
      </LiveKitRoom>
    </div>
  );
}
