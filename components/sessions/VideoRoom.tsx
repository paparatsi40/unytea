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
import { AlertCircle, Loader2, PhoneOff } from "lucide-react";

interface VideoRoomProps {
  roomName: string;
  onLeave?: () => void;
  sessionId?: string;
}

type JoinState = "prejoin" | "connecting" | "joined";

export function VideoRoom({ roomName, onLeave }: VideoRoomProps) {
  const [joinState, setJoinState] = useState<JoinState>("prejoin");
  const [token, setToken] = useState("");
  const [serverUrl, setServerUrl] = useState("");
  const [error, setError] = useState("");
  const [choices, setChoices] = useState<LocalUserChoices | null>(null);

  const handlePreJoinSubmit = useCallback(
    async (values: LocalUserChoices) => {
      try {
        setError("");
        setJoinState("connecting");
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

        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(payload.error || "No se pudo obtener el token");
        }

        const resolvedToken =
          typeof payload.token === "string" ? payload.token.trim() : "";
        const resolvedServerUrl =
          typeof payload.wsUrl === "string" && payload.wsUrl.trim()
            ? payload.wsUrl.trim()
            : (process.env.NEXT_PUBLIC_LIVEKIT_URL ?? "").trim();

        if (!resolvedToken) {
          throw new Error("El backend no devolvió token");
        }

        if (!resolvedServerUrl) {
          throw new Error("Falta la URL de LiveKit");
        }

        setToken(resolvedToken);
        setServerUrl(resolvedServerUrl);
        setJoinState("joined");
      } catch (err) {
        console.error("PreJoin error:", err);
        setError(
          err instanceof Error ? err.message : "No se pudo iniciar la videollamada"
        );
        setJoinState("prejoin");
      }
    },
    [roomName]
  );

  const handleCancel = useCallback(() => {
    setError("");
    setChoices(null);
    setJoinState("prejoin");
    setToken("");
    setServerUrl("");
  }, []);

  const handleDisconnected = useCallback(() => {
    setJoinState("prejoin");
    setToken("");
    setServerUrl("");
    setChoices(null);
    onLeave?.();
  }, [onLeave]);

  const roomKey = useMemo(() => {
    return `${roomName}:${token}:${serverUrl}`;
  }, [roomName, token, serverUrl]);

  if (joinState !== "joined") {
    return (
      <div className="flex h-[700px] items-center justify-center rounded-2xl bg-zinc-950 p-6">
        <div className="w-full max-w-3xl overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 shadow-xl">
          <div className="border-b border-zinc-800 px-6 py-4">
            <h2 className="text-xl font-semibold text-white">Videollamada</h2>
            <p className="mt-1 text-sm text-zinc-400">
              Configura tu cámara y micrófono antes de entrar a la sala.
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
            {joinState === "connecting" ? (
              <div className="flex min-h-[420px] items-center justify-center rounded-2xl bg-black text-white">
                <div className="text-center">
                  <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin" />
                  <p>Conectando a la videollamada...</p>
                </div>
              </div>
            ) : (
              <div className="[&_.lk-prejoin]:!border-0 [&_.lk-prejoin]:!bg-transparent [&_.lk-button]:!rounded-xl">
                <PreJoin
                  defaults={{
                    username: "Participant",
                    videoEnabled: true,
                    audioEnabled: true,
                  }}
                  onSubmit={handlePreJoinSubmit}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-[700px] w-full overflow-hidden rounded-2xl bg-zinc-950">
      {error ? (
        <div className="absolute right-4 top-4 z-50 max-w-sm rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        </div>
      ) : null}

      <LiveKitRoom
        key={roomKey}
        token={token}
        serverUrl={serverUrl}
        connect={true}
        audio={choices?.audioEnabled ?? true}
        video={choices?.videoEnabled ?? true}
        options={{
          adaptiveStream: true,
          dynacast: true,
        }}
        onDisconnected={handleDisconnected}
        onError={(err) => {
          console.error("LiveKitRoom error:", err);
          setError(err?.message || "Ocurrió un error en la videollamada");
        }}
        className="h-full"
      >
        <div className="h-full [&_.lk-control-bar]:!bg-black/75 [&_.lk-control-bar]:!backdrop-blur [&_.lk-participant-tile]:!rounded-2xl">
          <VideoConference />
          <RoomAudioRenderer />
        </div>

        <button
          onClick={handleCancel}
          className="absolute bottom-24 right-4 z-50 flex items-center gap-2 rounded-full bg-zinc-700 px-4 py-2 text-white transition hover:bg-zinc-600"
        >
          <PhoneOff className="h-5 w-5" />
          Salir
        </button>
      </LiveKitRoom>
    </div>
  );
}