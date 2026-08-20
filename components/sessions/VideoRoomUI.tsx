"use client";

import { useState, useEffect, useCallback } from "react";
import { useLocalParticipant, useParticipants, useRoomContext } from "@livekit/components-react";
import { useTranslations } from "next-intl";
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
  BarChart3,
  Megaphone,
  Pencil,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";

import { MainStage } from "./MainStage";
import { SessionMode } from "./ModeSwitcher";
import { SessionChat } from "./SessionChat";
import { SessionNotesEditor } from "./SessionNotesEditor";
import { ReactionsBar } from "./ReactionsBar";
import { ReactionOverlay } from "./ReactionOverlay";
import { LivePoll, PollCreator } from "@/components/live-session/LivePoll";
import { useSessionDataChannel } from "@/hooks/useSessionDataChannel";
import { useWhiteboardChannel } from "@/hooks/useWhiteboardChannel";
import { inviteToSpeak } from "@/app/actions/livekit";

// Types
type PanelTab = "notes" | "chat" | "participants";

interface PinnedQuestion {
  id: string;
  author: string;
  content: string;
  timestamp: number;
}

/**
 * `enumerateDevices()` returns new objects every call, so identity tells you
 * nothing about whether the hardware changed. Compare what we actually render.
 */
function sameDeviceList(a: MediaDeviceInfo[], b: MediaDeviceInfo[]): boolean {
  return (
    a.length === b.length &&
    a.every((device, i) => device.deviceId === b[i].deviceId && device.label === b[i].label)
  );
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
  sessionTitle = "",
  hostName = "",
  hostAvatar,
  isHost = false,
  attendeeCount = 0,
  sessionStartTime,
  onLeave,
  onEndSession,
}: VideoRoomUIProps) {
  const t = useTranslations("liveSession.room");
  const tA11y = useTranslations("a11y");
  const isAudioOnly = sessionMode === "audio";

  // Room context
  const participants = useParticipants();
  // Speakers and audience are decided by publishing permission, which is what
  // the token grants from the session role. Both lists used to key off
  // `identity === localParticipant.identity`, so "Speakers" meant "everyone but
  // me" and "Audience" meant "me" — which is why a host saw themselves filed
  // under AUDIENCE regardless of role.
  const speakers = participants.filter((p) => p.permissions?.canPublish);
  const audience = participants.filter((p) => !p.permissions?.canPublish);
  const room = useRoomContext();
  const localParticipantData = useLocalParticipant();
  const localParticipant = localParticipantData.localParticipant;
  const isCameraEnabled = localParticipantData.isCameraEnabled;
  const isMicrophoneEnabled = localParticipantData.isMicrophoneEnabled;
  const isScreenShareEnabled = localParticipantData.isScreenShareEnabled;

  /**
   * Whether this client may put a track on the wire, read from the grant the
   * server issued rather than from `isHost`.
   *
   * The media controls below used to render for everyone. A member of the
   * audience saw a microphone, a camera and a screen-share button, pressed one,
   * and got `insufficient permissions to publish` in the console and nothing on
   * screen — the control was offering something the token had already refused.
   *
   * Live, not fixed at join: `useLocalParticipant` observes
   * `ParticipantPermissionsChanged`, so when the host grants the floor the
   * controls appear without a reconnect.
   */
  const canPublishMedia = localParticipant.permissions?.canPublish ?? false;

  /**
   * `sessionStartTime` used to default to `new Date()` in the parameter list,
   * which evaluates on every render — so the timer effect below, keyed on it,
   * tore down and rebuilt its interval on every render too. Under a busy room
   * that fires faster than once a second, the clock never ticks at all.
   */
  const [fallbackStartTime] = useState(() => new Date());
  const startedAt = sessionStartTime ?? fallbackStartTime;

  // ── Data Channel (hand raise, polls, moderation) ────────────────────
  const {
    raisedHands,
    hasRaisedHand,
    toggleRaiseHand,
    inviteSpeaker,
    dismissHand,
    activePolls,
    createPoll,
    votePoll,
    closePoll,
    reactions,
    sendReaction,
    muteAll,
    muteAllSignal,
    invitedToSpeak,
    clearSpeakerInvite,
  } = useSessionDataChannel();

  // Active panel (for mobile/responsive)
  const [activePanel, setActivePanel] = useState<PanelTab>("chat");
  const [showAllPanels, setShowAllPanels] = useState(true);

  // UI toggles
  const [showHandQueue, setShowHandQueue] = useState(false);
  const [showPollCreator, setShowPollCreator] = useState(false);
  const [showActivePoll, setShowActivePoll] = useState(true);

  // Stage mode (video / screen / whiteboard)
  const [stageMode, setStageMode] = useState<SessionMode>("video");

  /**
   * The whiteboard, as a room-wide fact rather than a local toggle.
   *
   * `stageMode` is this client's own state and never left the browser, so a
   * host opening the board changed nothing for anyone else — the same shape of
   * bug the screen share had, and the reason a member's stage stayed on video
   * while the host drew. The host now announces open/closed over the data
   * channel and everyone else follows `whiteboard.isOpen`.
   */
  const whiteboard = useWhiteboardChannel(isHost);

  const isWhiteboardOpen = isHost ? stageMode === "whiteboard" : whiteboard.isOpen;

  /**
   * What the stage is asked to show. MainStage resolves the rest, and its
   * precedence is unchanged: whiteboard beats a screen share beats camera.
   * A member cannot pick "whiteboard" — they have no control that sets it —
   * so for them this is purely the host's announcement.
   */
  const requestedStageMode: SessionMode = isWhiteboardOpen ? "whiteboard" : stageMode;

  /**
   * Give someone the floor: grant first, announce second.
   *
   * `inviteSpeaker` only ever published a data-channel event. It moved a banner
   * onto the member's screen and changed no permission anywhere, so the
   * microphone it offered could not be turned on — the invitation was theatre.
   * The server action is the part that is real; the event is how the room finds
   * out. If the grant fails there is nothing to announce, so nothing is.
   */
  const handleInviteToSpeak = useCallback(
    async (identity: string) => {
      // The prop is optional on this component; without it there is no session
      // to grant anything in.
      if (!sessionId) return;

      const result = await inviteToSpeak(sessionId, identity);
      if (!result.success) {
        console.error("[room] could not give the floor:", result.error);
        return;
      }
      inviteSpeaker(identity);
    },
    [sessionId, inviteSpeaker]
  );

  const toggleWhiteboard = useCallback(() => {
    // Host only. The control below is not rendered for anyone else, and the
    // publish is what makes the change real for the room rather than for one
    // browser tab.
    const open = stageMode !== "whiteboard";
    setStageMode(open ? "whiteboard" : "video");
    whiteboard.publishMode(open);
  }, [stageMode, whiteboard]);

  // Pinned question
  const [pinnedQuestion, setPinnedQuestion] = useState<PinnedQuestion | null>(null);

  // Reactions
  const [showReactions, setShowReactions] = useState(false);
  const [videoInputs, setVideoInputs] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>("");

  // Session duration
  const [elapsedTime, setElapsedTime] = useState("0:00");

  // ── Mute-all listener ───────────────────────────────────────────────
  useEffect(() => {
    if (muteAllSignal === 0) return;
    // Nothing to mute for someone who was never allowed to publish, and asking
    // anyway walks into the same rejection the controls used to.
    if (!canPublishMedia) return;
    // When host sends mute_all, mute our mic
    localParticipant.setMicrophoneEnabled(false).catch(console.error);
  }, [muteAllSignal, localParticipant, canPublishMedia]);

  // Calculate elapsed time
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const diff = Math.floor((now.getTime() - startedAt.getTime()) / 1000);
      const minutes = Math.floor(diff / 60);
      const seconds = diff % 60;
      setElapsedTime(`${minutes}:${seconds.toString().padStart(2, "0")}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  /**
   * Read the camera list into state.
   *
   * Two things here are deliberate. It does not depend on `selectedCameraId`
   * even though it seeds it — a callback that both reads and writes a value it
   * depends on invalidates itself on every write, and the effect below is keyed
   * on its identity. And it only writes `videoInputs` when the list actually
   * changed: `enumerateDevices()` hands back a fresh array of fresh objects
   * every call, so an unconditional `setVideoInputs` re-renders the whole room
   * each time it runs, whether or not a camera was plugged in or out.
   */
  const refreshVideoInputs = useCallback(async () => {
    try {
      if (!navigator.mediaDevices?.enumerateDevices) return;
      const devices = await navigator.mediaDevices.enumerateDevices();
      const inputs = devices.filter((d) => d.kind === "videoinput");

      setVideoInputs((current) => (sameDeviceList(current, inputs) ? current : inputs));
      if (inputs[0]?.deviceId) {
        setSelectedCameraId((current) => current || inputs[0].deviceId);
      }
    } catch (e) {
      console.warn("Could not enumerate video inputs:", e);
    }
  }, []);

  const handleCameraDeviceChange = useCallback(
    async (deviceId: string) => {
      try {
        if (!room) return;
        await room.switchActiveDevice("videoinput", deviceId);
        setSelectedCameraId(deviceId);
      } catch (e) {
        console.error("Failed to switch camera device:", e);
      }
    },
    [room]
  );

  // Toggle microphone
  const toggleMicrophone = useCallback(async () => {
    try {
      await localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled);
    } catch (e) {
      console.error("[LiveKit] Failed to toggle microphone:", e);
    }
  }, [localParticipant, isMicrophoneEnabled]);

  // Toggle camera
  const toggleCamera = useCallback(async () => {
    try {
      // Turning the camera on no longer re-guesses the device. It comes up on
      // whatever the user last picked, which is what livekit already tracks.
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

  useEffect(() => {
    void refreshVideoInputs();

    const onDeviceChange = () => {
      void refreshVideoInputs();
    };

    navigator.mediaDevices?.addEventListener?.("devicechange", onDeviceChange);
    return () => {
      navigator.mediaDevices?.removeEventListener?.("devicechange", onDeviceChange);
    };
  }, [refreshVideoInputs]);

  /*
   * There was an effect here that, on every mount where the camera was on,
   * guessed which camera you "really" wanted — anything whose label did not say
   * integrated/built-in/facetime/internal — and called
   * `room.switchActiveDevice("videoinput", …)` for you.
   *
   * It was guarded by a ref, so it fired once per mount. That is fine until
   * something remounts the room, and something did (see VideoRoom.tsx): every
   * reconnect re-ran the guess, and `switchActiveDevice` restarts the published
   * camera track. When the next teardown landed while a restart was still in
   * flight, livekit-client logged `track was stopped during a restart, stopping
   * restarted track` and the camera came back dead.
   *
   * It is gone rather than re-guarded. Switching the camera is a user decision,
   * and there is a picker in the toolbar for it — `handleCameraDeviceChange` is
   * now the only caller of `switchActiveDevice` in the app. A label heuristic
   * cannot know that the unlabelled capture card is a document camera and the
   * "Integrated Webcam" is the one pointed at your face.
   */

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

  // Format time ago
  const formatTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return t("timeAgo.justNow");
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return t("timeAgo.minutesAgo", { count: minutes });
    const hours = Math.floor(minutes / 60);
    return t("timeAgo.hoursAgo", { count: hours });
  };

  // Get current active poll (most recent active one)
  const currentPoll =
    activePolls.filter((p) => p.isActive).slice(-1)[0] || activePolls.slice(-1)[0];

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
                {t("header.hostLabel", { name: hostName })}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                {t("header.attending", { count: attendeeCount })}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {elapsedTime}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Host Actions / Member Actions */}
        <div className="flex items-center gap-2">
          {isHost ? (
            <>
              {/* Raise Hand Queue Toggle */}
              {raisedHands.length > 0 && (
                <button
                  aria-label={tA11y("showRaisedHands")}
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

              {/* Create Poll */}
              <button
                onClick={() => setShowPollCreator(!showPollCreator)}
                className={cn(
                  "flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                  showPollCreator
                    ? "bg-purple-500/20 text-purple-400"
                    : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                )}
              >
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline">{t("header.poll")}</span>
              </button>

              {/* Mute All */}
              <button
                onClick={muteAll}
                className="flex items-center gap-2 rounded-full bg-zinc-800 px-3 py-1.5 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-700"
              >
                <VolumeX className="h-4 w-4" />
                <span className="hidden sm:inline">{t("header.muteAll")}</span>
              </button>

              {/*
                The recording control used to sit here, disabled and labelled
                "Recording (coming soon)". Recording is withdrawn (2026-08-18),
                so a permanently greyed-out control in the host's main toolbar
                is worse than nothing: it occupies the room chrome to advertise
                something that is not coming, and every host reads it every
                session.
              */}

              {/* End Session */}
              <button
                onClick={onEndSession}
                className="flex items-center gap-2 rounded-full bg-red-500/10 px-3 py-1.5 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/20"
              >
                <Radio className="h-4 w-4" />
                <span>{t("header.endSession")}</span>
              </button>
            </>
          ) : (
            <>
              {/* Raise Hand */}
              <button
                onClick={() => void toggleRaiseHand()}
                className={cn(
                  "flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                  hasRaisedHand
                    ? "bg-amber-500/20 text-amber-400"
                    : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                )}
              >
                <Hand className={cn("h-4 w-4", hasRaisedHand && "animate-bounce")} />
                <span>{hasRaisedHand ? t("raiseHand.raised") : t("raiseHand.raise")}</span>
              </button>

              {/* Leave */}
              <button
                onClick={onLeave}
                className="flex items-center gap-2 rounded-full bg-red-500/10 px-3 py-1.5 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/20"
              >
                <LogOut className="h-4 w-4" />
                <span>{t("header.leave")}</span>
              </button>
            </>
          )}
        </div>
      </header>

      {/* ==================== SPEAKER INVITE BANNER ==================== */}
      {invitedToSpeak && (
        <div className="flex items-center justify-between border-b border-emerald-800 bg-emerald-500/10 px-4 py-3">
          <div className="flex items-center gap-3">
            <Megaphone className="h-5 w-5 text-emerald-400" />
            <p className="text-sm font-medium text-emerald-200">{t("speakerInvite.message")}</p>
          </div>
          <div className="flex items-center gap-2">
            {/* The invitation arrives on the data channel and the grant arrives
                on the signalling connection; neither can be ordered against the
                other. So the button waits for the grant rather than assuming
                it — pressing early is what produced PublishTrackError. In
                practice the wait is invisible: the host promotes before it
                announces. */}
            <button
              disabled={!canPublishMedia}
              onClick={() => {
                localParticipant.setMicrophoneEnabled(true).catch(console.error);
                clearSpeakerInvite();
              }}
              className="rounded-full bg-emerald-500 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {t("speakerInvite.enableMic")}
            </button>
            <button
              aria-label={tA11y("clearInvite")}
              onClick={clearSpeakerInvite}
              className="text-zinc-400 hover:text-zinc-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

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
              {t("notesPanel.title")}
            </div>
            <span className="text-xs text-zinc-500">{t("notesPanel.autoSaved")}</span>
          </div>
          <div className="flex-1 overflow-hidden">
            <SessionNotesEditor sessionId={sessionId || ""} />
          </div>
        </div>

        {/* CENTER: Stage + Chat */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Pinned Question Banner */}
          {pinnedQuestion && (
            <div className="flex items-start gap-3 border-b border-zinc-800 bg-amber-500/5 px-4 py-3">
              <Pin className="h-4 w-4 shrink-0 text-amber-400" />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-amber-200">
                  <span className="font-medium">{pinnedQuestion.author}:</span>{" "}
                  {pinnedQuestion.content}
                </p>
              </div>
              {isHost && (
                <button
                  aria-label={tA11y("unpinQuestion")}
                  onClick={unpinQuestion}
                  className="shrink-0 text-zinc-500 hover:text-zinc-300"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          )}

          {/* Active Poll Banner (inline, above stage) */}
          {currentPoll && showActivePoll && (
            <div className="border-b border-zinc-800 bg-purple-500/5 px-4 py-3">
              <div className="mx-auto max-w-xl">
                <LivePoll
                  poll={currentPoll}
                  currentUserId={localParticipant.identity}
                  onVote={(pollId, optionId) => votePoll(pollId, optionId)}
                  onClose={() => {
                    if (isHost && currentPoll.isActive) {
                      closePoll(currentPoll.id);
                    }
                    setShowActivePoll(false);
                  }}
                />
              </div>
            </div>
          )}

          {/* Stage. `relative` because the reaction overlay floats over it —
              a reaction should interrupt nobody's place in what they are
              watching. */}
          <div className="relative min-h-0 flex-1 p-4">
            {/*
              `stageMode` is this viewer's own choice and nothing more. The
              screen-share branch used to be forced from here with
              `isScreenShareEnabled ? "screen" : stageMode` — the *local*
              participant's publish flag, which is false for everyone except the
              person sharing. That is why a guest never saw the host's screen.
              MainStage now resolves it from the published track, which every
              subscriber can see.
            */}
            <MainStage
              mode={requestedStageMode}
              sessionMode={sessionMode}
              sessionId={sessionId}
              isHost={isHost}
              whiteboard={whiteboard}
            />

            <ReactionOverlay reactions={reactions} />
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
              {t("participants.title")}
            </div>
            <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
              {participants.length + 1}
            </span>
          </div>

          {/* Participants List */}
          <div className="flex-1 overflow-y-auto p-2">
            {/* Host Section */}
            <div className="mb-4">
              <p className="mb-2 px-2 text-xs font-medium uppercase text-zinc-500">
                {t("participants.host")}
              </p>
              <div className="flex items-center gap-3 rounded-lg bg-zinc-800/50 px-3 py-2">
                <div className="relative">
                  {hostAvatar ? (
                    <Image
                      src={hostAvatar}
                      alt={hostName}
                      width={32}
                      height={32}
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

            {/* Raised Hands Section (visible to everyone when there are raised hands) */}
            {raisedHands.length > 0 && (
              <div className="mb-4">
                <p className="mb-2 px-2 text-xs font-medium uppercase text-amber-400">
                  <Hand className="mr-1 inline h-3 w-3" />
                  {t("participants.raisedHands", { count: raisedHands.length })}
                </p>
                {raisedHands.map((hand) => (
                  <div
                    key={hand.id}
                    className="mb-1 flex items-center gap-3 rounded-lg bg-amber-500/10 px-3 py-2"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/30 text-sm font-medium text-amber-200">
                      {hand.name.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-amber-200">{hand.name}</p>
                      <p className="text-xs text-zinc-500">{formatTimeAgo(hand.timestamp)}</p>
                    </div>
                    {isHost && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => void handleInviteToSpeak(hand.identity)}
                          className="rounded-lg bg-blue-500/20 p-1.5 text-blue-400 transition-colors hover:bg-blue-500/30"
                          title={t("participants.inviteToSpeak")}
                        >
                          <UserPlus className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => dismissHand(hand.identity)}
                          className="rounded-lg bg-zinc-700/50 p-1.5 text-zinc-400 transition-colors hover:bg-zinc-700"
                          title={t("participants.dismiss")}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Speakers Section */}
            <div className="mb-4">
              <p className="mb-2 px-2 text-xs font-medium uppercase text-zinc-500">
                {t("participants.speakers")}
              </p>
              {speakers.map((p) => (
                <div
                  key={p.identity}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-zinc-800/50"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 text-sm font-medium text-white">
                    {p.name?.charAt(0) || "?"}
                  </div>
                  <span className="text-sm text-zinc-300">{p.name || t("participants.guest")}</span>
                  {raisedHands.some((h) => h.identity === p.identity) && (
                    <Hand className="ml-auto h-3.5 w-3.5 animate-bounce text-amber-400" />
                  )}
                  {p.isMicrophoneEnabled && (
                    <div className="ml-auto flex items-center gap-1">
                      <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-400" />
                    </div>
                  )}
                </div>
              ))}
              {speakers.length === 0 && (
                <p className="px-2 text-sm text-zinc-500">{t("participants.noSpeakers")}</p>
              )}
            </div>

            {/* Audience Section */}
            <div>
              <p className="mb-2 px-2 text-xs font-medium uppercase text-zinc-500">
                {t("participants.audience")}
              </p>
              {audience.slice(0, 10).map((p) => (
                <div
                  key={p.identity}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-zinc-800/50"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-700 text-sm font-medium text-zinc-300">
                    {p.name?.charAt(0) || "?"}
                  </div>
                  <span className="text-sm text-zinc-400">{p.name || t("participants.guest")}</span>
                </div>
              ))}
              {audience.length > 10 && (
                <p className="px-2 text-sm text-zinc-500">
                  {t("participants.more", { count: audience.length - 10 })}
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
            <h3 className="font-medium text-white">{t("handQueue.title")}</h3>
            <button
              aria-label={tA11y("close")}
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
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => void handleInviteToSpeak(request.identity)}
                    className="rounded-lg bg-blue-500/20 px-2 py-1 text-xs font-medium text-blue-400 transition-colors hover:bg-blue-500/30"
                    title={t("participants.inviteToSpeak")}
                  >
                    <UserPlus className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => dismissHand(request.identity)}
                    className="rounded-lg bg-zinc-700/50 px-2 py-1 text-xs font-medium text-zinc-400 transition-colors hover:bg-zinc-700"
                    title={t("participants.dismiss")}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================== POLL CREATOR (Host Overlay) ==================== */}
      {isHost && showPollCreator && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <PollCreator
            onCreatePoll={(question, options, duration, isQuiz, correctAnswer) => {
              createPoll(question, options, duration, isQuiz, correctAnswer);
              setShowPollCreator(false);
              setShowActivePoll(true);
            }}
            onClose={() => setShowPollCreator(false)}
          />
        </div>
      )}

      {/* ==================== CONTROLS BAR ==================== */}
      <div className="flex items-center justify-between border-t border-zinc-800 bg-zinc-900 px-4 py-3">
        {/* Left: Media Controls */}
        <div className="flex items-center gap-2">
          {/* Capture controls exist only for someone the room lets publish.
              The audience is view-only for tracks; offering them a microphone
              only produced a PublishTrackError. */}
          {canPublishMedia && (
            <>
              {/* Mic */}
              <button
                onClick={toggleMicrophone}
                title={isMicrophoneEnabled ? t("controls.muteMic") : t("controls.unmuteMic")}
                className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-full transition-all",
                  isMicrophoneEnabled
                    ? "bg-zinc-800 text-white hover:bg-zinc-700"
                    : "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                )}
              >
                {isMicrophoneEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
              </button>

              {/* Camera (video mode only) */}
              {!isAudioOnly && (
                <>
                  <button
                    onClick={toggleCamera}
                    title={
                      isCameraEnabled ? t("controls.turnOffCamera") : t("controls.turnOnCamera")
                    }
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

                  {videoInputs.length > 1 && (
                    <select
                      value={selectedCameraId}
                      onChange={(e) => void handleCameraDeviceChange(e.target.value)}
                      className="h-10 max-w-[220px] rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-xs text-zinc-200"
                      title={t("controls.selectCamera")}
                    >
                      {videoInputs.map((device, index) => (
                        <option
                          key={device.deviceId || `${device.label}-${index}`}
                          value={device.deviceId}
                        >
                          {device.label || t("controls.cameraFallback", { number: index + 1 })}
                        </option>
                      ))}
                    </select>
                  )}
                </>
              )}

              {/* Screen Share */}
              <button
                onClick={toggleScreenShare}
                title={
                  isScreenShareEnabled ? t("controls.stopShareScreen") : t("controls.shareScreen")
                }
                className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-full transition-all",
                  isScreenShareEnabled
                    ? "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                    : "bg-zinc-800 text-white hover:bg-zinc-700"
                )}
              >
                <Monitor className="h-5 w-5" />
              </button>
            </>
          )}

          {/* Whiteboard — the host presents it; nobody else opens or closes it. */}
          {isHost && (
            <button
              onClick={toggleWhiteboard}
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-full transition-all",
                stageMode === "whiteboard"
                  ? "bg-purple-500/20 text-purple-400 hover:bg-purple-500/30"
                  : "bg-zinc-800 text-white hover:bg-zinc-700"
              )}
              title={t("controls.whiteboard")}
            >
              <Pencil className="h-5 w-5" />
            </button>
          )}

          {/* Reactions */}
          <div className="relative">
            <button
              onClick={() => setShowReactions(!showReactions)}
              title={t("controls.reactions")}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800 text-white transition-all hover:bg-zinc-700"
            >
              <Smile className="h-5 w-5" />
            </button>
            {showReactions && (
              <div className="absolute bottom-full left-1/2 mb-2 -translate-x-1/2">
                <ReactionsBar onReact={(emoji, label) => void sendReaction(emoji, label)} />
              </div>
            )}
          </div>

          {/* Poll indicator (for non-hosts, show when a poll is active) */}
          {!isHost && currentPoll && currentPoll.isActive && !showActivePoll && (
            <button
              onClick={() => setShowActivePoll(true)}
              className="flex h-12 items-center gap-2 rounded-full bg-purple-500/20 px-4 text-purple-400 transition-all hover:bg-purple-500/30"
            >
              <BarChart3 className="h-5 w-5" />
              <span className="text-sm font-medium">{t("controls.activePoll")}</span>
            </button>
          )}
        </div>

        {/* Center: Session Info (mobile only) */}
        <div className="hidden text-center md:block">
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
                title={t(`panels.${tab}`)}
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
            title={showAllPanels ? t("controls.hidePanels") : t("controls.showPanels")}
            className="hidden h-12 w-12 items-center justify-center rounded-full bg-zinc-800 text-white transition-all hover:bg-zinc-700 md:flex"
          >
            {showAllPanels ? (
              <ChevronDown className="h-5 w-5" />
            ) : (
              <ChevronUp className="h-5 w-5" />
            )}
          </button>

          {/* Leave / End */}
          {isHost ? (
            <button
              onClick={onEndSession}
              title={t("controls.endSessionTitle")}
              className="flex h-12 items-center gap-2 rounded-full bg-red-500 px-4 font-medium text-white transition-colors hover:bg-red-600"
            >
              <Radio className="h-5 w-5" />
              <span className="hidden sm:inline">{t("controls.end")}</span>
            </button>
          ) : (
            <button
              onClick={onLeave}
              title={t("controls.leaveSessionTitle")}
              className="flex h-12 items-center gap-2 rounded-full bg-red-500 px-4 font-medium text-white transition-colors hover:bg-red-600"
            >
              <LogOut className="h-5 w-5" />
              <span className="hidden sm:inline">{t("header.leave")}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
