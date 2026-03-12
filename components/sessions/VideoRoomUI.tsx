"use client";

import { useState } from "react";
import { VideoConference, useConnectionState, useParticipants, useLocalParticipant } from "@livekit/components-react";
import { ModeSwitcher, SessionMode } from "./ModeSwitcher";
import { ParticipantsPanel } from "./ParticipantsPanel";
import { SessionChat } from "./SessionChat";
import { SessionWhiteboard } from "./SessionWhiteboard";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LogOut, Hand, Video, VideoOff, Mic, MicOff } from "lucide-react";
import { ReactionsBar } from "./ReactionsBar";
import { useRoomContext, useSpeakingParticipants } from "@livekit/components-react";
interface VideoRoomUIProps {
  sessionId?: string;
  onLeave?: () => void;
}

function ConnectionBadge({ mode }: { mode: SessionMode }) {
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

  const getModeLabel = (m: SessionMode) => {
    switch (m) {
      case "video": return "Video";
      case "screen": return "Screen";
      case "whiteboard": return "Whiteboard";
    }
  };

  return (
    <div className="flex items-center gap-2 text-sm">
      <div className="flex items-center gap-2 rounded-full bg-zinc-100 px-3 py-1.5 font-medium">
        <span className={cn("h-2 w-2 rounded-full", getColor(state))} />
        <span className="capitalize text-zinc-700">{state}</span>
      </div>
      <span className="text-zinc-400">•</span>
      <span className="font-medium text-zinc-900">{getModeLabel(mode)} Mode</span>
    </div>
  );
}

// Circular control button like Zoom
function ControlButton({
  onClick,
  isActive,
  isLoading,
  activeIcon: ActiveIcon,
  inactiveIcon: InactiveIcon,
  activeLabel,
  inactiveLabel,
  activeClass = "bg-zinc-800 hover:bg-zinc-700 text-white",
  inactiveClass = "bg-white hover:bg-zinc-50 text-zinc-700 border border-zinc-300",
}: {
  onClick: () => void;
  isActive: boolean;
  isLoading: boolean;
  activeIcon: React.ComponentType<{ className?: string }>;
  inactiveIcon: React.ComponentType<{ className?: string }>;
  activeLabel: string;
  inactiveLabel: string;
  activeClass?: string;
  inactiveClass?: string;
}) {
  const Icon = isActive ? ActiveIcon : InactiveIcon;
  const label = isActive ? activeLabel : inactiveLabel;
  
  return (
    <button
      onClick={onClick}
      disabled={isLoading}
      className={cn(
        "flex flex-col items-center gap-1 transition-all",
        isActive ? activeClass : inactiveClass,
        "rounded-full p-3 shadow-sm disabled:opacity-50"
      )}
      title={label}
    >
      <Icon className="h-5 w-5" />
    </button>
  );
}

function MediaControls() {
  const localParticipant = useLocalParticipant();
  const [isLoadingCamera, setIsLoadingCamera] = useState(false);
  const [isLoadingMic, setIsLoadingMic] = useState(false);

  const isCameraEnabled = localParticipant.isCameraEnabled;
  const isMicrophoneEnabled = localParticipant.isMicrophoneEnabled;

  const toggleCamera = async () => {
    setIsLoadingCamera(true);
    try {
      await localParticipant.setCameraEnabled(!isCameraEnabled);
    } catch (error) {
      console.error("Failed to toggle camera:", error);
    } finally {
      setIsLoadingCamera(false);
    }
  };

  const toggleMicrophone = async () => {
    setIsLoadingMic(true);
    try {
      await localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled);
    } catch (error) {
      console.error("Failed to toggle microphone:", error);
    } finally {
      setIsLoadingMic(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <ControlButton
        onClick={toggleMicrophone}
        isActive={isMicrophoneEnabled}
        isLoading={isLoadingMic}
        activeIcon={Mic}
        inactiveIcon={MicOff}
        activeLabel="Mute"
        inactiveLabel="Unmute"
      />
      <ControlButton
        onClick={toggleCamera}
        isActive={isCameraEnabled}
        isLoading={isLoadingCamera}
        activeIcon={Video}
        inactiveIcon={VideoOff}
        activeLabel="Stop Camera"
        inactiveLabel="Start Camera"
      />
    </div>
  );
}

function SpeakerIndicator({ identity }: { identity: string }) {
  const speakingParticipants = useSpeakingParticipants();
  const isSpeaking = speakingParticipants.some(p => p.identity === identity);
  
  if (!isSpeaking) return null;
  
  return (
    <span className="ml-2 rounded-full bg-green-500 px-2 py-0.5 text-xs font-medium text-white">
      speaking
    </span>
  );
}

export function VideoRoomUI({ sessionId, onLeave }: VideoRoomUIProps) {
  const [mode, setMode] = useState<SessionMode>("video");
  const [activeTab, setActiveTab] = useState<"participants" | "chat">("participants");
  const [raisedHand, setRaisedHand] = useState(false);
  const room = useRoomContext();
  const participants = useParticipants();

  const isWhiteboardMode = mode === "whiteboard" && sessionId;

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
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Top Control Bar - Compact */}
      <div className="flex shrink-0 items-center justify-between border-b border-zinc-200 bg-white px-4 py-2">
        <div className="flex items-center gap-4">
          <ConnectionBadge mode={mode} />
          <ModeSwitcher
            currentMode={mode}
            onModeChange={setMode}
            hasWhiteboard={!!sessionId}
            hasScreenShare={true}
          />
        </div>
        <div className="flex items-center gap-3">
          <MediaControls />
          <div className="h-8 w-px bg-zinc-200" />
          <Button
            onClick={handleRaiseHand}
            variant={raisedHand ? "default" : "outline"}
            size="sm"
            className={cn(
              "rounded-full px-4",
              raisedHand ? "bg-yellow-500 hover:bg-yellow-600" : ""
            )}
          >
            <Hand className="mr-2 h-4 w-4" />
            {raisedHand ? "Lower" : "Raise"}
          </Button>
          <ReactionsBar />
          <div className="h-8 w-px bg-zinc-200" />
          <Button
            onClick={onLeave}
            variant="destructive"
            size="sm"
            className="rounded-full px-4"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Leave
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

        {/* Right Sidebar - Tabs for Participants & Chat */}
        <div
          className={cn(
            "flex w-80 shrink-0 flex-col border-l border-zinc-200 bg-white",
            isWhiteboardMode && "hidden"
          )}
        >
          {/* Tabs Header */}
          <div className="flex border-b border-zinc-200">
            <button
              onClick={() => setActiveTab("participants")}
              className={cn(
                "flex-1 px-4 py-3 text-sm font-medium transition-colors",
                activeTab === "participants"
                  ? "border-b-2 border-purple-600 text-purple-600"
                  : "text-zinc-500 hover:text-zinc-700"
              )}
            >
              Participants ({participants.length})
            </button>
            <button
              onClick={() => setActiveTab("chat")}
              className={cn(
                "flex-1 px-4 py-3 text-sm font-medium transition-colors",
                activeTab === "chat"
                  ? "border-b-2 border-purple-600 text-purple-600"
                  : "text-zinc-500 hover:text-zinc-700"
              )}
            >
              Chat
            </button>
          </div>

          {/* Tab Content with Speaker Indicator */}
          <div className="flex-1 overflow-hidden">
            {activeTab === "participants" ? (
              <ParticipantsPanel />
            ) : sessionId ? (
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
