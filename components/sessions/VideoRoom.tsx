"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ConnectionState,
  createLocalTracks,
  LocalAudioTrack,
  LocalTrack,
  LocalVideoTrack,
  Participant,
  RemoteParticipant,
  Room,
  RoomEvent,
  Track,
  VideoPresets,
} from "livekit-client";
import {
  AlertCircle,
  Loader2,
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  Video,
  VideoOff,
} from "lucide-react";

interface VideoRoomProps {
  roomName: string;
  onLeave?: () => void;
  sessionId?: string;
}

type RemoteTrackEntry = {
  participantSid: string;
  participantIdentity: string;
  trackSid: string;
  kind: Track.Kind;
  track: Track;
};

function RemoteVideoTile({ entry }: { entry: RemoteTrackEntry }) {
  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement | null>(null);

  useEffect(() => {
    const el = mediaRef.current;
    if (!el) return;

    entry.track.attach(el);

    return () => {
      entry.track.detach(el);
    };
  }, [entry]);

  if (entry.kind === Track.Kind.Audio) {
    return <audio ref={mediaRef as React.RefObject<HTMLAudioElement>} autoPlay />;
  }

  return (
    <div className="relative min-h-[240px] overflow-hidden rounded-xl bg-black">
      <video
        ref={mediaRef as React.RefObject<HTMLVideoElement>}
        autoPlay
        playsInline
        className="h-full w-full object-cover"
      />
      <div className="absolute bottom-2 left-2 rounded bg-black/60 px-2 py-1 text-xs text-white">
        {entry.participantIdentity}
      </div>
    </div>
  );
}

