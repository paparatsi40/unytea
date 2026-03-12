"use client";

import { useState } from "react";
import { VideoConference, useConnectionState, useParticipants, useLocalParticipant } from "@livekit/components-react";
import { ModeSwitcher, SessionMode } from "./ModeSwitcher";
import { ParticipantsPanel } from "./ParticipantsPanel";
import { SessionChat } from "./SessionChat";
import { SessionWhiteboard } from "./SessionWhiteboard";
import { cn } from "@/lib/utils";
import { LogOut, Hand, Video, VideoOff, Mic, MicOff, Monitor } from "lucide-react";
import { ReactionsBar } from "./ReactionsBar";
import { useRoomContext } from "@livekit/components-react";

interface VideoRoomUIProps {
  sessionId?: string;
  onLeave?: () => void;
}

// Connection indicator - top left
function ConnectionBadge() {
  const state = useConnectionState();
  
  const getColor = () => {
    switch (state) {
      case "disconnected": return "bg-red-500";
      case "connecting": return "bg-yellow-500";
      case "connected": return "bg-green-500";
      case "reconnecting": return "bg-orange-500";
      default: return "bg-gray-500";
    }
  };

  return (
    <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-400">
      <span className={cn("h-2 w-2 rounded-full", getColor())} />
      <span className="capitalize">{state}</span>
    </div>
  );
}

