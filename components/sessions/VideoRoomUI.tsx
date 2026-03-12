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

// Compact connection indicator
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
      <span className={cn("h-1.5 w-1.5 rounded-full", getColor())} />
      <span className="capitalize">{state}</span>
    </div>
  );
}

// Circular control button
function ControlButton({
  onClick,
  isActive,
  isLoading,
  activeIcon: ActiveIcon,
  inactiveIcon: InactiveIcon,
  activeClass = "bg-zinc-800 hover:bg-zinc-700 text-white",
  inactiveClass = "bg-white hover:bg-zinc-50 text-zinc-700 border border-zinc-300",
  title,
}: {
  onClick: () => void;
  isActive: boolean;
  isLoading: boolean;
  activeIcon: React.ComponentType<{ className?: string }>;
  inactiveIcon: React.ComponentType<{ className?: string }>;
  activeClass?: string;
  inactiveClass?: string;
  title: string;
}) {
  const Icon = isActive ? ActiveIcon : InactiveIcon;
  
  return (
    <button
      onClick={onClick}
      disabled={isLoading}
      title={title}
      className={cn(
        "flex h-10 w-10 items-center justify-center rounded-full transition-all shadow-sm disabled:opacity-50",
        isActive ? activeClass : inactiveClass
      )}
    >
      <Icon className="h-5 w-5" />
    </button>
  );
}

// Compact media controls
function MediaControls() {
  const localParticipant = useLocalParticipant();
  const [isLoadingCamera, setIsLoadingCamera] = useState(false);
  const [isLoadingMic, setIsLoadingMic] = useState(false);

  const isCameraEnabled = localParticipant.isCameraEnabled;
  const isMicrophoneEnabled = localParticipant.isMicrophoneEnabled;

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

  return (
    <div className="flex items-center gap-1.5">
      <ControlButton
        onClick={toggleMicrophone}
        isActive={isMicrophoneEnabled}
        isLoading={isLoadingMic}
        activeIcon={Mic}
        inactiveIcon={MicOff}
        title={isMicrophoneEnabled ? "Mute" : "Unmute"}
      />
      <ControlButton
        onClick={toggleCamera}
        isActive={isCameraEnabled}
        isLoading={isLoadingCamera}
        activeIcon={Video}
        inactiveIcon={VideoOff}
        title={isCameraEnabled ? "Stop Camera" : "Start Camera"}
      />
    </div>
  );
}

// Prompt to enable camera when off
function CameraPrompt({ onEnable }: { onEnable: () => void }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900/95 z-10">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-zinc-800">
          <Video className="h-10 w-10 text-zinc-400" />
        </div>
        <h3 className="mb-2 text-lg font-medium text-white">Your camera is off</h3>
        <p className="mb-6 text-sm text-zinc-400">Enable your camera to be seen by others</p>
        <button
          onClick={onEnable}
          className="flex items-center gap-2 rounded-full bg-purple-600 px-6 py-3 text-sm font-medium text-white transition-all hover:bg-purple-700"
        >
          <Video className="h-5 w-5" />
          Start Camera
        </button>
      </div>
    </div>
  );
}

