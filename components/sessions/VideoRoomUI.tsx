"use client";

import { useState, useEffect, useCallback } from "react";
import {
  useLocalParticipant,
  useParticipants,
} from "@livekit/components-react";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Hand,
  LogOut,
  Mic,
  MicOff,
  Monitor,
  Radio,
  Video,
  VideoOff,
  Users,
  MessageSquare,
  FileText,
  Crown,
  Pin,
  Smile,
  Clock,
  X,
  ChevronDown,
  ChevronUp,
  UserPlus,
  VolumeX,
} from "lucide-react";
import Link from "next/link";

import { MainStage } from "./MainStage";
import { SessionChat } from "./SessionChat";
import { SessionNotesEditor } from "./SessionNotesEditor";
import { ReactionsBar } from "./ReactionsBar";

// Types
type PanelTab = "notes" | "chat" | "participants";

interface RaiseHandRequest {
  id: string;
  identity: string;
  name: string;
  avatar?: string;
  timestamp: number;
}

interface PinnedQuestion {
  id: string;
  author: string;
  content: string;
  timestamp: number;
}

interface VideoRoomUIProps {
  sessionId?: string;
  sessionMode?: "video" | "audio";
  sessionTitle?: string;
  hostName?: string;
  hostAvatar?: string;
  isHost?: boolean;
  attendeeCount?: number;
  sessionStartTime?: Date;
  onLeave?: () => void;
  onEndSession?: () => void;
}

