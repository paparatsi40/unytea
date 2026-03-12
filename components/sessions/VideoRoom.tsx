"use client";

import { useEffect, useRef, useState } from "react";
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
  const connectionState = useConnectionState();

  useEffect(() => {
    console.log("LiveKit Connection State:", connectionState);
  }, [connectionState]);

  return (
    <div className="absolute left-4 top-4 z-50 rounded bg-black/70 px-3 py-1 text-xs text-white">
      Status: {connectionState}
    </div>
  );
}

interface VideoRoomProps {
  roomName: string;
  sessionId?: string;
  onLeave?: () => void;
}

export function VideoRoom({ roomName, sessionId, onLeave }: VideoRoomProps) {
  const [token, setToken] = useState("");
  const [wsUrl, setWsUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const hasConnected = useRef(false);

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
          err instanceof Error ? err.message : "Could not connect to video room"
        );
      } finally {
        setLoading(false);
      }
    }

    fetchToken();
  }, [roomName]);

  /*const handleDisconnected = () => {
    console.log("Disconnected, hasConnected:", hasConnected.current);
    setConnectionError("Disconnected from LiveKit room");

    // Temporalmente NO navegues automáticamente.
    // Solo deja el log hasta estabilizar la conexión.
    // if (hasConnected.current && onLeave) {
    //   onLeave();
    // }
  };
*/
  const handleError = (err: Error) => {
    console.error("LiveKit Room Error:", err);
    setConnectionError(err.message);
  };

  const handleConnected = () => {
    console.log("Connected to LiveKit room");
    hasConnected.current = true;
    setConnectionError(null);
  };

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
        <AlertCircle className="mr-2 h-5 w-5" />
        {error}
      </div>
    );
  }

  if (!token || !wsUrl) return null;

  return (
    <div className="relative">
      {connectionError && (
        <div className="mb-4 rounded bg-red-100 p-3 text-red-700">
          <AlertCircle className="mr-2 inline h-4 w-4" />
          Connection Error: {connectionError}
        </div>
      )}

      <LiveKitRoom
        token={token}
        serverUrl={wsUrl}
        connect={true}
        video={false}
        audio={false}
        onDisconnected={handleDisconnected}
        onError={handleError}
        onConnected={handleConnected}
        className="h-[700px]"
      >
        <ConnectionStatus />
        <VideoRoomContent sessionId={sessionId} onLeave={onLeave} />
        <VideoConference />
        <RoomAudioRenderer />
      </LiveKitRoom>
    </div>
  );
}