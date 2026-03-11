"use client";

import { useEffect, useState } from "react";
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
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
          <div className="text-xs text-muted-foreground bg-muted p-3 rounded-lg">
            <p className="font-medium mb-1">Possible causes:</p>
            <ul className="text-left list-disc pl-4 space-y-1">
              <li>LiveKit server not configured</li>
              <li>Camera/microphone permissions denied</li>
              <li>Network connection issue</li>
            </ul>
          </div>
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
            The video call service is not properly configured. Please contact support.
          </p>
          <div className="text-xs text-muted-foreground bg-muted p-3 rounded-lg text-left">
            <p className="font-medium">Missing environment variable:</p>
            <code className="block mt-1 text-destructive">NEXT_PUBLIC_LIVEKIT_URL</code>
          </div>
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
        className="h-full"
      >
        <VideoConference />
        <RoomAudioRenderer />
      </LiveKitRoom>

      {/* Whiteboard Toggle Button */}
      <button
        onClick={() => setShowWhiteboard(!showWhiteboard)}
        className={`absolute bottom-20 right-4 z-[100] flex items-center gap-2 rounded-full px-4 py-2 font-medium shadow-xl transition-all hover:scale-105 ${
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
    </div>
  );
}