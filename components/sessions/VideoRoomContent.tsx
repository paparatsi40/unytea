"use client";

import { useState } from "react";
import { useRoomContext, useLocalParticipant } from "@livekit/components-react";
import { Button } from "@/components/ui/button";
import { Hand } from "lucide-react";
import { SessionLayout, SessionMain, SessionSidebar } from "./SessionLayout";
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
  const localParticipant = useLocalParticipant();

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
    <div className="flex flex-col gap-4">
      {/* Top Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-zinc-200 bg-white p-3 shadow-sm">
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

      {/* Main Layout */}
      <SessionLayout>
        <SessionMain>
          {/* Content Area based on mode */}
          <div className="relative flex-1 rounded-xl border border-zinc-200 bg-zinc-950 overflow-hidden">
            {mode === "whiteboard" && sessionId ? (
              <SessionWhiteboard
                onClose={() => setMode("video")}
                sessionId={sessionId}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-white">
                <p className="text-lg text-zinc-400">
                  {mode === "video" && "Video mode active - use LiveKit controls below"}
                  {mode === "screen" && "Screen sharing active"}
                </p>
              </div>
            )}
          </div>
        </SessionMain>

        <SessionSidebar>
          {/* Participants */}
          <div className="flex h-1/2 flex-col">
            <ParticipantsPanel />
          </div>

          {/* Chat */}
          <div className="flex h-1/2 flex-col">
            {sessionId ? (
              <SessionChat sessionId={sessionId} />
            ) : (
              <div className="flex h-full items-center justify-center rounded-xl border border-zinc-200 bg-white">
                <p className="text-sm text-zinc-500">Chat not available</p>
              </div>
            )}
          </div>
        </SessionSidebar>
      </SessionLayout>
    </div>
  );
}
