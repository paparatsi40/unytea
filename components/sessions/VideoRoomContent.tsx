"use client";

import { useState } from "react";
import { useRoomContext } from "@livekit/components-react";
import { PresentationIcon, X } from "lucide-react";
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

  const handleToggleHand = () => {
    if (isHandRaised) lowerHand();
    else raiseHand();
  };

  return (
    <>
      {/* Content Panel Toggle - top left */}
      <div className="absolute top-4 left-4 z-10">
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

      {/* Hand Raise Queue - top right (adjust position if content panel is open) */}
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
