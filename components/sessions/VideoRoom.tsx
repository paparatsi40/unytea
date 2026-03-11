"use client";

import { useEffect, useState } from "react";
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { Loader2 } from "lucide-react";

interface VideoRoomProps {
  roomName: string;
  sessionId?: string;
  onLeave?: () => void;
}

export function VideoRoom({ roomName, onLeave }: VideoRoomProps) {
  const [token, setToken] = useState("");
  const [wsUrl, setWsUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchToken() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch("/api/livekit/token", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            roomName,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Failed to fetch token");
        }

        setToken(data.token);
        setWsUrl(data.wsUrl);
      } catch (err) {
        console.error("Token error:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Could not connect to video room"
        );
      } finally {
        setLoading(false);
      }
    }

    fetchToken();
  }, [roomName]);

  if (loading) {
    return (
      <div className="flex h-[600px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[600px] items-center justify-center text-red-500">
        {error}
      </div>
    );
  }

  if (!token || !wsUrl) return null;

  return (
    <LiveKitRoom
      token={token}
      serverUrl={wsUrl}
      connect={true}
      video={false}
      audio={false}
      onDisconnected={onLeave}
      className="h-[700px]"
    >
      <VideoConference />

      <RoomAudioRenderer />
    </LiveKitRoom>
  );
}