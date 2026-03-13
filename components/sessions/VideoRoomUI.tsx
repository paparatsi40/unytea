"use client";

import { useState, useEffect } from "react";
import {
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
  Pencil,
  Radio,
  Settings,
  Video,
  VideoOff,
  Headphones,
  Users,
  MessageSquare,
  FileText,
  Crown,
  Check,
  X,
} from "lucide-react";
import Link from "next/link";

import { MainStage } from "./MainStage";
import { SessionChat } from "./SessionChat";
import { SessionNotesEditor } from "./SessionNotesEditor";
import { SessionWhiteboard } from "./SessionWhiteboard";

// Session states
type SessionState = "waiting" | "live" | "ending" | "ended";

interface VideoRoomUIProps {
  sessionId?: string;
  sessionMode?: "video" | "audio";
  sessionTitle?: string;
  isHost?: boolean;
  onLeave?: () => void;
  onEndSession?: () => void;
}

interface RaiseHandRequest {
  id: string;
  identity: string;
  name: string;
  timestamp: number;
}

export function VideoRoomUI({
  sessionId,
  sessionMode = "video",
  sessionTitle = "Weekly Coaching Session",
  isHost = true,
  onLeave,
  onEndSession,
}: VideoRoomUIProps) {
  const isAudioOnly = sessionMode === "audio";
  
  // Session state
  const [sessionState, _setSessionState] = useState<SessionState>("live");
  
  // Stage mode: video, screen, whiteboard, audio
  const [stageMode, setStageMode] = useState<"video" | "screen" | "whiteboard" | "audio">(
    isAudioOnly ? "audio" : "video"
  );
  
  // Right panel tabs
  const [rightPanelTab, setRightPanelTab] = useState<"chat" | "notes">("chat");
  
  // Raise hand system
  const [raisedHands, setRaisedHands] = useState<RaiseHandRequest[]>([]);
  const [hasRaisedHand, setHasRaisedHand] = useState(false);
  const [showHandQueue, setShowHandQueue] = useState(false);
  
  // Recording
  const [isRecording, setIsRecording] = useState(false);
  
  // Media loading states
  const [isLoadingCamera, setIsLoadingCamera] = useState(false);
  const [isLoadingMic, setIsLoadingMic] = useState(false);

  const room = useRoomContext();
  const participants = useParticipants();
  const localParticipantData = useLocalParticipant();
  const localParticipant = localParticipantData.localParticipant;
  const isCameraEnabled = localParticipantData.isCameraEnabled;
  const isMicrophoneEnabled = localParticipantData.isMicrophoneEnabled;
  const isScreenShareEnabled = localParticipantData.isScreenShareEnabled;

  // Handle incoming data messages (raise hand)
  useEffect(() => {
    if (!room) return;

    const handleData = (payload: Uint8Array, participant: any) => {
      try {
        const decoder = new TextDecoder();
        const data = JSON.parse(decoder.decode(payload));
        
        if (data.type === "raise_hand") {
          if (data.raised) {
            setRaisedHands(prev => {
              if (prev.find(h => h.identity === data.from)) return prev;
              return [...prev, {
                id: `${data.from}-${Date.now()}`,
                identity: data.from,
                name: data.from,
                timestamp: data.timestamp,
              }];
            });
          } else {
            setRaisedHands(prev => prev.filter(h => h.identity !== data.from));
          }
        }
      } catch (e) {
        console.error("Failed to parse data message:", e);
      }
    };

    // Note: LiveKit data messages need to be set up differently
    // This is a simplified version
  }, [room]);

  // Toggle functions
  const toggleCamera = async () => {
    if (isAudioOnly) return;
    setIsLoadingCamera(true);
    try {
      await localParticipant.setCameraEnabled(!isCameraEnabled);
      if (!isCameraEnabled) {
        setStageMode("video");
      }
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
        setStageMode("screen");
      } else {
        setStageMode(isAudioOnly ? "audio" : "video");
      }
    } catch (error) {
      console.error("Failed to toggle screen share:", error);
    }
  };

  const handleRaiseHand = async () => {
    const newState = !hasRaisedHand;
    setHasRaisedHand(newState);
    
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(
        JSON.stringify({
          type: "raise_hand",
          raised: newState,
          from: localParticipant.identity,
          timestamp: Date.now(),
        })
      );
      await room.localParticipant.publishData(data, { reliable: true });
    } catch (error) {
      console.error("Failed to raise hand:", error);
    }
  };

  const inviteToSpeak = (hand: RaiseHandRequest) => {
    // In a real implementation, this would trigger a host action
    // to spotlight this participant or give them special permissions
    setRaisedHands(prev => prev.filter(h => h.id !== hand.id));
  };

  const toggleRecording = () => {
    setIsRecording(!isRecording);
    // In real implementation, this would start/stop recording
  };

  // Mode switcher options
  const modeOptions = isAudioOnly 
    ? [
        { id: "audio", label: "Audio", icon: Headphones },
        { id: "screen", label: "Screen", icon: Monitor },
        { id: "whiteboard", label: "Whiteboard", icon: Pencil },
      ]
    : [
        { id: "video", label: "Video", icon: Video },
        { id: "screen", label: "Screen", icon: Monitor },
        { id: "whiteboard", label: "Whiteboard", icon: Pencil },
      ];

  // Render different states
  if (sessionState === "waiting") {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-zinc-950 p-8">
        <div className="text-center">
          <div className="mb-6 flex justify-center">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-zinc-800">
              <Radio className="h-12 w-12 text-zinc-500" />
            </div>
          </div>
          <h2 className="mb-2 text-2xl font-bold text-white">Session starts soon</h2>
          <p className="mb-6 text-zinc-400">
            {sessionTitle} will begin shortly. Get ready!
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-zinc-500">
            <Users className="h-4 w-4" />
            <span>{participants.length} participants waiting</span>
          </div>
        </div>
      </div>
    );
  }

  if (sessionState === "ending") {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-zinc-950 p-8">
        <div className="text-center">
          <div className="mb-6 flex justify-center">
            <div className="flex h-24 w-24 animate-pulse items-center justify-center rounded-full bg-yellow-500/20">
              <Radio className="h-12 w-12 text-yellow-500" />
            </div>
          </div>
          <h2 className="mb-2 text-2xl font-bold text-white">Session is ending</h2>
          <p className="mb-6 text-zinc-400">
            Recording is being processed. You&apos;ll be redirected shortly.
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-zinc-500">
            <span>Processing recording...</span>
          </div>
        </div>
      </div>
    );
  }

  if (sessionState === "ended") {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-zinc-950 p-8">
        <div className="text-center">
          <div className="mb-6 flex justify-center">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-green-500/20">
              <Check className="h-12 w-12 text-green-500" />
            </div>
          </div>
          <h2 className="mb-2 text-2xl font-bold text-white">Session ended</h2>
          <p className="mb-6 text-zinc-400">
            Thank you for joining! The recording and notes are now available.
          </p>
          <div className="flex gap-3">
            <Link
              href={`/dashboard/sessions/${sessionId}`}
              className="rounded-xl bg-purple-600 px-6 py-3 font-medium text-white transition-colors hover:bg-purple-700"
            >
              View Recap
            </Link>
            <button
              onClick={onLeave}
              className="rounded-xl border border-zinc-700 bg-zinc-800 px-6 py-3 font-medium text-zinc-300 transition-colors hover:bg-zinc-700"
            >
              Back to Sessions
            </button>
          </div>
        </div>
      </div>
    );
  }

  // LIVE STATE - Main 4-panel layout
  return (
    <div className="flex h-full flex-col overflow-hidden bg-zinc-950">
      {/* HEADER */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-zinc-800 bg-zinc-900 px-4">
        {/* Left: Back + Title */}
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/sessions"
            className="flex items-center gap-2 text-sm text-zinc-400 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Back</span>
          </Link>
          <div className="h-6 w-px bg-zinc-700" />
          <div>
            <h1 className="text-sm font-semibold text-white">{sessionTitle}</h1>
            <p className="text-xs text-zinc-500">
              {isAudioOnly ? "Live audio" : "Live session"} • {participants.length} participants
            </p>
          </div>
        </div>

        {/* Center: Mode switcher */}
        <div className="hidden md:flex items-center gap-2">
          <div className="flex items-center rounded-full border border-zinc-800 bg-zinc-950 p-1">
            {modeOptions.map((option, index) => {
              const Icon = option.icon;
              const isActive = stageMode === option.id;
              const isFirst = index === 0;
              const isLast = index === modeOptions.length - 1;
              
              return (
                <button
                  key={option.id}
                  onClick={() => setStageMode(option.id as any)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-all",
                    isFirst && "rounded-l-full",
                    isLast && "rounded-r-full",
                    isActive
                      ? "bg-purple-600 text-white"
                      : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="hidden lg:inline">{option.label}</span>
                </button>
              );
            })}
          </div>
          
          {/* Audio-only badge */}
          {isAudioOnly && (
            <div className="flex items-center gap-1.5 rounded-full bg-blue-500/10 px-2.5 py-1 text-xs font-medium text-blue-400">
              <Headphones className="h-3 w-3" />
              <span>Audio</span>
            </div>
          )}
        </div>

        {/* Right: Recording + Hand queue + Leave */}
        <div className="flex items-center gap-2">
          {/* Recording indicator */}
          {isRecording && (
            <div className="flex items-center gap-1.5 rounded-full bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-400">
              <div className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
              <span className="hidden sm:inline">REC</span>
            </div>
          )}
          
          {/* Raise hand queue (host only) */}
          {isHost && raisedHands.length > 0 && (
            <button
              onClick={() => setShowHandQueue(!showHandQueue)}
              className="relative flex items-center gap-1.5 rounded-full bg-yellow-500/10 px-2.5 py-1 text-xs font-medium text-yellow-400"
            >
              <Hand className="h-3.5 w-3.5" />
              <span>{raisedHands.length}</span>
            </button>
          )}

          {/* End/Leave button */}
          {isHost ? (
            <button
              onClick={onEndSession}
              className="flex h-8 items-center gap-1.5 rounded-full border border-red-500/50 px-3 text-xs font-medium text-red-400 transition-all hover:bg-red-500/10"
            >
              <Radio className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">End</span>
            </button>
          ) : (
            <button
              onClick={onLeave}
              className="flex h-8 items-center gap-1.5 rounded-full border border-zinc-700 bg-zinc-800 px-3 text-xs font-medium text-zinc-400 transition-all hover:bg-zinc-700"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Leave</span>
            </button>
          )}
        </div>
      </header>

      {/* HAND QUEUE PANEL (Host only, expandable) */}
      {isHost && showHandQueue && raisedHands.length > 0 && (
        <div className="shrink-0 border-b border-zinc-800 bg-yellow-500/5 px-4 py-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-yellow-400">
              Raised hands ({raisedHands.length})
            </span>
            <button
              onClick={() => setShowHandQueue(false)}
              className="text-xs text-zinc-500 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-2 flex gap-2">
            {raisedHands.map((hand) => (
              <div
                key={hand.id}
                className="flex items-center gap-2 rounded-lg bg-zinc-800 px-3 py-1.5"
              >
                <span className="text-xs text-white">{hand.name}</span>
                <button
                  onClick={() => inviteToSpeak(hand)}
                  className="rounded bg-purple-600 px-2 py-0.5 text-xs text-white hover:bg-purple-700"
                >
                  Invite
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MAIN 4-PANEL GRID */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT COLUMN: Stage (arriba) + Notes (abajo) */}
        <div className="flex flex-1 flex-col min-w-0">
          {/* STAGE - Top half */}
          <div className="flex-1 min-h-0 p-3">
            <div className="relative h-full overflow-hidden rounded-2xl border border-zinc-800 bg-black shadow-2xl">
              {/* Live badge */}
              <div className="absolute left-3 top-3 z-20 flex items-center gap-2">
                <div className="flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-zinc-200 backdrop-blur-sm">
                  <Radio className="h-3 w-3 text-red-500" />
                  <span>LIVE</span>
                </div>
                {isRecording && (
                  <div className="flex items-center gap-1.5 rounded-full bg-red-500/20 px-2.5 py-1 text-xs font-medium text-red-400">
                    <div className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
                    <span>REC</span>
                  </div>
                )}
              </div>

              {/* Main content based on stage mode */}
              {stageMode === "whiteboard" && sessionId ? (
                <SessionWhiteboard 
                  embedded 
                  sessionId={sessionId} 
                  onClose={() => setStageMode(isAudioOnly ? "audio" : "video")} 
                />
              ) : (
                <MainStage
                  mode={stageMode as any}
                  sessionMode={sessionMode}
                  sessionId={sessionId}
                  className="h-full"
                />
              )}
            </div>
          </div>

          {/* NOTES - Bottom half */}
          <div className="h-64 shrink-0 border-t border-zinc-800 bg-zinc-900">
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between border-b border-zinc-800 px-3 py-2">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-yellow-500" />
                  <span className="text-xs font-medium text-zinc-300">Session Notes</span>
                </div>
                {isHost && (
                  <span className="flex items-center gap-1 text-xs text-zinc-500">
                    <Crown className="h-3 w-3" />
                    Host
                  </span>
                )}
              </div>
              <div className="flex-1 overflow-hidden">
                {sessionId ? (
                  <SessionNotesEditor sessionId={sessionId} isHost={isHost} compact />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <p className="text-xs text-zinc-500">Notes not available</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Chat (full height) */}
        <div className="flex w-80 shrink-0 flex-col border-l border-zinc-800 bg-zinc-900">
          {/* Tabs */}
          <div className="flex border-b border-zinc-800">
            <button
              onClick={() => setRightPanelTab("chat")}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 px-4 py-3 text-xs font-medium transition-colors",
                rightPanelTab === "chat"
                  ? "border-b-2 border-purple-500 text-purple-400"
                  : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              <MessageSquare className="h-4 w-4" />
              Chat
            </button>
            <button
              onClick={() => setRightPanelTab("notes")}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 px-4 py-3 text-xs font-medium transition-colors",
                rightPanelTab === "notes"
                  ? "border-b-2 border-yellow-500 text-yellow-400"
                  : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              <FileText className="h-4 w-4" />
              Notes
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden">
            {rightPanelTab === "chat" ? (
              sessionId ? (
                <SessionChat sessionId={sessionId} />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <p className="text-xs text-zinc-500">Chat not available</p>
                </div>
              )
            ) : (
              <div className="flex h-full items-center justify-center">
                <p className="text-xs text-zinc-500">
                  Notes are shown in the left panel during the session.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* PARTICIPANTS BAR */}
      <div className="shrink-0 border-t border-zinc-800 bg-zinc-900 px-4 py-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <Users className="h-4 w-4" />
            <span>{participants.length} participants</span>
          </div>
          <div className="h-4 w-px bg-zinc-700" />
          <div className="flex gap-1.5 overflow-x-auto">
            {/* Local participant */}
            <div className="flex items-center gap-1.5 rounded-full bg-zinc-800 px-2.5 py-1">
              <div className={cn(
                "h-2 w-2 rounded-full",
                isMicrophoneEnabled ? "bg-green-500" : "bg-red-500"
              )} />
              <span className="text-xs text-zinc-300">You</span>
              {isHost && <Crown className="h-3 w-3 text-yellow-500" />}
            </div>
            
            {/* Other participants */}
            {participants
              .filter(p => p.identity !== localParticipant.identity)
              .slice(0, 8)
              .map((participant) => (
                <div 
                  key={participant.identity}
                  className="flex items-center gap-1.5 rounded-full bg-zinc-800 px-2.5 py-1"
                >
                  <div className={cn(
                    "h-2 w-2 rounded-full",
                    participant.isSpeaking ? "bg-green-500" : "bg-zinc-600"
                  )} />
                  <span className="text-xs text-zinc-300 truncate max-w-[80px]">
                    {participant.identity}
                  </span>
                </div>
              ))}
            
            {participants.length > 9 && (
              <div className="flex items-center rounded-full bg-zinc-800 px-2.5 py-1">
                <span className="text-xs text-zinc-500">
                  +{participants.length - 9}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* BOTTOM CONTROLS */}
      <div className="flex shrink-0 items-center justify-center gap-1 border-t border-zinc-800 bg-zinc-900 px-4 py-3 sm:gap-2">
        {/* Microphone */}
        <button
          onClick={toggleMicrophone}
          disabled={isLoadingMic}
          className={cn(
            "flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full transition-all shadow-lg disabled:opacity-50",
            isMicrophoneEnabled
              ? "bg-zinc-700 text-white hover:bg-zinc-600"
              : "border-2 border-red-500/50 bg-red-500/20 text-red-400 hover:bg-red-500/30"
          )}
          title={isMicrophoneEnabled ? "Mute" : "Unmute"}
        >
          {isMicrophoneEnabled ? (
            <Mic className="h-4 w-4 sm:h-5 sm:w-5" />
          ) : (
            <MicOff className="h-4 w-4 sm:h-5 sm:w-5" />
          )}
        </button>

        {/* Camera (video only) */}
        {!isAudioOnly && (
          <button
            onClick={toggleCamera}
            disabled={isLoadingCamera}
            className={cn(
              "flex items-center justify-center rounded-full transition-all shadow-lg disabled:opacity-50",
              isCameraEnabled
                ? "h-10 w-10 sm:h-12 sm:w-12 bg-zinc-700 text-white hover:bg-zinc-600"
                : "h-11 w-11 sm:h-14 sm:w-14 border-2 sm:border-4 border-purple-400 bg-purple-600 text-white hover:bg-purple-700"
            )}
            title={isCameraEnabled ? "Stop Camera" : "Start Camera"}
          >
            {isCameraEnabled ? (
              <Video className="h-4 w-4 sm:h-5 sm:w-5" />
            ) : (
              <VideoOff className="h-5 w-5 sm:h-6 sm:w-6" />
            )}
          </button>
        )}

        {/* Screen Share */}
        <button
          onClick={toggleScreenShare}
          className={cn(
            "flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full border-2 transition-all shadow-lg",
            isScreenShareEnabled
              ? "border-green-500 bg-green-600 text-white hover:bg-green-700"
              : "border-zinc-700 bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white"
          )}
          title={isScreenShareEnabled ? "Stop Sharing" : "Share Screen"}
        >
          <Monitor className="h-4 w-4 sm:h-5 sm:w-5" />
        </button>

        {/* Whiteboard */}
        {sessionId && (
          <button
            onClick={() => setStageMode("whiteboard")}
            className={cn(
              "flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full border-2 transition-all",
              stageMode === "whiteboard"
                ? "border-purple-500 bg-purple-600 text-white"
                : "border-zinc-700 bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white"
            )}
            title="Whiteboard"
          >
            <Pencil className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
        )}

        {/* Divider */}
        <div className="mx-1 sm:mx-2 h-6 sm:h-8 w-px bg-zinc-700" />

        {/* Raise Hand */}
        <button
          onClick={handleRaiseHand}
          className={cn(
            "flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full transition-all",
            hasRaisedHand
              ? "bg-yellow-500 text-white shadow-lg hover:bg-yellow-600"
              : "border border-zinc-700 bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white"
          )}
          title={hasRaisedHand ? "Lower Hand" : "Raise Hand"}
        >
          <Hand className="h-4 w-4 sm:h-5 sm:w-5" />
        </button>

        {/* Reactions */}
        <div className="hidden sm:flex items-center gap-1">
          {["👍", "❤️", "🔥", "👏", "🎉"].map((emoji) => (
            <button
              key={emoji}
              onClick={() => {
                // Send reaction via LiveKit data message
              }}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-sm transition-all hover:bg-zinc-700 hover:scale-110"
            >
              {emoji}
            </button>
          ))}
        </div>

        {/* Recording (host only) */}
        {isHost && (
          <button
            onClick={toggleRecording}
            className={cn(
              "flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full border-2 transition-all",
              isRecording
                ? "border-red-500 bg-red-600 text-white"
                : "border-zinc-700 bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
            )}
            title={isRecording ? "Stop Recording" : "Start Recording"}
          >
            <Radio className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
        )}

        {/* Settings */}
        <button
          className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full border border-zinc-700 bg-zinc-800 text-zinc-400 transition-all hover:bg-zinc-700 hover:text-white"
          title="Settings"
        >
          <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
        </button>

        {/* End/Leave */}
        {isHost ? (
          <button
            onClick={onEndSession}
            className="ml-1 sm:ml-2 flex h-10 sm:h-12 items-center justify-center rounded-full border border-red-500/50 px-3 sm:px-5 text-xs sm:text-sm font-medium text-red-400 transition-all hover:bg-red-500/10"
          >
            <Radio className="mr-1.5 h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">End</span>
            <span className="sm:hidden">Stop</span>
          </button>
        ) : (
          <button
            onClick={onLeave}
            className="ml-1 sm:ml-2 flex h-10 sm:h-12 items-center justify-center rounded-full border border-zinc-700 bg-zinc-800 px-3 sm:px-5 text-xs sm:text-sm font-medium text-zinc-400 transition-all hover:bg-zinc-700"
          >
            <LogOut className="mr-1.5 h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span>Leave</span>
          </button>
        )}
      </div>
    </div>
  );
}
