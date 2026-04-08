"use client";

import { useEffect, useState, useCallback } from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { Loader2, AlertCircle, Mic } from "lucide-react";
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
 * AudioContextResumer - Shows an overlay button when the browser blocks AudioContext.
 * The user must click to allow audio. After click, resumes AudioContext and hides.
 */
function AudioContextResumer() {
  const [needsInteraction, setNeedsInteraction] = useState(false);

  useEffect(() => {
    // Check if any AudioContext is suspended
    const checkAudioContext = () => {
      // @ts-expect-error webkitAudioContext is not in types
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;

      // Try creating a test context to see if it auto-suspends
      const testCtx = new AudioCtx();
      if (testCtx.state === "suspended") {
        setNeedsInteraction(true);
      }
      // Don't close - it might be used elsewhere
    };

    // Small delay to let LiveKit create its AudioContext first
    const timer = setTimeout(checkAudioContext, 500);
    return () => clearTimeout(timer);
  }, []);

  const handleClick = useCallback(async () => {
    try {
      // Resume all AudioContexts on the page
      // @ts-expect-error webkitAudioContext is not in types
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        // Create and resume a context to "unlock" audio
        const ctx = new AudioCtx();
        await ctx.resume();
        console.log("[LiveKit] AudioContext resumed via user gesture");
      }

      // Also try to resume any existing contexts
      // LiveKit stores its context internally; the user gesture propagates
      setNeedsInteraction(false);
    } catch (e) {
      console.error("[LiveKit] Failed to resume AudioContext:", e);
      setNeedsInteraction(false);
    }
  }, []);

  if (!needsInteraction) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="text-center">
        <button
          onClick={handleClick}
          className="group flex flex-col items-center gap-4 rounded-2xl bg-purple-600 px-12 py-8 text-white shadow-2xl transition-all hover:bg-purple-500 hover:scale-105 active:scale-95"
        >
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/20 transition-colors group-hover:bg-white/30">
            <Mic className="h-10 w-10" />
          </div>
          <div>
            <p className="text-xl font-bold">Tap to Enable Audio</p>
            <p className="mt-1 text-sm text-purple-200">
              Your browser requires a click to activate microphone and speakers
            </p>
          </div>
        </button>
      </div>
    </div>
  );
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
          throw new Error("Failed to get token");
        }

        const data = await response.json();

        if (!mounted) return;

        setToken(data.token);
        setWsUrl(data.wsUrl);
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "Unknown error");
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
  }, [roomName]);

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
        {error || "Missing LiveKit config"}
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
        onConnected={() => {
          console.log("[LiveKit] Connected to room. Mode:", sessionMode, "| video:", sessionMode === "video", "| audio: true");
        }}
        onDisconnected={(reason) => {
          console.log("[LiveKit] Disconnected from room", reason);
          onLeave?.();
        }}
        onError={(err) => {
          console.error("[LiveKit] Error:", err);
        }}
        onMediaDeviceFailure={(failure) => {
          console.error("[LiveKit] Media device failure:", failure);
        }}
        className="h-full flex flex-col"
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
        <AudioContextResumer />
      </LiveKitRoom>
    </div>
  );
}
