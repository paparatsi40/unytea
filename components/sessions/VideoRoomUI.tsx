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
  ArrowLeft,
  Hand,
  LogOut,
  Mic,
  MicOff,
  Monitor,
  MoreVertical,
  Pencil,
  Radio,
  Settings,
  Video,
  VideoOff,
} from "lucide-react";
import Link from "next/link";

import { ModeSwitcher, SessionMode } from "./ModeSwitcher";
import { MainStage } from "./MainStage";
import { ParticipantsPanel } from "./ParticipantsPanel";
import { SessionChat } from "./SessionChat";
import { ReactionsBar } from "./ReactionsBar";

interface VideoRoomUIProps {
  sessionId?: string;
  sessionTitle?: string;
  sessionDescription?: string;
  onLeave?: () => void;
}

function ConnectionBadge() {
  const state = useConnectionState();

  const colors = {
    disconnected: "bg-red-500",
    connecting: "bg-yellow-500",
    connected: "bg-green-500",
    reconnecting: "bg-orange-500",
  };

  return (
    <div className="flex items-center gap-1.5 text-xs text-zinc-400">
      <span className={cn("h-2 w-2 rounded-full", colors[state] || "bg-gray-500")} />
      <span className="capitalize">{state}</span>
    </div>
  );
}

export function VideoRoomUI({
  sessionId,
  sessionTitle = "Weekly Coaching Session",
  sessionDescription = "Live now",
  onLeave,
}: VideoRoomUIProps) {
  const [mode, setMode] = useState<SessionMode>("video");
  const [activeTab, setActiveTab] = useState<"participants" | "chat">("participants");
  const [raisedHand, setRaisedHand] = useState(false);
  const [isLoadingCamera, setIsLoadingCamera] = useState(false);
  const [isLoadingMic, setIsLoadingMic] = useState(false);

  const room = useRoomContext();
  const participants = useParticipants();
  const localParticipantData = useLocalParticipant();
  const localParticipant = localParticipantData.localParticipant;
  const isCameraEnabled = localParticipantData.isCameraEnabled;
  const isMicrophoneEnabled = localParticipantData.isMicrophoneEnabled;
  const isScreenShareEnabled = localParticipantData.isScreenShareEnabled;

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
      {/* HEADER */}
      <header className="flex shrink-0 items-center justify-between border-b border-zinc-800 bg-zinc-900 px-4 py-3">
        {/* Left: Back */}
        <Link
          href="/dashboard/sessions"
          className="flex items-center gap-2 text-sm text-zinc-400 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to sessions</span>
        </Link>

        {/* Center: Session info */}
        <div className="flex flex-col items-center">
          <h1 className="text-sm font-semibold text-white">{sessionTitle}</h1>
          <p className="text-xs text-zinc-400">
            {sessionDescription} • {participants.length} participants
          </p>
        </div>

        {/* Right: Status + Leave */}
        <div className="flex items-center gap-3">
          <ConnectionBadge />
          <button
            onClick={onLeave}
            className="flex h-9 items-center gap-2 rounded-full border border-red-500/50 px-4 text-sm font-medium text-red-400 transition-all hover:bg-red-500/10"
          >
            <LogOut className="h-4 w-4" />
            Leave
          </button>
        </div>
      </header>

      {/* MODE SWITCHER */}
      <div className="flex shrink-0 items-center justify-between border-b border-zinc-800 bg-zinc-900 px-4 py-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-full border border-zinc-800 bg-zinc-950 p-1">
            <ModeSwitcher
              currentMode={mode}
              onModeChange={setMode}
              hasWhiteboard={!!sessionId}
              hasScreenShare={true}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Raise Hand */}
          <button
            onClick={handleRaiseHand}
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-full transition-all duration-200",
              raisedHand
                ? "bg-yellow-500 text-white shadow-lg hover:bg-yellow-600"
                : "border border-zinc-700 bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white"
            )}
            title={raisedHand ? "Lower Hand" : "Raise Hand"}
          >
            <Hand className="h-5 w-5" />
          </button>

          {/* Reactions */}
          <ReactionsBar />
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT - Main Stage Area */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {/* Stage Container */}
          <div className="flex-1 overflow-hidden p-4">
            <div className="relative h-full overflow-hidden rounded-2xl border border-zinc-800 bg-black shadow-2xl">
              {/* Badge flotante */}
              <div className="absolute left-4 top-4 z-20 flex items-center gap-2">
                <div className="flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-zinc-200 backdrop-blur-sm">
                  <Radio className="h-3.5 w-3.5 text-red-500" />
                  <span>
                    {mode === "video" && "Live video"}
                    {mode === "screen" && "Screen sharing"}
                    {mode === "whiteboard" && "Whiteboard mode"}
                  </span>
                </div>
              </div>

              {/* Main Stage */}
              <MainStage
                mode={mode}
                sessionId={sessionId}
                className="h-full"
              />
            </div>
          </div>

          {/* SPEAKER STRIP - cuando hay múltiples participantes con video */}
          {participants.filter((p) => p.isCameraEnabled).length > 1 && (
            <div className="flex shrink-0 gap-3 px-4 pb-2">
              {participants
                .filter((p) => p.isCameraEnabled)
                .slice(0, 4)
                .map((participant) => (
                  <div
                    key={participant.identity}
                    className="relative aspect-video w-48 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900"
                  >
                    <div className="absolute bottom-2 left-2 text-xs font-medium text-white">
                      {participant.identity}
                    </div>
                  </div>
                ))}
            </div>
          )}

          {/* BOTTOM CONTROLS */}
          <div className="flex shrink-0 items-center justify-center gap-2 border-t border-zinc-800 bg-zinc-900 px-4 py-3">
            {/* Microphone */}
            <button
              onClick={toggleMicrophone}
              disabled={isLoadingMic}
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-full transition-all duration-200 shadow-lg disabled:opacity-50",
                isMicrophoneEnabled
                  ? "bg-zinc-700 text-white hover:bg-zinc-600"
                  : "border-2 border-red-500/50 bg-red-500/20 text-red-400 hover:bg-red-500/30"
              )}
              title={isMicrophoneEnabled ? "Mute" : "Unmute"}
            >
              {isMicrophoneEnabled ? (
                <Mic className="h-5 w-5" />
              ) : (
                <MicOff className="h-5 w-5" />
              )}
            </button>

            {/* Camera */}
            <button
              onClick={toggleCamera}
              disabled={isLoadingCamera}
              className={cn(
                "flex items-center justify-center rounded-full transition-all duration-200 shadow-lg disabled:opacity-50",
                isCameraEnabled
                  ? "h-12 w-12 bg-zinc-700 text-white hover:bg-zinc-600"
                  : "h-14 w-14 border-4 border-purple-400 bg-purple-600 text-white hover:bg-purple-700"
              )}
              title={isCameraEnabled ? "Stop Camera" : "Start Camera"}
            >
              {isCameraEnabled ? (
                <Video className="h-5 w-5" />
              ) : (
                <VideoOff className="h-6 w-6" />
              )}
            </button>

            {/* Screen Share */}
            <button
              onClick={toggleScreenShare}
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-full border-2 transition-all duration-200 shadow-lg",
                isScreenShareEnabled
                  ? "border-green-500 bg-green-600 text-white hover:bg-green-700"
                  : "border-zinc-700 bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white"
              )}
              title={isScreenShareEnabled ? "Stop Sharing" : "Share Screen"}
            >
              <Monitor className="h-5 w-5" />
            </button>

            {/* Divider */}
            <div className="mx-2 h-8 w-px bg-zinc-700" />

            {/* Whiteboard Toggle (when in whiteboard mode) */}
            {mode === "whiteboard" && (
              <button
                onClick={() => setMode("video")}
                className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-zinc-700 bg-zinc-800 text-zinc-400 transition-all hover:bg-zinc-700 hover:text-white"
                title="Exit Whiteboard"
              >
                <Pencil className="h-5 w-5" />
              </button>
            )}

            {/* Settings */}
            <button className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-zinc-700 bg-zinc-800 text-zinc-400 transition-all hover:bg-zinc-700 hover:text-white">
              <Settings className="h-5 w-5" />
            </button>

            {/* More options */}
            <button className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-zinc-700 bg-zinc-800 text-zinc-400 transition-all hover:bg-zinc-700 hover:text-white">
              <MoreVertical className="h-5 w-5" />
            </button>

            {/* End Session */}
            <button
              onClick={onLeave}
              className="ml-2 flex h-12 items-center justify-center rounded-full border border-red-500/50 px-5 text-sm font-medium text-red-400 transition-all hover:bg-red-500/10"
            >
              End Session
            </button>
          </div>
        </div>

        {/* RIGHT SIDEBAR */}
        <div className="flex w-72 shrink-0 flex-col border-l border-zinc-800 bg-zinc-900">
          {/* Tabs */}
          <div className="flex border-b border-zinc-800">
            <button
              onClick={() => setActiveTab("participants")}
              className={cn(
                "flex-1 px-4 py-3 text-sm font-medium transition-colors duration-200",
                activeTab === "participants"
                  ? "border-b-2 border-purple-500 text-purple-400"
                  : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              Participants ({participants.length})
            </button>
            <button
              onClick={() => setActiveTab("chat")}
              className={cn(
                "flex-1 px-4 py-3 text-sm font-medium transition-colors duration-200",
                activeTab === "chat"
                  ? "border-b-2 border-purple-500 text-purple-400"
                  : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              Chat
            </button>
          </div>

          {/* Content */}
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
