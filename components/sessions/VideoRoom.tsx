"use client";

import { useEffect, useMemo, useState } from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  VideoConference,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { AlertCircle, Loader2 } from "lucide-react";
import { VideoRoomContent } from "./VideoRoomContent";

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

  useEffect(() => {
    let active = true;

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

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(data.error || "Failed to fetch token");
        }

        const nextToken =
          typeof data.token === "string" ? data.token.trim() : "";
        const nextWsUrl =
          typeof data.wsUrl === "string" && data.wsUrl.trim()
            ? data.wsUrl.trim()
            : (process.env.NEXT_PUBLIC_LIVEKIT_URL ?? "").trim();

        if (!nextToken) {
          throw new Error("No token received from server");
        }

        if (!nextWsUrl) {
          throw new Error("LiveKit server URL is missing");
        }

        if (!active) return;

        setToken(nextToken);
        setWsUrl(nextWsUrl);
      } catch (err) {
        console.error("Error fetching LiveKit token:", err);
        if (!active) return;
        setError(
          err instanceof Error ? err.message : "Could not connect to video room"
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    fetchToken();

    return () => {
      active = false;
    };
  }, [roomName]);

  const roomKey = useMemo(() => {
    return `${roomName}:${token}:${wsUrl}`;
  }, [roomName, token, wsUrl]);

  if (loading) {
    return (
      <div className="flex h-[700px] items-center justify-center rounded-xl bg-card">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            Connecting to video room...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[700px] items-center justify-center rounded-xl bg-card px-4">
        <div className="max-w-md text-center">
          <AlertCircle className="mx-auto mb-4 h-10 w-10 text-destructive" />
          <p className="mb-2 text-lg font-semibold text-destructive">
            Failed to connect
          </p>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (!token || !wsUrl) {
    return (
      <div className="flex h-[700px] items-center justify-center rounded-xl bg-card px-4">
        <div className="max-w-md text-center">
          <AlertCircle className="mx-auto mb-4 h-10 w-10 text-destructive" />
          <p className="mb-2 text-lg font-semibold text-destructive">
            LiveKit not configured
          </p>
          <p className="text-sm text-muted-foreground">
            Missing token or wsUrl.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-[700px] w-full overflow-hidden rounded-xl bg-card">
      <LiveKitRoom
        key={roomKey}
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
          console.error("LiveKit room error:", err);
        }}
        options={{
          adaptiveStream: true,
          dynacast: true,
        }}
        className="h-full"
      >
        <VideoConference />
        <RoomAudioRenderer />
        <VideoRoomContent sessionId={sessionId} onLeave={onLeave} />
      </LiveKitRoom>
    </div>
  );
}