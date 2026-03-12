"use client";

import { useState } from "react";
import {
  useConnectionState,
  useLocalParticipant,
  useParticipants,
  useRoomContext,
} from "@livekit/components-react";
import { cn } from "@/lib/utils";
import {
  Hand,
  LogOut,
  Mic,
  MicOff,
  Monitor,
  Video,
  VideoOff,
} from "lucide-react";

import { ModeSwitcher, SessionMode } from "./ModeSwitcher";
import { MainStage } from "./MainStage";
import { ParticipantsPanel } from "./ParticipantsPanel";
import { SessionChat } from "./SessionChat";
import { ReactionsBar } from "./ReactionsBar";

interface VideoRoomUIProps {
  sessionId?: string;
  onLeave?: () => void;
}

function ConnectionBadge() {
  const state = useConnectionState();

  const getColor = () => {
    switch (state) {
      case "disconnected":
        return "bg-red-500";
      case "connecting":
        return "bg-yellow-500";
      case "connected":
        return "bg-green-500";
      case "reconnecting":
        return "bg-orange-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-400">
      <span className={cn("h-2 w-2 rounded-full", getColor())} />
      <span className="capitalize">{state}</span>
    </div>
  );
}

function StatusPill({
  icon: Icon,
  label,
  isActive,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  isActive: boolean;
}) {
  if (!isActive) return null;

  return (
    <div className="flex items-center gap-1.5 rounded-full bg-zinc-800 px-3 py-1 text-xs text-zinc-300">
      <Icon className="h-3.5 w-3.5" />
      <span>{label}</span>
    </div>
  );
}

export function VideoRoomUI({ sessionId, onLeave }: VideoRoomUIProps) {
  const [mode, setMode] = useState<SessionMode>("video");
  const [activeTab, setActiveTab] = useState<"participants" | "chat">(
    "participants",
  );
  const [raisedHand, setRaisedHand] = useState(false);
  const [isLoadingCamera, setIsLoadingCamera] = useState(false);
  const [isLoadingMic, setIsLoadingMic] = useState(false);

  const room = useRoomContext();
  const participants = useParticipants();
  const { localParticipant, isCameraEnabled, isMicrophoneEnabled, isScreenShareEnabled } =
    useLocalParticipant();

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

  const toggleScreenShare = async () => {
    try {
      await localParticipant.setScreenShareEnabled(!isScreenShareEnabled);
      if (!isScreenShareEnabled) {
        setMode("screen");
      } else if (mode === "screen") {
        setMode("video");
      }
    } catch (error) {
      console.error("Failed to toggle screen share:", error);
    }
  };

  const handleRaiseHand = async () => {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(
        JSON.stringify({
          type: "raise_hand",
          raised: !raisedHand,
          from: room.localParticipant.identity,
          timestamp: Date.now(),
        }),
      );
      await room.localParticipant.publishData(data, { reliable: true });
      setRaisedHand(!raisedHand);
    } catch (error) {
      console.error("Failed to raise hand:", error);
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-zinc-950">
      {/* TOP BAR */}
      <div className="flex shrink-0 items-center justify-between border-b border-zinc-800 bg-zinc-900 px-4 py-3">
        <div className="flex items-center gap-4">
          <ConnectionBadge />
          <div className="h-4 w-px bg-zinc-700" />
          <ModeSwitcher
            currentMode={mode}
            onModeChange={setMode}
            hasWhiteboard={!!sessionId}
            hasScreenShare={true}
          />
          <div className="flex items-center gap-2">
            <StatusPill icon={Video} label="Camera On" isActive={isCameraEnabled} />
            <StatusPill
              icon={Monitor}
              label="Sharing"
              isActive={isScreenShareEnabled}
            />
          </div>
        </div>

        <button
          onClick={onLeave}
          className="flex h-9 items-center gap-2 rounded-full border border-red-500/50 bg-transparent px-4 text-sm font-medium text-red-400 transition-all hover:bg-red-500/10"
        >
          <LogOut className="h-4 w-4" />
          Leave
        </button>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-950/80 px-4 py-3">
            <div>
              <h2 className="text-lg font-semibold text-white">Live Session</h2>
              <p className="text-xs text-zinc-500">
                {mode === "video"
                  ? "Camera-first mode"
                  : mode === "screen"
                    ? "Presentation mode"
                    : "Collaborative whiteboard mode"}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleRaiseHand}
                className={cn(
                  "flex h-10 items-center gap-2 rounded-full px-4 text-sm font-medium transition-all",
                  raisedHand
                    ? "bg-yellow-500 text-white hover:bg-yellow-600"
                    : "border border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800",
                )}
              >
                <Hand className="h-4 w-4" />
                {raisedHand ? "Lower hand" : "Raise hand"}
              </button>

              <ReactionsBar />
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-hidden p-4">
            <MainStage mode={mode} sessionId={sessionId} className="h-full" />
          </div>

          {/* BOTTOM CONTROLS */}
          <div className="flex shrink-0 items-center justify-center gap-3 border-t border-zinc-800 bg-zinc-900 px-4 py-3">
            <button
              onClick={toggleMicrophone}
              disabled={isLoadingMic}
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-full transition-all shadow-lg disabled:opacity-50",
                isMicrophoneEnabled
                  ? "bg-zinc-700 text-white hover:bg-zinc-600"
                  : "border-2 border-red-500/50 bg-red-500/20 text-red-400 hover:bg-red-500/30",
              )}
              title={isMicrophoneEnabled ? "Mute" : "Unmute"}
            >
              {isMicrophoneEnabled ? (
                <Mic className="h-6 w-6" />
              ) : (
                <MicOff className="h-6 w-6" />
              )}
            </button>

            <button
              onClick={toggleCamera}
              disabled={isLoadingCamera}
              className={cn(
                "flex items-center justify-center rounded-full transition-all shadow-lg disabled:opacity-50",
                isCameraEnabled
                  ? "h-12 w-12 bg-zinc-700 text-white hover:bg-zinc-600"
                  : "h-14 w-14 animate-pulse border-4 border-purple-400 bg-purple-600 text-white hover:bg-purple-700",
              )}
              title={isCameraEnabled ? "Stop Camera" : "Start Camera"}
            >
              {isCameraEnabled ? (
                <Video className="h-6 w-6" />
              ) : (
                <VideoOff className="h-7 w-7" />
              )}
            </button>

            <button
              onClick={toggleScreenShare}
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-full transition-all shadow-lg",
                isScreenShareEnabled
                  ? "bg-green-600 text-white hover:bg-green-700"
                  : "border-2 border-zinc-600 bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white",
              )}
              title={isScreenShareEnabled ? "Stop Sharing" : "Share Screen"}
            >
              <Monitor className="h-6 w-6" />
            </button>

            <div className="mx-1 h-8 w-px bg-zinc-700" />

            <button
              onClick={onLeave}
              className="flex h-12 items-center justify-center rounded-full border border-red-500/50 px-5 text-sm font-medium text-red-400 transition-all hover:bg-red-500/10"
            >
              <LogOut className="mr-2 h-5 w-5" />
              End
            </button>
          </div>
        </div>

        {/* RIGHT SIDEBAR */}
        <div className="flex w-72 shrink-0 flex-col border-l border-zinc-800 bg-zinc-900">
          <div className="flex border-b border-zinc-800">
            <button
              onClick={() => setActiveTab("participants")}
              className={cn(
                "flex-1 px-4 py-3 text-xs font-medium transition-colors",
                activeTab === "participants"
                  ? "border-b-2 border-purple-500 bg-zinc-800/50 text-purple-400"
                  : "text-zinc-500 hover:bg-zinc-800/30 hover:text-zinc-300",
              )}
            >
              Participants ({participants.length})
            </button>
            <button
              onClick={() => setActiveTab("chat")}
              className={cn(
                "flex-1 px-4 py-3 text-xs font-medium transition-colors",
                activeTab === "chat"
                  ? "border-b-2 border-purple-500 bg-zinc-800/50 text-purple-400"
                  : "text-zinc-500 hover:bg-zinc-800/30 hover:text-zinc-300",
              )}
            >
              Chat
            </button>
          </div>

          <div className="flex-1 overflow-hidden">
            {activeTab === "participants" ? (
              <ParticipantsPanel />
            ) : sessionId ? (
              <SessionChat sessionId={sessionId} />
            ) : (
              <div className="flex h-full items-center justify-center">
                <p className="text-xs text-zinc-500">Chat not available</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
