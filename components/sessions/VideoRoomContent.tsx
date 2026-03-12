"use client";

import { useEffect, useMemo, useState } from "react";
import { useRoomContext, useConnectionState } from "@livekit/components-react";
import { LocalParticipant, ParticipantEvent, RoomEvent, Track, ConnectionState as LKConnectionState } from "livekit-client";
import {
  Mic,
  MicOff,
  PhoneOff,
  Presentation,
  Video as VideoIcon,
  VideoOff,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SessionWhiteboard } from "./SessionWhiteboard";

type Props = {
  sessionId?: string;
  onLeave?: () => void;
};

export function VideoRoomContent({ sessionId, onLeave }: Props) {
  const room = useRoomContext();
  const connectionState = useConnectionState();

  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [microphoneEnabled, setMicrophoneEnabled] = useState(false);
  const [isBusy, setIsBusy] = useState(false);

  const isConnected = connectionState === LKConnectionState.Connected;

  const syncTrackState = useMemo(() => {
    return () => {
      const publications = Array.from(
        room.localParticipant.trackPublications.values()
      );

      const camOn = publications.some(
        (p) => p.source === Track.Source.Camera && !p.isMuted
      );

      const micOn = publications.some(
        (p) => p.source === Track.Source.Microphone && !p.isMuted
      );

      setCameraEnabled(camOn);
      setMicrophoneEnabled(micOn);
    };
  }, [room]);

  useEffect(() => {
    syncTrackState();

    const localParticipant = room.localParticipant as LocalParticipant;

    const update = () => {
      syncTrackState();
    };

    room.on(RoomEvent.LocalTrackPublished, update);
    room.on(RoomEvent.LocalTrackUnpublished, update);
    room.on(RoomEvent.TrackMuted, update);
    room.on(RoomEvent.TrackUnmuted, update);

    localParticipant.on(ParticipantEvent.TrackPublished, update);
    localParticipant.on(ParticipantEvent.TrackUnpublished, update);
    localParticipant.on(ParticipantEvent.TrackMuted, update);
    localParticipant.on(ParticipantEvent.TrackUnmuted, update);

    return () => {
      room.off(RoomEvent.LocalTrackPublished, update);
      room.off(RoomEvent.LocalTrackUnpublished, update);
      room.off(RoomEvent.TrackMuted, update);
      room.off(RoomEvent.TrackUnmuted, update);

      localParticipant.off(ParticipantEvent.TrackPublished, update);
      localParticipant.off(ParticipantEvent.TrackUnpublished, update);
      localParticipant.off(ParticipantEvent.TrackMuted, update);
      localParticipant.off(ParticipantEvent.TrackUnmuted, update);
    };
  }, [room, syncTrackState]);

  const toggleCamera = async () => {
    if (!isConnected) {
      console.warn("Cannot toggle camera: room not connected. State:", connectionState);
      return;
    }
    try {
      setIsBusy(true);
      await room.localParticipant.setCameraEnabled(!cameraEnabled);
      syncTrackState();
    } catch (error) {
      console.error("Failed to toggle camera:", error);
    } finally {
      setIsBusy(false);
    }
  };

  const toggleMicrophone = async () => {
    if (!isConnected) {
      console.warn("Cannot toggle microphone: room not connected. State:", connectionState);
      return;
    }
    try {
      setIsBusy(true);
      await room.localParticipant.setMicrophoneEnabled(!microphoneEnabled);
      syncTrackState();
    } catch (error) {
      console.error("Failed to toggle microphone:", error);
    } finally {
      setIsBusy(false);
    }
  };

  const leaveRoom = async () => {
    try {
      await room.disconnect();
    } catch (error) {
      console.error("Failed to disconnect room:", error);
    } finally {
      onLeave?.();
    }
  };

  return (
    <>
      <div className="pointer-events-none absolute inset-0 z-20">
        <div className="pointer-events-auto absolute top-4 left-4 flex flex-wrap items-center gap-2">
          {/* Connection Status */}
          <div className={`rounded px-2 py-1 text-xs font-medium shadow-lg ${
            isConnected 
              ? "bg-green-500 text-white" 
              : connectionState === LKConnectionState.Connecting 
                ? "bg-yellow-500 text-white" 
                : "bg-red-500 text-white"
          }`}>
            {isConnected ? "Connected" : connectionState === LKConnectionState.Connecting ? "Connecting..." : "Disconnected"}
          </div>
          
          {sessionId ? (
            <Button
              onClick={() => setShowWhiteboard((prev) => !prev)}
              variant={showWhiteboard ? "default" : "outline"}
              size="sm"
              className="shadow-lg"
            >
              {showWhiteboard ? (
                <>
                  <X className="mr-2 h-4 w-4" />
                  Hide Whiteboard
                </>
              ) : (
                <>
                  <Presentation className="mr-2 h-4 w-4" />
                  Show Whiteboard
                </>
              )}
            </Button>
          ) : null}
        </div>

        <div className="pointer-events-auto absolute bottom-4 left-1/2 flex -translate-x-1/2 flex-wrap items-center justify-center gap-3 rounded-2xl bg-black/75 px-4 py-3 shadow-xl backdrop-blur">
          <Button
            onClick={toggleCamera}
            variant={cameraEnabled ? "default" : "outline"}
            size="sm"
            disabled={isBusy || !isConnected}
            className="shadow-lg"
            title={!isConnected ? "Wait for connection" : undefined}
          >
            {cameraEnabled ? (
              <>
                <VideoOff className="mr-2 h-4 w-4" />
                Stop Camera
              </>
            ) : (
              <>
                <VideoIcon className="mr-2 h-4 w-4" />
                Start Camera
              </>
            )}
          </Button>

          <Button
            onClick={toggleMicrophone}
            variant={microphoneEnabled ? "default" : "outline"}
            size="sm"
            disabled={isBusy || !isConnected}
            className="shadow-lg"
            title={!isConnected ? "Wait for connection" : undefined}
          >
            {microphoneEnabled ? (
              <>
                <MicOff className="mr-2 h-4 w-4" />
                Mute
              </>
            ) : (
              <>
                <Mic className="mr-2 h-4 w-4" />
                Unmute
              </>
            )}
          </Button>

          <Button
            onClick={leaveRoom}
            variant="destructive"
            size="sm"
            className="shadow-lg"
          >
            <PhoneOff className="mr-2 h-4 w-4" />
            Leave
          </Button>
        </div>
      </div>

      {sessionId && showWhiteboard ? (
        <SessionWhiteboard
          onClose={() => setShowWhiteboard(false)}
          sessionId={sessionId}
        />
      ) : null}
    </>
  );
}