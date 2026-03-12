"use client";

import { useState } from "react";
import { useRoomContext } from "@livekit/components-react";
import { Button } from "@/components/ui/button";
import { Hand } from "lucide-react";
import { ParticipantsPanel } from "./ParticipantsPanel";
import { SessionChat } from "./SessionChat";
import { ModeSwitcher, SessionMode } from "./ModeSwitcher";
import { ReactionsBar } from "./ReactionsBar";
import { SessionWhiteboard } from "./SessionWhiteboard";

interface VideoRoomContentProps {
  sessionId?: string;
}

export function VideoRoomContent({ sessionId }: VideoRoomContentProps) {
  const [mode, setMode] = useState<SessionMode>("video");
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

  // Show whiteboard overlay when in whiteboard mode
  if (mode === "whiteboard" && sessionId) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col">
        <div className="flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-3">
          <div className="flex items-center gap-4">
            <ModeSwitcher
              currentMode={mode}
              onModeChange={setMode}
              hasWhiteboard={!!sessionId}
              hasScreenShare={true}
            />
            <Button
              onClick={handleRaiseHand}
              variant={raisedHand ? "default" : "outline"}
              size="sm"
              className={raisedHand ? "bg-yellow-500 hover:bg-yellow-600" : ""}
            >
              <Hand className="mr-2 h-4 w-4" />
              {raisedHand ? "Lower Hand" : "Raise Hand"}
            </Button>
          </div>
          <div className="flex items-center gap-4">
            <ReactionsBar />
          </div>
        </div>
        <div className="flex flex-1">
          <div className="flex-1">
            <SessionWhiteboard
              onClose={() => setMode("video")}
              sessionId={sessionId}
            />
          </div>
          <div className="w-80 flex flex-col">
            <div className="flex-1">
              <ParticipantsPanel />
            </div>
            <div className="flex-1">
              {sessionId ? (
                <SessionChat sessionId={sessionId} />
              ) : (
                <div className="flex h-full items-center justify-center bg-white">
                  <p className="text-sm text-zinc-500">Chat not available</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Default: show sidebar alongside VideoConference
  return (
    <div className="absolute inset-0 flex">
      {/* Main area - VideoConference will render here */}
      <div className="flex-1" />
      
      {/* Sidebar overlay */}
      <div className="w-80 flex flex-col gap-4 p-4 bg-white/95 border-l border-zinc-200">
        {/* Top Controls */}
        <div className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-3 shadow-sm">
          <ModeSwitcher
            currentMode={mode}
            onModeChange={setMode}
            hasWhiteboard={!!sessionId}
            hasScreenShare={true}
          />
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

        {/* Participants */}
        <div className="flex-1 min-h-0">
          <ParticipantsPanel />
        </div>

        {/* Chat */}
        <div className="flex-1 min-h-0">
          {sessionId ? (
            <SessionChat sessionId={sessionId} />
          ) : (
            <div className="flex h-full items-center justify-center rounded-xl border border-zinc-200 bg-white">
              <p className="text-sm text-zinc-500">Chat not available</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
