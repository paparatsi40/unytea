"use client";

import { useMemo } from "react";
import { useRoomContext } from "@livekit/components-react";
import { Track } from "livekit-client";
import {
  Video as VideoIcon,
  VideoOff,
  Mic,
  MicOff,
  PhoneOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  sessionId?: string;
};

export function VideoRoomContent({}: Props) {
  const room = useRoomContext();

  const publications = Array.from(room.localParticipant.trackPublications.values());

  const isCameraOn = useMemo(() => {
    return publications.some(
      (p) => p.source === Track.Source.Camera && !p.isMuted
    );
  }, [publications]);

  const isMicOn = useMemo(() => {
    return publications.some(
      (p) => p.source === Track.Source.Microphone && !p.isMuted
    );
  }, [publications]);

  const toggleCamera = async () => {
    try {
      await room.localParticipant.setCameraEnabled(!isCameraOn);
    } catch (e) {
      console.error("Failed to toggle camera:", e);
    }
  };

  const toggleMic = async () => {
    try {
      await room.localParticipant.setMicrophoneEnabled(!isMicOn);
    } catch (e) {
      console.error("Failed to toggle mic:", e);
    }
  };

  const handleLeave = async () => {
    try {
      await room.disconnect();
    } catch (e) {
      console.error("Failed to disconnect room:", e);
    }
  };

  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      <div className="pointer-events-auto absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-2xl bg-black/75 px-4 py-3 shadow-xl backdrop-blur">
        <Button
          onClick={toggleCamera}
          variant={isCameraOn ? "default" : "outline"}
          size="sm"
        >
          {isCameraOn ? (
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
          onClick={toggleMic}
          variant={isMicOn ? "default" : "outline"}
          size="sm"
        >
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

        <Button onClick={handleLeave} variant="destructive" size="sm">
          <PhoneOff className="mr-2 h-4 w-4" />
          Leave
        </Button>
      </div>
    </div>
  );
}
