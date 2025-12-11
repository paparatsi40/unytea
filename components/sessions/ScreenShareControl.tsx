"use client";

import { useState, useEffect } from "react";
import { useRoomContext } from "@livekit/components-react";
import { Button } from "@/components/ui/button";
import { Monitor, MonitorOff, Loader2 } from "lucide-react";
import { 
  startScreenShare, 
  stopScreenShare, 
  isScreenSharing,
  isScreenShareSupported 
} from "@/lib/livekit/screen-share";

interface ScreenShareControlProps {
  className?: string;
}

export function ScreenShareControl({ className }: ScreenShareControlProps) {
  const room = useRoomContext();
  const [isSharing, setIsSharing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSupported, setIsSupported] = useState(true);

  useEffect(() => {
    // Check browser support
    setIsSupported(isScreenShareSupported());

    // Update state when screen share changes
    const updateState = () => {
      setIsSharing(isScreenSharing(room));
    };

    room.on("trackPublished", updateState);
    room.on("trackUnpublished", updateState);

    return () => {
      room.off("trackPublished", updateState);
      room.off("trackUnpublished", updateState);
    };
  }, [room]);

  const handleToggleScreenShare = async () => {
    setIsLoading(true);

    try {
      if (isSharing) {
        await stopScreenShare(room);
      } else {
        await startScreenShare(room);
      }
    } catch (error) {
      console.error("Error toggling screen share:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isSupported) {
    return null;
  }

  return (
    <Button
      variant={isSharing ? "default" : "outline"}
      size="sm"
      onClick={handleToggleScreenShare}
      disabled={isLoading}
      className={className}
      title={isSharing ? "Stop sharing screen" : "Share screen"}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isSharing ? (
        <>
          <MonitorOff className="h-4 w-4 mr-2" />
          Stop Sharing
        </>
      ) : (
        <>
          <Monitor className="h-4 w-4 mr-2" />
          Share Screen
        </>
      )}
    </Button>
  );
}