// Prompt to start screen share
function ScreenSharePrompt({ onEnable, onCancel }: { onEnable: () => void; onCancel: () => void }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900/95 z-10">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-zinc-800">
          <Monitor className="h-10 w-10 text-zinc-400" />
        </div>
        <h3 className="mb-2 text-lg font-medium text-white">Share your screen</h3>
        <p className="mb-6 text-sm text-zinc-400">Choose what you want to share with others</p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={onEnable}
            className="flex items-center gap-2 rounded-full bg-purple-600 px-6 py-3 text-sm font-medium text-white transition-all hover:bg-purple-700"
          >
            <Monitor className="h-5 w-5" />
            Start Sharing
          </button>
          <button
            onClick={onCancel}
            className="flex items-center gap-2 rounded-full border border-zinc-600 bg-transparent px-6 py-3 text-sm font-medium text-zinc-300 transition-all hover:bg-zinc-800"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export function VideoRoomUI({ sessionId, onLeave }: VideoRoomUIProps) {
  const [mode, setMode] = useState<SessionMode>("video");
  const [activeTab, setActiveTab] = useState<"participants" | "chat">("participants");
  const [raisedHand, setRaisedHand] = useState(false);
  const [isLoadingCamera, setIsLoadingCamera] = useState(false);
  const [isLoadingScreen, setIsLoadingScreen] = useState(false);
  const room = useRoomContext();
  const participants = useParticipants();
  const localParticipant = useLocalParticipant();

  const isWhiteboardMode = mode === "whiteboard" && sessionId;
  const isScreenMode = mode === "screen";
  const isCameraEnabled = localParticipant.isCameraEnabled;
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

  const toggleScreenShare = async () => {
    setIsLoadingScreen(true);
    try {
      await localParticipant.localParticipant.setScreenShareEnabled(!isScreenSharing);
    } catch (error) {
      console.error("Failed to toggle screen share:", error);
    } finally {
      setIsLoadingScreen(false);
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
      {/* Compact Top Bar */}
      <div className="flex shrink-0 items-center justify-between border-b border-zinc-800 bg-zinc-900 px-3 py-2">
        <div className="flex items-center gap-3">
          <ConnectionBadge />
          <div className="h-4 w-px bg-zinc-700" />
          <ModeSwitcher
            currentMode={mode}
            onModeChange={setMode}
            hasWhiteboard={!!sessionId}
            hasScreenShare={true}
          />
        </div>
        
        <div className="flex items-center gap-2">
          <MediaControls />
          <div className="h-6 w-px bg-zinc-700 mx-1" />
          <button
            onClick={handleRaiseHand}
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-full transition-all",
              raisedHand 
                ? "bg-yellow-500 hover:bg-yellow-600 text-white" 
                : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
            )}
            title={raisedHand ? "Lower Hand" : "Raise Hand"}
          >
            <Hand className="h-5 w-5" />
          </button>
          <ReactionsBar />
          <div className="h-6 w-px bg-zinc-700 mx-1" />
          <button
            onClick={onLeave}
            className="flex h-10 items-center gap-2 rounded-full border border-red-500/50 bg-transparent px-4 text-sm font-medium text-red-400 transition-all hover:bg-red-500/10"
          >
            <LogOut className="h-4 w-4" />
            Leave
          </button>
        </div>
      </div>

      {/* Main Content - Video Dominates */}
      <div className="flex flex-1 overflow-hidden">
        {/* Video Area - Takes full available space */}
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
                  Exit Whiteboard
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
            <div className="relative flex-1 bg-zinc-950">
              <VideoConference 
                className="h-full w-full"
              />
              {/* Camera prompt in video mode */}
              {!isCameraEnabled && !isLoadingCamera && !isScreenMode && (
                <CameraPrompt onEnable={toggleCamera} />
              )}
              {/* Screen share prompt in screen mode */}
              {isScreenMode && !isScreenSharing && !isLoadingScreen && (
                <ScreenSharePrompt 
                  onEnable={toggleScreenShare} 
                  onCancel={() => setMode("video")}
                />
              )}
            </div>
          )}
        </div>

        {/* Right Sidebar */}
        {!isWhiteboardMode && (
          <div className="flex w-72 shrink-0 flex-col border-l border-zinc-800 bg-zinc-900">
            <div className="flex border-b border-zinc-800">
              <button
                onClick={() => setActiveTab("participants")}
                className={cn(
                  "flex-1 px-4 py-2.5 text-xs font-medium transition-colors",
                  activeTab === "participants"
                    ? "border-b-2 border-purple-500 text-purple-400"
                    : "text-zinc-400 hover:text-zinc-200"
                )}
              >
                Participants ({participants.length})
              </button>
              <button
                onClick={() => setActiveTab("chat")}
                className={cn(
                  "flex-1 px-4 py-2.5 text-xs font-medium transition-colors",
                  activeTab === "chat"
                    ? "border-b-2 border-purple-500 text-purple-400"
                    : "text-zinc-400 hover:text-zinc-200"
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
        )}
      </div>
    </div>
  );
}