// Status pill showing what's active
function StatusPill({ icon: Icon, label, isActive }: { icon: any, label: string, isActive: boolean }) {
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
  const [activeTab, setActiveTab] = useState<"participants" | "chat">("participants");
  const [raisedHand, setRaisedHand] = useState(false);
  const [isLoadingCamera, setIsLoadingCamera] = useState(false);
  const [isLoadingMic, setIsLoadingMic] = useState(false);
  const room = useRoomContext();
  const participants = useParticipants();
  const localParticipant = useLocalParticipant();

  const isWhiteboardMode = mode === "whiteboard" && sessionId;
  const isCameraEnabled = localParticipant.isCameraEnabled;
  const isMicrophoneEnabled = localParticipant.isMicrophoneEnabled;
  const isScreenSharing = localParticipant.isScreenShareEnabled;

  const toggleCamera = async () => {
    setIsLoadingCamera(true);
    try {
      await localParticipant.localParticipant.setCameraEnabled(!isCameraEnabled);
    } catch (error) {
      console.error("Failed to toggle camera:", error);
    } finally {
      setIsLoadingCamera(false);
    }
  };

  const toggleMicrophone = async () => {
    setIsLoadingMic(true);
    try {
      await localParticipant.localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled);
    } catch (error) {
      console.error("Failed to toggle microphone:", error);
    } finally {
      setIsLoadingMic(false);
    }
  };

  const toggleScreenShare = async () => {
    try {
      await localParticipant.localParticipant.setScreenShareEnabled(!isScreenSharing);
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
        })
      );
      await room.localParticipant.publishData(data, { reliable: true });
      setRaisedHand(!raisedHand);
    } catch (error) {
      console.error("Failed to raise hand:", error);
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-zinc-950">
      {/* ========== TOP BAR ========== */}
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
          {/* Status indicators */}
          <div className="flex items-center gap-2">
            <StatusPill icon={Video} label="Camera On" isActive={isCameraEnabled} />
            <StatusPill icon={Monitor} label="Sharing" isActive={isScreenSharing} />
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

      {/* ========== MAIN CONTENT ========== */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT: Video/Screen/Whiteboard Area */}
        <div className="relative flex flex-1 overflow-hidden">
          {isWhiteboardMode ? (
            <div className="flex flex-1 flex-col overflow-hidden">
              <div className="flex items-center justify-between border-b border-zinc-800 bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-2">
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
                  Back to Video
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                <SessionWhiteboard
                  onClose={() => setMode("video")}
                  sessionId={sessionId!}
                  embedded={true}
                />
              </div>
            </div>
          ) : (
            <div className="relative flex flex-1 flex-col">
              {/* Video Area */}
              <div className="relative flex-1 overflow-hidden">
                <VideoConference className="h-full w-full" />
                
                {/* Camera off indicator - prominent */}
                {!isCameraEnabled && (
                  <div className="absolute bottom-24 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 rounded-2xl bg-zinc-900/95 px-8 py-6 border border-purple-500/50 shadow-2xl">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-purple-600">
                      <Video className="h-8 w-8 text-white" />
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-semibold text-white">Camera is off</p>
                      <p className="text-sm text-zinc-400 mt-1">Click the purple button below ↓</p>
                    </div>
                  </div>
                )}
              </div>
              
              {/* BOTTOM CONTROLS BAR - Always visible */}
              <div className="flex shrink-0 items-center justify-center gap-3 border-t border-zinc-800 bg-zinc-900 px-4 py-3">
                {/* Microphone */}
                <button
                  onClick={toggleMicrophone}
                  disabled={isLoadingMic}
                  className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-full transition-all shadow-lg disabled:opacity-50",
                    isMicrophoneEnabled 
                      ? "bg-zinc-700 text-white hover:bg-zinc-600" 
                      : "bg-red-500/20 text-red-400 border-2 border-red-500/50 hover:bg-red-500/30"
                  )}
                  title={isMicrophoneEnabled ? "Mute" : "Unmute"}
                >
                  {isMicrophoneEnabled ? <Mic className="h-6 w-6" /> : <MicOff className="h-6 w-6" />}
                </button>

                {/* Camera - HIGH VISIBILITY when off */}
                <button
                  onClick={toggleCamera}
                  disabled={isLoadingCamera}
                  className={cn(
                    "flex items-center justify-center rounded-full transition-all shadow-lg disabled:opacity-50",
                    isCameraEnabled 
                      ? "h-12 w-12 bg-zinc-700 text-white hover:bg-zinc-600" 
                      : "h-14 w-14 bg-purple-600 text-white border-4 border-purple-400 hover:bg-purple-700 animate-pulse"
                  )}
                  title={isCameraEnabled ? "Stop Camera" : "Start Camera"}
                >
                  {isCameraEnabled ? <Video className="h-6 w-6" /> : <VideoOff className="h-7 w-7" />}
                </button>

                {/* Screen Share - Only in Screen mode or Video mode */}
                {(mode === "screen" || mode === "video") && (
                  <button
                    onClick={toggleScreenShare}
                    className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-full transition-all shadow-lg",
                      isScreenSharing 
                        ? "bg-green-600 text-white hover:bg-green-700" 
                        : "bg-zinc-800 text-zinc-400 border-2 border-zinc-600 hover:bg-zinc-700 hover:text-white"
                    )}
                    title={isScreenSharing ? "Stop Sharing" : "Share Screen"}
                  >
                    <Monitor className="h-6 w-6" />
                  </button>
                )}

                {/* Divider */}
                <div className="h-8 w-px bg-zinc-700 mx-1" />

                {/* Raise Hand */}
                <button
                  onClick={handleRaiseHand}
                  className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-full transition-all shadow-lg",
                    raisedHand 
                      ? "bg-yellow-500 text-white hover:bg-yellow-600" 
                      : "bg-zinc-800 text-zinc-400 border-2 border-zinc-600 hover:bg-zinc-700 hover:text-white"
                  )}
                  title={raisedHand ? "Lower Hand" : "Raise Hand"}
                >
                  <Hand className="h-6 w-6" />
                </button>

                {/* Reactions */}
                <div className="flex items-center gap-1">
                  <ReactionsBar />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: Sidebar - Participants & Chat */}
        {!isWhiteboardMode && (
          <div className="flex w-72 shrink-0 flex-col border-l border-zinc-800 bg-zinc-900">
            {/* Tabs */}
            <div className="flex border-b border-zinc-800">
              <button
                onClick={() => setActiveTab("participants")}
                className={cn(
                  "flex-1 px-4 py-3 text-xs font-medium transition-colors",
                  activeTab === "participants"
                    ? "border-b-2 border-purple-500 text-purple-400 bg-zinc-800/50"
                    : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/30"
                )}
              >
                Participants ({participants.length})
              </button>
              <button
                onClick={() => setActiveTab("chat")}
                className={cn(
                  "flex-1 px-4 py-3 text-xs font-medium transition-colors",
                  activeTab === "chat"
                    ? "border-b-2 border-purple-500 text-purple-400 bg-zinc-800/50"
                    : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/30"
                )}
              >
                Chat
              </button>
            </div>
            {/* Tab Content */}
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
        )}
      </div>
    </div>
  );
}
