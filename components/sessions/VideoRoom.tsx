"use client";

import { useCallback, useMemo, useState } from "react";
import {
  LiveKitRoom,
  PreJoin,
  RoomAudioRenderer,
  VideoConference,
  type LocalUserChoices,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { AlertCircle, Loader2 } from "lucide-react";

interface VideoRoomProps {
  roomName: string;
  sessionId?: string;
  onLeave?: () => void;
}

type JoinStep = "prejoin" | "loading" | "room";

export function VideoRoom({ roomName, onLeave }: VideoRoomProps) {
  const [token, setToken] = useState("");
  const [wsUrl, setWsUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<JoinStep>("prejoin");
  const [choices, setChoices] = useState<LocalUserChoices | null>(null);

  const handleSubmit = useCallback(
    async (values: LocalUserChoices) => {
      try {
        setError(null);
        setStep("loading");
        setChoices(values);

        const response = await fetch("/api/livekit/token", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            roomName,
            participantName: values.username?.trim() || "Participant",
          }),
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(data.error || "Failed to get access token");
        }

        const resolvedToken =
          typeof data.token === "string" ? data.token.trim() : "";
        const resolvedWsUrl =
          typeof data.wsUrl === "string" ? data.wsUrl.trim() : "";

        if (!resolvedToken) {
          throw new Error("Token not received");
        }

        if (!resolvedWsUrl) {
          throw new Error("LiveKit wsUrl not received");
        }

        setToken(resolvedToken);
        setWsUrl(resolvedWsUrl);
        setStep("room");
      } catch (err) {
        console.error("Error fetching token:", err);
        setError(
          err instanceof Error ? err.message : "Failed to connect to video call"
        );
        setStep("prejoin");
      }
    },
    [roomName]
  );

  const handleDisconnected = useCallback(() => {
    setToken("");
    setWsUrl("");
    setChoices(null);
    setStep("prejoin");
    onLeave?.();
  }, [onLeave]);

  const roomKey = useMemo(() => {
    return `${roomName}:${token}:${wsUrl}`;
  }, [roomName, token, wsUrl]);

  if (step === "prejoin") {
    return (
      <div className="flex h-[700px] items-center justify-center rounded-2xl bg-zinc-950 p-6">
        <div className="w-full max-w-4xl overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 shadow-xl">
          <div className="border-b border-zinc-800 px-6 py-4">
            <h2 className="text-xl font-semibold text-white">Videollamada</h2>
            <p className="mt-1 text-sm text-zinc-400">
              Configura tu cámara y micrófono antes de entrar.
            </p>
          </div>

          {error ? (
            <div className="mx-6 mt-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              <div className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            </div>
          ) : null}

          <div className="p-6">
            <div className="[&_.lk-prejoin]:!border-0 [&_.lk-prejoin]:!bg-transparent [&_.lk-button]:!rounded-xl">
              <PreJoin
                persistUserChoices={false}
                defaults={{
                  username: "Participant",
                  videoEnabled: true,
                  audioEnabled: true,
                  videoDeviceId:
                    "96cba597f5473c0fcb37c8a0a4836440914ac0c21e30537dd7440e6d58b8c527",
                }}
                onSubmit={handleSubmit}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (step === "loading") {
    return (
      <div className="flex h-[700px] items-center justify-center rounded-2xl bg-zinc-950">
        <div className="text-center text-white">
          <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin" />
          <p>Connecting to video call...</p>
        </div>
      </div>
    );
  }

  if (!token || !wsUrl) {
    return (
      <div className="flex h-[700px] items-center justify-center rounded-2xl bg-zinc-950 p-6">
        <div className="max-w-md text-center text-white">
          <AlertCircle className="mx-auto mb-4 h-10 w-10 text-red-500" />
          <p>No authentication token or LiveKit URL available.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[700px] overflow-hidden rounded-2xl bg-zinc-950">
      <LiveKitRoom
        key={roomKey}
        token={token}
        serverUrl={wsUrl}
        connect={true}
        video={choices?.videoEnabled ?? true}
        audio={choices?.audioEnabled ?? true}
        onDisconnected={handleDisconnected}
        onError={(err) => {
          console.error("LiveKitRoom error:", err);
          setError(err?.message || "Video room error");
        }}
        className="h-full rounded-2xl"
        options={{
          adaptiveStream: true,
          dynacast: true,
        }}
      >
        <div className="h-full [&_.lk-control-bar]:!bg-black/75 [&_.lk-control-bar]:!backdrop-blur [&_.lk-participant-tile]:!rounded-2xl">
          <VideoConference />
          <RoomAudioRenderer />
        </div>
      </LiveKitRoom>
    </div>
  );
}