export function VideoRoom({ roomName, onLeave }: VideoRoomProps) {
  const [room, setRoom] = useState<Room | null>(null);
  const [localTracks, setLocalTracks] = useState<LocalTrack[]>([]);
  const [remoteTracks, setRemoteTracks] = useState<RemoteTrackEntry[]>([]);

  const [isPreparing, setIsPreparing] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);
  const [error, setError] = useState("");

  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [microphoneEnabled, setMicrophoneEnabled] = useState(false);

  const localVideoTrack = useMemo(
    () =>
      localTracks.find(
        (track) => track.kind === Track.Kind.Video
      ) as LocalVideoTrack | undefined,
    [localTracks]
  );

  const localAudioTrack = useMemo(
    () =>
      localTracks.find(
        (track) => track.kind === Track.Kind.Audio
      ) as LocalAudioTrack | undefined,
    [localTracks]
  );

  const addRemoteTrack = useCallback((track: Track, participant: Participant) => {
    setRemoteTracks((prev) => {
      const exists = prev.some((item) => item.trackSid === track.sid);
      if (exists) return prev;

      return [
        ...prev,
        {
          participantSid: participant.sid,
          participantIdentity: participant.identity,
          trackSid: track.sid,
          kind: track.kind,
          track,
        },
      ];
    });
  }, []);

  const removeRemoteTrack = useCallback((track: Track) => {
    setRemoteTracks((prev) => prev.filter((item) => item.trackSid !== track.sid));
  }, []);

  const cleanupRoom = useCallback(() => {
    setRemoteTracks([]);
    setIsConnected(false);
    setHasJoined(false);

    setLocalTracks((prev) => {
      for (const track of prev) {
        try {
          track.stop();
        } catch {}
      }
      return [];
    });

    setRoom((prevRoom) => {
      if (prevRoom) {
        try {
          prevRoom.disconnect();
        } catch {}
      }
      return null;
    });

    setCameraEnabled(false);
    setMicrophoneEnabled(false);
    setError("");
  }, []);

  const joinRoom = useCallback(async () => {
    let createdRoom: Room | null = null;
    let createdTracks: LocalTrack[] = [];

    try {
      setIsPreparing(true);
      setError("");

      const tokenRes = await fetch("/api/livekit/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          roomName,
          participantName: "Participant",
        }),
      });

      const tokenData = await tokenRes.json().catch(() => ({}));

      if (!tokenRes.ok) {
        throw new Error(tokenData.error || "No se pudo obtener el token");
      }

      const resolvedToken = tokenData.token;
      const resolvedServerUrl =
        tokenData.wsUrl || process.env.NEXT_PUBLIC_LIVEKIT_URL || "";

      if (!resolvedToken) {
        throw new Error("El backend no devolvió token");
      }

      if (!resolvedServerUrl) {
        throw new Error("Falta la URL de LiveKit");
      }

      createdTracks = await createLocalTracks({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        },
        video: {
          resolution: VideoPresets.h720.resolution,
          facingMode: "user",
        },
      });

      const previewTrack = createdTracks.find(
        (t) => t.kind === Track.Kind.Video
      ) as LocalVideoTrack | undefined;

      const micTrack = createdTracks.find(
        (t) => t.kind === Track.Kind.Audio
      ) as LocalAudioTrack | undefined;

      setLocalTracks(createdTracks);

      if (previewTrack) {
        setCameraEnabled(true);
      }

      setMicrophoneEnabled(!!micTrack);

      createdRoom = new Room({
        adaptiveStream: true,
        dynacast: true,
      });

      createdRoom.on(RoomEvent.TrackSubscribed, (track, _pub, participant) => {
        addRemoteTrack(track, participant);
      });

      createdRoom.on(RoomEvent.TrackUnsubscribed, (track) => {
        removeRemoteTrack(track);
      });

      createdRoom.on(
        RoomEvent.ParticipantDisconnected,
        (participant: RemoteParticipant) => {
          setRemoteTracks((prev) =>
            prev.filter((item) => item.participantSid !== participant.sid)
          );
        }
      );

      createdRoom.on(RoomEvent.Disconnected, () => {
        setIsConnected(false);
        onLeave?.();
      });

      createdRoom.on(RoomEvent.ConnectionStateChanged, (state: ConnectionState) => {
        setIsConnected(state === ConnectionState.Connected);
      });

      await createdRoom.connect(resolvedServerUrl, resolvedToken);

      for (const track of createdTracks) {
        await createdRoom.localParticipant.publishTrack(track);
      }

      setRoom(createdRoom);
      setHasJoined(true);
    } catch (err) {
      console.error("Video setup error:", err);

      for (const track of createdTracks) {
        try {
          track.stop();
        } catch {}
      }

      if (createdRoom) {
        try {
          createdRoom.disconnect();
        } catch {}
      }

      let message = "No se pudo iniciar la videollamada";
      if (err instanceof Error) {
        if (err.name === "NotAllowedError") {
          message = "El navegador bloqueó el permiso de cámara o micrófono";
        } else if (err.name === "NotFoundError") {
          message = "No se encontró cámara o micrófono disponible";
        } else if (err.name === "NotReadableError") {
          message = "La cámara o el micrófono están siendo usados por otra app";
        } else {
          message = err.message;
        }
      }

      setError(message);
      setLocalTracks([]);
      setCameraEnabled(false);
      setMicrophoneEnabled(false);
      setRoom(null);
      setHasJoined(false);
    } finally {
      setIsPreparing(false);
    }
  }, [roomName, addRemoteTrack, removeRemoteTrack, onLeave]);

  useEffect(() => {
    return () => {
      cleanupRoom();
    };
  }, [cleanupRoom]);

  const toggleCamera = useCallback(async () => {
    try {
      if (!localVideoTrack) {
        setError("No existe track local de cámara");
        return;
      }

      setError("");

      if (cameraEnabled) {
        await localVideoTrack.mute();
        setCameraEnabled(false);
      } else {
        await localVideoTrack.unmute();
        setCameraEnabled(true);
      }
    } catch (err) {
      console.error("toggleCamera error:", err);
      setError(err instanceof Error ? err.message : "No se pudo cambiar la cámara");
    }
  }, [cameraEnabled, localVideoTrack]);

  const toggleMicrophone = useCallback(async () => {
    try {
      if (!localAudioTrack) {
        setError("No existe track local de micrófono");
        return;
      }

      setError("");

      if (microphoneEnabled) {
        await localAudioTrack.mute();
        setMicrophoneEnabled(false);
      } else {
        await localAudioTrack.unmute();
        setMicrophoneEnabled(true);
      }
    } catch (err) {
      console.error("toggleMicrophone error:", err);
      setError(err instanceof Error ? err.message : "No se pudo cambiar el micrófono");
    }
  }, [microphoneEnabled, localAudioTrack]);

  const leaveRoom = useCallback(() => {
    cleanupRoom();
    onLeave?.();
  }, [cleanupRoom, onLeave]);

  if (!hasJoined) {
    return (
      <div className="flex h-[600px] items-center justify-center rounded-2xl bg-zinc-950 p-6">
        <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-white shadow-xl">
          <h3 className="mb-2 text-xl font-semibold">Videollamada</h3>
          <p className="mb-6 text-sm text-zinc-300">
            Pulsa el botón para iniciar cámara, micrófono y conexión a la sala.
          </p>

          {error ? (
            <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
              {error}
            </div>
          ) : null}

          <button
            onClick={joinRoom}
            disabled={isPreparing}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPreparing ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Iniciando...
              </>
            ) : (
              <>
                <Phone className="h-5 w-5" />
                Entrar a la videollamada
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-[700px] w-full overflow-hidden rounded-2xl bg-zinc-950">
      <div className="absolute left-4 top-4 z-50 rounded-lg bg-black/70 px-3 py-2 text-sm text-white">
        connected: {String(isConnected)} | cam: {String(cameraEnabled)} | mic:{" "}
        {String(microphoneEnabled)}
      </div>

      {error ? (
        <div className="absolute right-4 top-4 z-50 max-w-sm rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        </div>
      ) : null}

      <div className="grid h-full grid-cols-1 gap-4 p-4 md:grid-cols-2">
        <div className="relative min-h-[300px] overflow-hidden rounded-2xl bg-black">
          <video
            ref={(el) => {
              if (!el || !localVideoTrack) return;
              localVideoTrack.attach(el);
            }}
            autoPlay
            playsInline
            muted
            className="h-full w-full object-cover"
          />
          <div className="absolute bottom-3 left-3 rounded bg-black/60 px-2 py-1 text-xs text-white">
            Tú
          </div>
        </div>

        <div className="grid auto-rows-fr gap-4 overflow-auto">
          {remoteTracks.filter((t) => t.kind === Track.Kind.Video).length === 0 ? (
            <div className="flex min-h-[300px] items-center justify-center rounded-2xl bg-zinc-900 text-zinc-400">
              Esperando participantes...
            </div>
          ) : (
            remoteTracks
              .filter((t) => t.kind === Track.Kind.Video)
              .map((entry) => <RemoteVideoTile key={entry.trackSid} entry={entry} />)
          )}
        </div>
      </div>

      {remoteTracks
        .filter((t) => t.kind === Track.Kind.Audio)
        .map((entry) => (
          <RemoteVideoTile key={entry.trackSid} entry={entry} />
        ))}

      <div className="absolute bottom-0 left-0 right-0 z-50 flex flex-wrap items-center justify-center gap-3 bg-black/75 p-4">
        <button
          onClick={toggleCamera}
          className={`flex items-center gap-2 rounded-full px-4 py-2 text-white transition ${
            cameraEnabled ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"
          }`}
        >
          {cameraEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
          {cameraEnabled ? "Cámara encendida" : "Cámara apagada"}
        </button>

        <button
          onClick={toggleMicrophone}
          className={`flex items-center gap-2 rounded-full px-4 py-2 text-white transition ${
            microphoneEnabled
              ? "bg-green-600 hover:bg-green-700"
              : "bg-red-600 hover:bg-red-700"
          }`}
        >
          {microphoneEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
          {microphoneEnabled ? "Micrófono encendido" : "Micrófono apagado"}
        </button>

        <button
          onClick={leaveRoom}
          className="flex items-center gap-2 rounded-full bg-zinc-700 px-4 py-2 text-white transition hover:bg-zinc-600"
        >
          <PhoneOff className="h-5 w-5" />
          Salir
        </button>
      </div>
    </div>
  );
}