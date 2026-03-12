"use client";

import { useMemo } from "react";
import { useRoomContext, useConnectionState } from "@livekit/components-react";
import { Track, ConnectionState } from "livekit-client";
import { Button } from "@/components/ui/button";
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
} from "lucide-react";

export function VideoRoomContent() {
  const room = useRoomContext();
  const connectionState = useConnectionState();

  const isCameraOn = useMemo(() => {
    const pubs = Array.from(room.localParticipant.trackPublications.values());
    return pubs.some(
      (p) => p.source === Track.Source.Camera && !p.isMuted
    );
  }, [room.localParticipant.trackPublications]);

  const isMicOn = useMemo(() => {
    const pubs = Array.from(room.localParticipant.trackPublications.values());
    return pubs.some(
      (p) => p.source === Track.Source.Microphone && !p.isMuted
    );
  }, [room.localParticipant.trackPublications]);

  const toggleCamera = async () => {
    if (connectionState !== ConnectionState.Connected) {
      console.warn("Room not connected yet");
      return;
    }

    try {
      await room.localParticipant.setCameraEnabled(!isCameraOn);
    } catch (e) {
      console.error("Camera toggle failed:", e);
    }
  };

  const toggleMic = async () => {
    if (connectionState !== ConnectionState.Connected) {
      console.warn("Room not connected yet");
      return;
    }

    try {
      await room.localParticipant.setMicrophoneEnabled(!isMicOn);
    } catch (e) {
      console.error("Mic toggle failed:", e);
    }
  };

  return (
    <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-4">
      <Button onClick={toggleCamera}>
        {isCameraOn ? (
          <>
            <VideoOff className="mr-2 h-4 w-4" />
            Stop Camera
          </>
        ) : (
          <>
            <Video className="mr-2 h-4 w-4" />
            Start Camera
          </>
        )}
      </Button>

      <Button onClick={toggleMic}>
        {isMicOn ? (
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
    </div>
  );
}