export function VideoRoomUI({
  sessionId,
  sessionMode = "video",
  sessionTitle = "Weekly Community Q&A",
  hostName = "Host",
  hostAvatar,
  isHost = false,
  attendeeCount = 47,
  sessionStartTime = new Date(),
  onLeave,
  onEndSession,
}: VideoRoomUIProps) {
  const isAudioOnly = sessionMode === "audio";
  
  // Room context
  const participants = useParticipants();
  const localParticipantData = useLocalParticipant();
  const localParticipant = localParticipantData.localParticipant;
  const isCameraEnabled = localParticipantData.isCameraEnabled;
  const isMicrophoneEnabled = localParticipantData.isMicrophoneEnabled;
  const isScreenShareEnabled = localParticipantData.isScreenShareEnabled;

  // Active panel (for mobile/responsive)
  const [activePanel, setActivePanel] = useState<PanelTab>("chat");
  const [showAllPanels, setShowAllPanels] = useState(true);

  // Raise hand system
  const [raisedHands, setRaisedHands] = useState<RaiseHandRequest[]>([]);
  const [hasRaisedHand, setHasRaisedHand] = useState(false);
  const [showHandQueue, setShowHandQueue] = useState(false);

  // Pinned question
  const [pinnedQuestion, setPinnedQuestion] = useState<PinnedQuestion | null>(null);

  // Recording
  const isRecording = true;

  // Reactions
  const [showReactions, setShowReactions] = useState(false);

  // Session duration
  const [elapsedTime, setElapsedTime] = useState("0:00");

  // Calculate elapsed time
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const diff = Math.floor((now.getTime() - sessionStartTime.getTime()) / 1000);
      const minutes = Math.floor(diff / 60);
      const seconds = diff % 60;
      setElapsedTime(`${minutes}:${seconds.toString().padStart(2, "0")}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [sessionStartTime]);

  // Toggle microphone
  const toggleMicrophone = useCallback(async () => {
    try {
      await localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled);
    } catch (e) {
      console.error("Failed to toggle microphone:", e);
    }
  }, [localParticipant, isMicrophoneEnabled]);

  // Toggle camera
  const toggleCamera = useCallback(async () => {
    try {
      await localParticipant.setCameraEnabled(!isCameraEnabled);
    } catch (e) {
      console.error("Failed to toggle camera:", e);
    }
  }, [localParticipant, isCameraEnabled]);

  // Toggle screen share
  const toggleScreenShare = useCallback(async () => {
    try {
      await localParticipant.setScreenShareEnabled(!isScreenShareEnabled);
    } catch (e) {
      console.error("Failed to toggle screen share:", e);
    }
  }, [localParticipant, isScreenShareEnabled]);

  // Raise hand
  const toggleRaiseHand = useCallback(() => {
    if (hasRaisedHand) {
      // Lower hand
      setRaisedHands(prev => prev.filter(h => h.identity !== localParticipant.identity));
      setHasRaisedHand(false);
    } else {
      // Raise hand
      const newRequest: RaiseHandRequest = {
        id: Math.random().toString(36).substring(7),
        identity: localParticipant.identity,
        name: localParticipant.name || "Anonymous",
        timestamp: Date.now(),
      };
      setRaisedHands(prev => [...prev, newRequest]);
      setHasRaisedHand(true);
    }
  }, [hasRaisedHand, localParticipant]);

  // Invite speaker (host only)
  const inviteSpeaker = useCallback((request: RaiseHandRequest) => {
    // TODO: Implement actual speaker invite via LiveKit
    console.log("Inviting speaker:", request);
    setRaisedHands(prev => prev.filter(h => h.id !== request.id));
  }, []);

  // Mute all (host only)
  const muteAll = useCallback(() => {
    // TODO: Implement mute all
    console.log("Mute all participants");
  }, []);

  // Pin question
  const pinQuestion = useCallback((author: string, content: string) => {
    setPinnedQuestion({
      id: Math.random().toString(36).substring(7),
      author,
      content,
      timestamp: Date.now(),
    });
  }, []);

  // Unpin question
  const unpinQuestion = useCallback(() => {
    setPinnedQuestion(null);
  }, []);

  // Handle reaction
  const handleReaction = useCallback((emoji: string) => {
    // TODO: Send reaction via LiveKit data channel
    console.log("Reaction:", emoji);
    setShowReactions(false);
  }, []);

  // Format time ago
  const formatTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  return (
    <div className="flex h-screen flex-col bg-zinc-950">
      {/* ==================== HEADER ==================== */}
      <header className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900/95 px-4 py-3 backdrop-blur">
        {/* Left: Back + Session Info */}
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/sessions"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-800 text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-white"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>

          <div>
            <h1 className="text-lg font-semibold text-white">{sessionTitle}</h1>
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <span className="flex items-center gap-1">
                <Crown className="h-3.5 w-3.5 text-amber-400" />
                Host: {hostName}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                {attendeeCount} attending
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {elapsedTime}
              </span>
            </div>
          </div>
        </div>

        {/* Center: Recording Indicator */}
        {isRecording && (
          <div className="flex items-center gap-2 rounded-full bg-red-500/10 px-3 py-1.5">
            <Radio className="h-4 w-4 animate-pulse text-red-500" />
            <span className="text-sm font-medium text-red-400">Recording</span>
          </div>
        )}

        {/* Right: Host Actions / Member Actions */}
        <div className="flex items-center gap-2">
          {isHost ? (
            <>
              {/* Raise Hand Queue Toggle */}
              {raisedHands.length > 0 && (
                <button
                  onClick={() => setShowHandQueue(!showHandQueue)}
                  className={cn(
                    "relative flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                    showHandQueue
                      ? "bg-amber-500/20 text-amber-400"
                      : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                  )}
                >
                  <Hand className="h-4 w-4" />
                  <span>{raisedHands.length}</span>
                </button>
              )}

              {/* Mute All */}
              <button
                onClick={muteAll}
                className="flex items-center gap-2 rounded-full bg-zinc-800 px-3 py-1.5 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-700"
              >
                <VolumeX className="h-4 w-4" />
                <span className="hidden sm:inline">Mute All</span>
              </button>

              {/* End Session */}
              <button
                onClick={onEndSession}
                className="flex items-center gap-2 rounded-full bg-red-500/10 px-3 py-1.5 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/20"
              >
                <Radio className="h-4 w-4" />
                <span>End Session</span>
              </button>
            </>
          ) : (
            <>
              {/* Raise Hand */}
              <button
                onClick={toggleRaiseHand}
                className={cn(
                  "flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                  hasRaisedHand
                    ? "bg-amber-500/20 text-amber-400"
                    : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                )}
              >
                <Hand className={cn("h-4 w-4", hasRaisedHand && "animate-bounce")} />
                <span>{hasRaisedHand ? "Hand Raised" : "Raise Hand"}</span>
              </button>

              {/* Leave */}
              <button
                onClick={onLeave}
                className="flex items-center gap-2 rounded-full bg-red-500/10 px-3 py-1.5 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/20"
              >
                <LogOut className="h-4 w-4" />
                <span>Leave</span>
              </button>
            </>
          )}
        </div>
      </header>

      {/* ==================== MAIN CONTENT ==================== */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT: Notes Panel */}
        <div
          className={cn(
            "flex w-80 flex-col border-r border-zinc-800 bg-zinc-900/50 transition-all",
            !showAllPanels && activePanel !== "notes" && "hidden"
          )}
        >
          <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-medium text-zinc-300">
              <FileText className="h-4 w-4 text-emerald-400" />
              Session Notes
            </div>
            <span className="text-xs text-zinc-500">Auto-saved</span>
          </div>
          <div className="flex-1 overflow-hidden">
            <SessionNotesEditor
              sessionId={sessionId || ""}
            />
          </div>
        </div>

        {/* CENTER: Stage + Chat */}
        <div className="flex flex-1 flex-col min-w-0">
          {/* Pinned Question Banner */}
          {pinnedQuestion && (
            <div className="flex items-start gap-3 border-b border-zinc-800 bg-amber-500/5 px-4 py-3">
              <Pin className="h-4 w-4 shrink-0 text-amber-400" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-amber-200">
                  <span className="font-medium">{pinnedQuestion.author}:</span>{" "}
                  {pinnedQuestion.content}
                </p>
              </div>
              {isHost && (
                <button
                  onClick={unpinQuestion}
                  className="shrink-0 text-zinc-500 hover:text-zinc-300"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          )}

          {/* Stage */}
          <div className="flex-1 min-h-0 p-4">
            <MainStage
              mode={isAudioOnly ? "audio" : isScreenShareEnabled ? "screen" : "video"}
              sessionMode={sessionMode}
              sessionId={sessionId}
            />
          </div>

          {/* Chat Panel (below stage on desktop, or replace stage on mobile) */}
          <div
            className={cn(
              "h-64 border-t border-zinc-800 bg-zinc-900/30",
              !showAllPanels && activePanel !== "chat" && "hidden"
            )}
          >
            <SessionChat
              sessionId={sessionId || ""}
              onPinQuestion={isHost ? pinQuestion : undefined}
            />
          </div>
        </div>

        {/* RIGHT: Participants Panel */}
        <div
          className={cn(
            "flex w-72 flex-col border-l border-zinc-800 bg-zinc-900/50 transition-all",
            !showAllPanels && activePanel !== "participants" && "hidden"
          )}
        >
          {/* Participants Header */}
          <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-medium text-zinc-300">
              <Users className="h-4 w-4 text-blue-400" />
              Participants
            </div>
            <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
              {participants.length + 1}
            </span>
          </div>

          {/* Participants List */}
          <div className="flex-1 overflow-y-auto p-2">
            {/* Host Section */}
            <div className="mb-4">
              <p className="mb-2 px-2 text-xs font-medium uppercase text-zinc-500">Host</p>
              <div className="flex items-center gap-3 rounded-lg bg-zinc-800/50 px-3 py-2">
                <div className="relative">
                  {hostAvatar ? (
                    <img
                      src={hostAvatar}
                      alt={hostName}
                      className="h-8 w-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-sm font-medium text-white">
                      {hostName.charAt(0)}
                    </div>
                  )}
                  <Crown className="absolute -right-1 -top-1 h-3 w-3 text-amber-400" />
                </div>
                <span className="text-sm font-medium text-white">{hostName}</span>
              </div>
            </div>

            {/* Speakers Section */}
            <div className="mb-4">
              <p className="mb-2 px-2 text-xs font-medium uppercase text-zinc-500">Speakers</p>
              {participants
                .filter(p => !p.isRemote) // Local participants who are speakers
                .map(p => (
                  <div
                    key={p.identity}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-zinc-800/50"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 text-sm font-medium text-white">
                      {p.name?.charAt(0) || "?"}
                    </div>
                    <span className="text-sm text-zinc-300">{p.name || "Unknown"}</span>
                    {p.isMicrophoneEnabled && (
                      <div className="ml-auto flex items-center gap-1">
                        <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-400" />
                      </div>
                    )}
                  </div>
                ))}
              {participants.filter(p => !p.isRemote).length === 0 && (
                <p className="px-2 text-sm text-zinc-500">No speakers yet</p>
              )}
            </div>

            {/* Audience Section */}
            <div>
              <p className="mb-2 px-2 text-xs font-medium uppercase text-zinc-500">Audience</p>
              {participants
                .filter(p => p.isRemote)
                .slice(0, 10)
                .map(p => (
                  <div
                    key={p.identity}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-zinc-800/50"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-700 text-sm font-medium text-zinc-300">
                      {p.name?.charAt(0) || "?"}
                    </div>
                    <span className="text-sm text-zinc-400">{p.name || "Unknown"}</span>
                  </div>
                ))}
              {participants.filter(p => p.isRemote).length > 10 && (
                <p className="px-2 text-sm text-zinc-500">
                  +{participants.filter(p => p.isRemote).length - 10} more
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ==================== RAISE HAND QUEUE (Host Overlay) ==================== */}
      {isHost && showHandQueue && raisedHands.length > 0 && (
        <div className="absolute right-80 top-16 z-50 w-72 rounded-xl border border-zinc-700 bg-zinc-900/95 p-4 shadow-2xl backdrop-blur">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-medium text-white">Hand Raised Queue</h3>
            <button
              onClick={() => setShowHandQueue(false)}
              className="text-zinc-500 hover:text-zinc-300"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-2">
            {raisedHands.map((request) => (
              <div
                key={request.id}
                className="flex items-center justify-between rounded-lg bg-zinc-800/50 px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-700 text-sm font-medium text-zinc-300">
                    {request.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{request.name}</p>
                    <p className="text-xs text-zinc-500">{formatTimeAgo(request.timestamp)}</p>
                  </div>
                </div>
                <button
                  onClick={() => inviteSpeaker(request)}
                  className="rounded-lg bg-blue-500/20 px-2 py-1 text-xs font-medium text-blue-400 transition-colors hover:bg-blue-500/30"
                >
                  <UserPlus className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================== CONTROLS BAR ==================== */}
      <div className="flex items-center justify-between border-t border-zinc-800 bg-zinc-900 px-4 py-3">
        {/* Left: Media Controls */}
        <div className="flex items-center gap-2">
          {/* Mic */}
          <button
            onClick={toggleMicrophone}
            className={cn(
              "flex h-12 w-12 items-center justify-center rounded-full transition-all",
              isMicrophoneEnabled
                ? "bg-zinc-800 text-white hover:bg-zinc-700"
                : "bg-red-500/20 text-red-400 hover:bg-red-500/30"
            )}
          >
            {isMicrophoneEnabled ? (
              <Mic className="h-5 w-5" />
            ) : (
              <MicOff className="h-5 w-5" />
            )}
          </button>

          {/* Camera (video mode only) */}
          {!isAudioOnly && (
            <button
              onClick={toggleCamera}
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-full transition-all",
                isCameraEnabled
                  ? "bg-zinc-800 text-white hover:bg-zinc-700"
                  : "bg-red-500/20 text-red-400 hover:bg-red-500/30"
              )}
            >
              {isCameraEnabled ? (
                <Video className="h-5 w-5" />
              ) : (
                <VideoOff className="h-5 w-5" />
              )}
            </button>
          )}

          {/* Screen Share */}
          <button
            onClick={toggleScreenShare}
            className={cn(
              "flex h-12 w-12 items-center justify-center rounded-full transition-all",
              isScreenShareEnabled
                ? "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                : "bg-zinc-800 text-white hover:bg-zinc-700"
            )}
          >
            <Monitor className="h-5 w-5" />
          </button>

          {/* Reactions */}
          <div className="relative">
            <button
              onClick={() => setShowReactions(!showReactions)}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800 text-white transition-all hover:bg-zinc-700"
            >
              <Smile className="h-5 w-5" />
            </button>
            {showReactions && (
              <div className="absolute bottom-full left-1/2 mb-2 -translate-x-1/2">
                <ReactionsBar onReaction={handleReaction} />
              </div>
            )}
          </div>
        </div>

        {/* Center: Session Info (mobile only) */}
        <div className="hidden md:block text-center">
          <p className="text-sm text-zinc-400">{elapsedTime}</p>
        </div>

        {/* Right: Panel Toggle + Leave */}
        <div className="flex items-center gap-2">
          {/* Panel Toggle (mobile) */}
          <div className="flex rounded-lg bg-zinc-800 p-1 md:hidden">
            {(["notes", "chat", "participants"] as PanelTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActivePanel(tab);
                  setShowAllPanels(false);
                }}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  activePanel === tab
                    ? "bg-zinc-700 text-white"
                    : "text-zinc-400 hover:text-zinc-200"
                )}
              >
                {tab === "notes" && <FileText className="h-4 w-4" />}
                {tab === "chat" && <MessageSquare className="h-4 w-4" />}
                {tab === "participants" && <Users className="h-4 w-4" />}
              </button>
            ))}
          </div>

          {/* Toggle All Panels (desktop) */}
          <button
            onClick={() => setShowAllPanels(!showAllPanels)}
            className="hidden h-12 w-12 items-center justify-center rounded-full bg-zinc-800 text-white transition-all hover:bg-zinc-700 md:flex"
          >
            {showAllPanels ? <ChevronDown className="h-5 w-5" /> : <ChevronUp className="h-5 w-5" />}
          </button>

          {/* Leave / End */}
          {isHost ? (
            <button
              onClick={onEndSession}
              className="flex h-12 items-center gap-2 rounded-full bg-red-500 px-4 font-medium text-white transition-colors hover:bg-red-600"
            >
              <Radio className="h-5 w-5" />
              <span className="hidden sm:inline">End</span>
            </button>
          ) : (
            <button
              onClick={onLeave}
              className="flex h-12 items-center gap-2 rounded-full bg-red-500 px-4 font-medium text-white transition-colors hover:bg-red-600"
            >
              <LogOut className="h-5 w-5" />
              <span className="hidden sm:inline">Leave</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
