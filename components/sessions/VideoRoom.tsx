"use client";

import { useEffect, useState } from "react";
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
  ControlBar,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { Loader2, Presentation, AlertCircle } from "lucide-react";
import { SessionWhiteboard } from "./SessionWhiteboard";

interface VideoRoomProps {
  roomName: string;
  onLeave?: () => void;
  sessionId?: string;
}

export function VideoRoom({ roomName, onLeave, sessionId }: VideoRoomProps) {
  const [token, setToken] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [showWhiteboard, setShowWhiteboard] = useState(false);

  useEffect(() => {
    async function getToken() {
      try {
        setIsLoading(true);
        const response = await fetch("/api/livekit/token", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            roomName: roomName,
            participantName: "Participant",
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Failed to get token: ${response.status}`);
        }

        const data = await response.json();
        if (!data.token) {
          throw new Error("No token received from server");
        }
        console.log("Got LiveKit token");
        setToken(data.token);
      } catch (err) {
        console.error("Error getting token:", err);
        setError(err instanceof Error ? err.message : "Failed to join video room");
      } finally {
        setIsLoading(false);
      }
    }

    getToken();
  }, [roomName]);

  if (isLoading) {
    return (
      <div className="flex h-[600px] items-center justify-center rounded-xl bg-card">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Connecting to video room...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[600px] items-center justify-center rounded-xl bg-card">
        <div className="text-center max-w-md px-4">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-destructive" />
          <p className="mb-2 text-lg font-semibold text-destructive">
            Video Connection Failed
          </p>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="flex h-[600px] items-center justify-center rounded-xl bg-card">
        <div className="text-center">
          <AlertCircle className="mx-auto mb-4 h-8 w-8 text-destructive" />
          <p className="text-destructive">No authentication token available</p>
        </div>
      </div>
    );
  }

  const serverUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

  if (!serverUrl) {
    return (
      <div className="flex h-[600px] items-center justify-center rounded-xl bg-card">
        <div className="text-center max-w-md px-4">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-destructive" />
          <p className="mb-2 text-lg font-semibold text-destructive">
            LiveKit Not Configured
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            Missing environment variable: NEXT_PUBLIC_LIVEKIT_URL
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-[600px] w-full overflow-hidden rounded-xl bg-card">
      <LiveKitRoom
        video={true}
        audio={true}
        token={token}
        serverUrl={serverUrl}
        connect={true}
        onDisconnected={onLeave}
        onError={(err) => {
          console.error("LiveKit connection error:", err);
        }}
        className="h-full"
        options={{
          adaptiveStream: true,
          dynacast: true,
        }}
      >
        {/* Native LiveKit Video Conference */}
        <div className="flex h-full flex-col">
          <div className="flex-1 relative">
            <VideoConference />
          </div>
          <RoomAudioRenderer />
        </div>

        {/* Whiteboard Toggle Button */}
        <button
          onClick={() => setShowWhiteboard(!showWhiteboard)}
          className={`absolute bottom-20 right-4 flex items-center gap-2 rounded-full px-4 py-2 font-medium shadow-xl transition-all hover:scale-105 z-50 ${
            showWhiteboard
              ? "bg-purple-600 text-white hover:bg-purple-700"
              : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
          }`}
        >
          <Presentation className="h-5 w-5" />
          {showWhiteboard ? "Close Whiteboard" : "Open Whiteboard"}
        </button>

        {/* Whiteboard Overlay */}
        {sessionId && (
          <SessionWhiteboard
            isOpen={showWhiteboard}
            onClose={() => setShowWhiteboard(false)}
            sessionId={sessionId}
          />
        )}
      </LiveKitRoom>
    </div>
  );
}
