"use client";

import { useMemo, useState } from "react";
import { useRoomContext } from "@livekit/components-react";
import { Track } from "livekit-client";
import {
  PresentationIcon,
  X,
  Video as VideoIcon,
  VideoOff,
  Mic,
  MicOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScreenShareControl } from "./ScreenShareControl";
import { HandRaiseButton } from "./HandRaiseButton";
import { HandRaiseQueue } from "./HandRaiseQueue";
import { ContentPanel } from "./ContentPanel";
import { useHandRaise } from "@/hooks/use-hand-raise";

type Props = {
  sessionId: string;
  isModerator: boolean;
};

export function VideoRoomContent({ sessionId, isModerator }: Props) {
  const room = useRoomContext();
  const { queue, isHandRaised, raiseHand, lowerHand, clearAllHands } = useHandRaise(room);

  const [showContentPanel, setShowContentPanel] = useState(false);
  const [contentPanelFullscreen, setContentPanelFullscreen] = useState(false);

  // Detect if camera/mic are currently enabled by checking active publications
  const isCameraOn = useMemo(() => {
    const pubs = Array.from(room.localParticipant.trackPublications.values());
    return pubs.some((p) => p.source === Track.Source.Camera && !p.isMuted);
  }, [room.localParticipant.trackPublications]);

  const isMicOn = useMemo(() => {
    const pubs = Array.from(room.localParticipant.trackPublications.values());
    return pubs.some((p) => p.source === Track.Source.Microphone && !p.isMuted);
  }, [room.localParticipant.trackPublications]);

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

  const handleToggleHand = () => {
    if (isHandRaised) lowerHand();
    else raiseHand();
  };

  return (
    <>
      {/* Top controls */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
        <Button
          onClick={() => setShowContentPanel((v) => !v)}
          variant={showContentPanel ? "default" : "outline"}
          size="sm"
          className="shadow-lg"
        >
          {showContentPanel ? (
            <>
              <X className="h-4 w-4 mr-2" />
              Hide Content
            </>
          ) : (
            <>
              <PresentationIcon className="h-4 w-4 mr-2" />
              Show Content
            </>
          )}
        </Button>

        {/* Explicit Camera/Mic toggles */}
        <Button
          onClick={toggleCamera}
          variant={isCameraOn ? "default" : "outline"}
          size="sm"
          className="shadow-lg"
        >
          {isCameraOn ? (
            <>
              <VideoOff className="h-4 w-4 mr-2" />
              Stop Camera
            </>
          ) : (
            <>
              <VideoIcon className="h-4 w-4 mr-2" />
              Start Camera
            </>
          )}
        </Button>

        <Button
          onClick={toggleMic}
          variant={isMicOn ? "default" : "outline"}
          size="sm"
          className="shadow-lg"
        >
          {isMicOn ? (
            <>
              <MicOff className="h-4 w-4 mr-2" />
              Mute
            </>
          ) : (
            <>
              <Mic className="h-4 w-4 mr-2" />
              Unmute
            </>
          )}
        </Button>
      </div>

      {/* Content Panel - single mount */}
      {showContentPanel && (
        <div
          className={`z-50 bg-white shadow-2xl ${
            contentPanelFullscreen
              ? "fixed inset-0"
              : "absolute top-0 right-0 h-full w-1/2"
          }`}
        >
          <ContentPanel
            sessionId={sessionId}
            isModerator={isModerator}
            isFullscreen={contentPanelFullscreen}
            onToggleFullscreen={() => setContentPanelFullscreen((v) => !v)}
          />
        </div>
      )}

      {/* Screen Share Control - bottom right */}
      <div className="absolute bottom-4 right-4 z-10">
        <ScreenShareControl />
      </div>

      {/* Hand Raise Button - bottom right, above screen share */}
      <div className="absolute bottom-16 right-4 z-10">
        <HandRaiseButton isRaised={isHandRaised} onToggle={handleToggleHand} />
      </div>

      {/* Hand Raise Queue - top right */}
      <div
        className={`absolute top-4 z-10 transition-all ${
          showContentPanel && !contentPanelFullscreen ? "right-[calc(50%+1rem)]" : "right-4"
        }`}
      >
        <HandRaiseQueue
          queue={queue}
          onLowerHand={lowerHand}
          onClearAll={clearAllHands}
          isModerator={isModerator}
        />
      </div>
    </>
  );
}
