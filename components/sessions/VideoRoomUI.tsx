"use client";

import { useState } from "react";
import { VideoConference, useConnectionState } from "@livekit/components-react";
import { ModeSwitcher, SessionMode } from "./ModeSwitcher";
import { ParticipantsPanel } from "./ParticipantsPanel";
import { SessionChat } from "./SessionChat";
import { SessionWhiteboard } from "./SessionWhiteboard";
import { RoomControls } from "./RoomControls";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

interface VideoRoomUIProps {
  sessionId?: string;
  onLeave?: () => void;
}

function ConnectionBadge() {
  const state = useConnectionState();
  
  const getColor = (s: typeof state) => {
    switch (s) {
      case "disconnected": return "bg-red-500";
      case "connecting": return "bg-yellow-500";
      case "connected": return "bg-green-500";
      case "reconnecting": return "bg-orange-500";
      default: return "bg-gray-500";
    }
  };

  return (
    <div className="flex items-center gap-2 rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-medium">
      <span className={cn("h-2 w-2 rounded-full", getColor(state))} />
      <span className="capitalize text-zinc-700">{state}</span>
    </div>
  );
}

export function VideoRoomUI({ sessionId, onLeave }: VideoRoomUIProps) {
  const [mode, setMode] = useState<SessionMode>("video");

  const isWhiteboardMode = mode === "whiteboard" && sessionId;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Top Control Bar */}
      <div className="flex shrink-0 items-center justify-between border-b border-zinc-200 bg-white px-4 py-3">
        <div className="flex items-center gap-4">
          <ConnectionBadge />
          <ModeSwitcher
            currentMode={mode}
            onModeChange={setMode}
            hasWhiteboard={!!sessionId}
            hasScreenShare={true}
          />
        </div>
        <div className="flex items-center gap-4">
          <RoomControls />
          <Button
            onClick={onLeave}
            variant="destructive"
            size="sm"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Leave Session
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left/Main Area - VideoConference or Whiteboard */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {isWhiteboardMode ? (
            <div className="flex flex-1 flex-col overflow-hidden">
              {/* Whiteboard Header */}
              <div className="flex items-center justify-between border-b border-zinc-200 bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white">Whiteboard</span>
                  <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs text-white">
                    Session {sessionId?.slice(-6)}
                  </span>
                </div>
                <button
                  onClick={() => setMode("video")}
                  className="rounded-lg bg-white/20 px-3 py-1.5 text-sm text-white transition-colors hover:bg-white/30"
                >
                  Exit Whiteboard
                </button>
              </div>
              {/* Whiteboard Canvas */}
              <div className="flex-1 overflow-hidden">
                <SessionWhiteboard
                  onClose={() => setMode("video")}
                  sessionId={sessionId!}
                  embedded={true}
                />
              </div>
            </div>
          ) : (
            <div className="relative flex-1 overflow-hidden">
              <VideoConference />
            </div>
          )}
        </div>

        {/* Right Sidebar - Participants & Chat */}
        <div
          className={cn(
            "flex w-80 shrink-0 flex-col border-l border-zinc-200 bg-white",
            isWhiteboardMode && "hidden"
          )}
        >
          {/* Participants Panel */}
          <div className="flex flex-1 flex-col overflow-hidden border-b border-zinc-200">
            <ParticipantsPanel />
          </div>

          {/* Chat Panel */}
          <div className="flex flex-1 flex-col overflow-hidden">
            {sessionId ? (
              <SessionChat sessionId={sessionId} />
            ) : (
              <div className="flex h-full items-center justify-center">
                <p className="text-sm text-zinc-500">Chat not available</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
