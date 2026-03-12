"use client";

import { useState } from "react";
import { useRoomContext } from "@livekit/components-react";
import { Button } from "@/components/ui/button";
import { Hand } from "lucide-react";
import { ReactionsBar } from "./ReactionsBar";

export function RoomControls() {
  const [raisedHand, setRaisedHand] = useState(false);
  const room = useRoomContext();

  const handleRaiseHand = async () => {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(
        JSON.stringify({
          type: "raise_hand",
          raised: !raisedHand,
          from: room.localParticipant.identity,
          timestamp: Date.now(),
        })
      );

      await room.localParticipant.publishData(data, { reliable: true });
      setRaisedHand(!raisedHand);
    } catch (error) {
      console.error("Failed to raise hand:", error);
    }
  };

  return (
    <div className="flex items-center gap-4">
      <Button
        onClick={handleRaiseHand}
        variant={raisedHand ? "default" : "outline"}
        size="sm"
        className={raisedHand ? "bg-yellow-500 hover:bg-yellow-600" : ""}
      >
        <Hand className="mr-2 h-4 w-4" />
        {raisedHand ? "Lower Hand" : "Raise Hand"}
      </Button>
      <ReactionsBar />
    </div>
  );
}
