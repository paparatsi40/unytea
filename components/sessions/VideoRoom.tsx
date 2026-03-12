"use client";

import { useEffect, useState } from "react";
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
  useConnectionState,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { Loader2, AlertCircle } from "lucide-react";
import { VideoRoomContent } from "./VideoRoomContent";

function ConnectionStatus() {
  const state = useConnectionState();

  useEffect(() => {
    console.log("LiveKit Connection State:", state);
  }, [state]);

  return (
    <div className="absolute top-4 left-4 z-50 rounded bg-black/70 px-3 py-1 text-xs text-white">
      {state}
    </div>
  );
}

interface VideoRoomProps {
  roomName: string;
  sessionId?: string;
  onLeave?: () => void;
}

export function VideoRoom({ roomName, onLeave: _onLeave }: VideoRoomProps) {
  const [token, setToken] = useState<string | null>(null);
  const [wsUrl, setWsUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function getToken() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch("/api/livekit/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomName }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Token request failed");
        }

        if (!mounted) return;

        setToken(data.token);
        setWsUrl(data.wsUrl);
      } catch (err) {
        console.error("Token fetch error:", err);

        if (!mounted) return;

        setError(
          err instanceof Error ? err.message : "Could not connect to room"
        );
      } finally {
        if (mounted) setLoading(false);
      }
    }

    getToken();

    return () => {
      mounted = false;
    };
  }, [roomName]);

  if (loading) {
    return (
      <div className="flex h-[700px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error || !token || !wsUrl) {
    return (
      <div className="flex h-[700px] items-center justify-center text-red-500">
        <AlertCircle className="mr-2 h-5 w-5" />
        {error || "Missing LiveKit config"}
      </div>
    );
  }

  return (
    <div className="relative">
      <LiveKitRoom
        token={token}
        serverUrl={wsUrl}
        connect={true}
        video={false}
        audio={false}
        onConnected={() => {
          console.log("Connected to LiveKit room");
        }}
        onDisconnected={(reason) => {
          console.log("Disconnected from LiveKit room", reason);
        }}
        onError={(err) => {
          console.error("LiveKit error:", err);
        }}
        className="h-[700px]"
      >
        <ConnectionStatus />

        <VideoConference />

        <RoomAudioRenderer />

        <VideoRoomContent sessionId={sessionId} />
      </LiveKitRoom>
    </div>
  );
}