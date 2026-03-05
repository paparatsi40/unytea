"use client";

import { useEffect, useState } from "react";
import { LiveKitRoom, VideoConference, RoomAudioRenderer } from "@livekit/components-react";
import "@livekit/components-styles";
import { Loader2 } from "lucide-react";

interface VideoCallRoomProps {
  roomName: string;
  participantName: string;
  onDisconnect?: () => void;
}

export function VideoCallRoom({ roomName, participantName, onDisconnect }: VideoCallRoomProps) {
  const [token, setToken] = useState<string>("");
  const [wsUrl, setWsUrl] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchToken() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch("/api/livekit/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            roomName,
            participantName,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to get access token");
        }

        const data = await response.json();
        setToken(data.token);
        setWsUrl(data.wsUrl);
      } catch (err) {
        console.error("Error fetching token:", err);
        setError(err instanceof Error ? err.message : "Failed to connect to video call");
      } finally {
        setLoading(false);
      }
    }

    fetchToken();
  }, [roomName, participantName]);

  if (loading) {
    return (
      <div className="flex h-[600px] items-center justify-center rounded-lg border bg-gray-50">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="mt-4 text-sm text-muted-foreground">Connecting to video call...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[600px] items-center justify-center rounded-lg border bg-red-50">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <svg
              className="h-6 w-6 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <h3 className="mb-2 text-lg font-semibold text-gray-900">Connection Failed</h3>
          <p className="text-sm text-gray-600">{error}</p>
          {onDisconnect && (
            <button
              onClick={onDisconnect}
              className="mt-4 rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
            >
              Go Back
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!token || !wsUrl) {
    return null;
  }

  return (
    <div className="video-call-container">
      <LiveKitRoom
        token={token}
        serverUrl={wsUrl}
        connect={true}
        video={true}
        audio={true}
        onDisconnected={onDisconnect}
        className="rounded-lg border"
        style={{ height: "600px" }}
      >
        <VideoConference />
        <RoomAudioRenderer />
      </LiveKitRoom>
    </div>
  );
}
