"use client";

import { useEffect, useMemo, useState } from "react";
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
  useLocalParticipant,
  useConnectionState,
} from "@livekit/components-react";
import "@livekit/components-styles";
import {
  Loader2,
  Presentation,
  AlertCircle,
  Video,
  VideoOff,
  Mic,
  MicOff,
} from "lucide-react";
import { ConnectionState } from "livekit-client";
import { SessionWhiteboard } from "./SessionWhiteboard";

function VideoRoomContent({
  sessionId,
  showWhiteboard,
  setShowWhiteboard,
}: {
  sessionId?: string;
  showWhiteboard: boolean;
  setShowWhiteboard: (v: boolean) => void;
}) {
  const { localParticipant } = useLocalParticipant();
  const connectionState = useConnectionState();
  const [isLoadingDevice, setIsLoadingDevice] = useState(false);
  const [error, setError] = useState("");

  const isConnected = connectionState === ConnectionState.Connected;
  const cameraEnabled = localParticipant?.isCameraEnabled ?? false;
  const microphoneEnabled = localParticipant?.isMicrophoneEnabled ?? false;

  const getReadableError = (err: unknown) => {
    if (err instanceof Error) {
      if (err.name === "NotAllowedError") {
        return "El navegador bloqueó el permiso de cámara/micrófono.";
      }
      if (err.name === "NotFoundError") {
        return "No se encontró una cámara o micrófono disponible.";
      }
      if (err.name === "NotReadableError") {
        return "La cámara o el micrófono ya están siendo usados por otra aplicación.";
      }
      return err.message;
    }
    return "No se pudo acceder al dispositivo.";
  };

  const toggleCamera = async () => {
    if (!localParticipant) {
      setError("El participante local aún no está listo.");
      return;
    }

    if (!isConnected) {
      setError("La sala aún no está conectada.");
      return;
    }

    setIsLoadingDevice(true);
    setError("");

    try {
      await localParticipant.setCameraEnabled(!cameraEnabled);
    } catch (err) {
      console.error("Camera error:", err);
      setError(getReadableError(err));
    } finally {
      setIsLoadingDevice(false);
    }
  };

  const toggleMicrophone = async () => {
    if (!localParticipant) {
      setError("El participante local aún no está listo.");
      return;
    }

    if (!isConnected) {
      setError("La sala aún no está conectada.");
      return;
    }

    setIsLoadingDevice(true);
    setError("");

    try {
      await localParticipant.setMicrophoneEnabled(!microphoneEnabled);
    } catch (err) {
      console.error("Microphone error:", err);
      setError(getReadableError(err));
    } finally {
      setIsLoadingDevice(false);
    }
  };

  return (
    <>
      <div className="absolute bottom-0 left-0 right-0 z-50 flex flex-wrap items-center justify-center gap-4 bg-black/80 p-4">
        <button
          onClick={toggleCamera}
          disabled={isLoadingDevice || !localParticipant || !isConnected}
          className={`flex items-center gap-2 rounded-full px-4 py-2 font-medium transition-all ${
            cameraEnabled
              ? "bg-green-600 text-white hover:bg-green-700"
              : "bg-red-600 text-white hover:bg-red-700"
          } disabled:cursor-not-allowed disabled:opacity-50`}
        >
          {cameraEnabled ? (
            <Video className="h-5 w-5" />
          ) : (
            <VideoOff className="h-5 w-5" />
          )}
          {cameraEnabled ? "Camera On" : "Camera Off"}
        </button>

        <button
          onClick={toggleMicrophone}
          disabled={isLoadingDevice || !localParticipant || !isConnected}
          className={`flex items-center gap-2 rounded-full px-4 py-2 font-medium transition-all ${
            microphoneEnabled
              ? "bg-green-600 text-white hover:bg-green-700"
              : "bg-red-600 text-white hover:bg-red-700"
          } disabled:cursor-not-allowed disabled:opacity-50`}
        >
          {microphoneEnabled ? (
            <Mic className="h-5 w-5" />
          ) : (
            <MicOff className="h-5 w-5" />
          )}
          {microphoneEnabled ? "Mic On" : "Mic Off"}
        </button>

        {error && <span className="text-sm text-red-400">{error}</span>}
      </div>

      <div className="flex h-full flex-col pb-16">
        <div className="relative flex-1">
          <VideoConference />
        </div>
        <RoomAudioRenderer />
      </div>

      <button
        onClick={() => setShowWhiteboard(!showWhiteboard)}
        className={`absolute bottom-24 right-4 z-50 flex items-center gap-2 rounded-full px-4 py-2 font-medium shadow-xl transition-all hover:scale-105 ${
          showWhiteboard
            ? "bg-purple-600 text-white hover:bg-purple-700"
            : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-100"
        }`}
      >
        <Presentation className="h-5 w-5" />
        {showWhiteboard ? "Close Whiteboard" : "Open Whiteboard"}
      </button>

      {sessionId && (
        <SessionWhiteboard
          isOpen={showWhiteboard}
          onClose={() => setShowWhiteboard(false)}
          sessionId={sessionId}
        />
      )}
    </>
  );
}

interface VideoRoomProps {
  roomName: string;
  onLeave?: () => void;
  sessionId?: string;
}

export function VideoRoom({ roomName, onLeave, sessionId }: VideoRoomProps) {
  const [token, setToken] = useState("");
  const [serverUrl, setServerUrl] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [showWhiteboard, setShowWhiteboard] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function getToken() {
      try {
        setIsLoading(true);
        setError("");

        const response = await fetch("/api/livekit/token", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            roomName,
            participantName: "Participant",
          }),
        });

        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(payload.error || `Failed to get token: ${response.status}`);
        }

        if (!payload.token) {
          throw new Error("No token received from server");
        }

        const resolvedServerUrl =
          payload.wsUrl || process.env.NEXT_PUBLIC_LIVEKIT_URL || "";

        if (!resolvedServerUrl) {
          throw new Error(
            "Missing LiveKit URL. Set LIVEKIT_URL on server and NEXT_PUBLIC_LIVEKIT_URL on client."
          );
        }

        if (!mounted) return;

        setToken(payload.token);
        setServerUrl(resolvedServerUrl);
      } catch (err) {
        console.error("Error getting token:", err);
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "Failed to join video room");
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    getToken();

    return () => {
      mounted = false;
    };
  }, [roomName]);

  const normalizedServerUrl = useMemo(() => {
    if (!serverUrl) return "";
    return serverUrl.trim();
  }, [serverUrl]);

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
        <div className="max-w-md px-4 text-center">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-destructive" />
          <p className="mb-2 text-lg font-semibold text-destructive">
            Video Connection Failed
          </p>
          <p className="mb-4 text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (!token || !normalizedServerUrl) {
    return (
      <div className="flex h-[600px] items-center justify-center rounded-xl bg-card">
        <div className="text-center">
          <AlertCircle className="mx-auto mb-4 h-8 w-8 text-destructive" />
          <p className="text-destructive">No authentication token or server URL available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-[600px] w-full overflow-hidden rounded-xl bg-card">
      <LiveKitRoom
        token={token}
        serverUrl={normalizedServerUrl}
        connect={true}
        video={false}
        audio={false}
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
        <VideoRoomContent
          sessionId={sessionId}
          showWhiteboard={showWhiteboard}
          setShowWhiteboard={setShowWhiteboard}
        />
      </LiveKitRoom>
    </div>
  );
}
