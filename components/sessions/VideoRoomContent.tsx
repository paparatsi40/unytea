"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SessionWhiteboard } from "./SessionWhiteboard";

interface VideoRoomContentProps {
  sessionId?: string;
}

export function VideoRoomContent({ sessionId }: VideoRoomContentProps) {
  const [showWhiteboard, setShowWhiteboard] = useState(false);

  return (
    <>
      <div className="absolute bottom-6 left-1/2 z-50 flex -translate-x-1/2 gap-4">
        {sessionId && (
          <Button
            onClick={() => setShowWhiteboard(!showWhiteboard)}
            variant={showWhiteboard ? "default" : "outline"}
          >
            {showWhiteboard ? "Hide Whiteboard" : "Show Whiteboard"}
          </Button>
        )}
      </div>

      {sessionId && showWhiteboard && (
        <SessionWhiteboard
          onClose={() => setShowWhiteboard(false)}
          sessionId={sessionId}
        />
      )}
    </>
  );
}
