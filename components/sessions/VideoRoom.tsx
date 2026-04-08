"use client";

import { useEffect, useState, useRef } from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useLocalParticipant,
} from "@livekit/components-react";
import "@livekit/components-styles";
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
 * Also monitors and logs mic/audio track state for debugging.
 */
function AudioUnlocker() {
  const { localParticipant } = useLocalParticipant();
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
            console.log("[LiveKit] AudioContext resumed via user gesture");
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

  // Log mic/track state after connection for debugging
  useEffect(() => {
    if (!localParticipant) return;

    const timer = setTimeout(() => {
      const audioTracks = localParticipant.audioTrackPublications;
      const videoTracks = localParticipant.videoTrackPublications;

      console.log("[LiveKit] === Track State Debug ===");
      console.log("[LiveKit] Participant identity:", localParticipant.identity);
      console.log("[LiveKit] Permissions:", JSON.stringify(localParticipant.permissions));
      console.log("[LiveKit] Audio tracks:", audioTracks.size);
      audioTracks.forEach((pub, sid) => {
        console.log(`[LiveKit]   Audio track ${sid}: subscribed=${pub.isSubscribed}, muted=${pub.isMuted}, enabled=${pub.isEnabled}, source=${pub.source}`);
      });
      console.log("[LiveKit] Video tracks:", videoTracks.size);
      videoTracks.forEach((pub, sid) => {
        console.log(`[LiveKit]   Video track ${sid}: subscribed=${pub.isSubscribed}, muted=${pub.isMuted}, enabled=${pub.isEnabled}, source=${pub.source}`);
      });
      console.log("[LiveKit] Mic enabled:", localParticipant.isMicrophoneEnabled);
      console.log("[LiveKit] Camera enabled:", localParticipant.isCameraEnabled);
      console.log("[LiveKit] === End Debug ===");
    }, 3000);

    return () => clearTimeout(timer);
  }, [localParticipant]);

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
        <AudioUnlocker />
      </LiveKitRoom>
    </div>
  );
}
