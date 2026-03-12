"use client";

import { useEffect, useState } from "react";
import {
  LiveKitRoom,
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

export function VideoRoom({ roomName, sessionId, onLeave: _onLeave }: VideoRoomProps) {
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
          body: JSON.stringify({ room: roomName }),
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
    <div className="h-[calc(100vh-200px)] min-h-[600px]">
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
        className="h-full"
      >
        <ConnectionStatus />
        <RoomAudioRenderer />
        <VideoRoomContent sessionId={sessionId} />
      </LiveKitRoom>
    </div>
  );
}
