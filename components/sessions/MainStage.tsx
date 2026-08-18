"use client";

import { useMemo } from "react";
import {
  ParticipantTile,
  VideoTrack,
  useLocalParticipant,
  useTracks,
} from "@livekit/components-react";
import { Track, LocalTrack } from "livekit-client";
import { useTranslations } from "next-intl";
import { Monitor, Pencil, Headphones, Sparkles } from "lucide-react";
import { SessionMode } from "./ModeSwitcher";
import { SessionWhiteboard } from "./SessionWhiteboard";
import { LocalVideo } from "./LocalVideo";
import { cn } from "@/lib/utils";
import type { WhiteboardChannel } from "@/hooks/useWhiteboardChannel";

interface MainStageProps {
  mode: SessionMode;
  sessionMode?: "video" | "audio";
  onModeChange?: (mode: SessionMode) => void;
  sessionId?: string;
  className?: string;
  /** Only the host draws. Everyone else gets the board read-only. */
  isHost?: boolean;
  /**
   * The live board. Passed in rather than subscribed to here so that one
   * accumulator serves the whole room — the control that opens the board lives
   * in the room chrome, and it and the canvas must agree on the same scene.
   */
  whiteboard?: WhiteboardChannel;
}

function EmptyStage({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="flex h-full min-h-[420px] items-center justify-center">
      <div className="flex max-w-md flex-col items-center gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/80 px-8 py-10 text-center shadow-2xl">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-purple-600/90">
          <Icon className="h-8 w-8 text-white" />
        </div>
        <div>
          <p className="text-lg font-semibold text-white">{title}</p>
          <p className="mt-1 text-sm text-zinc-400">{description}</p>
        </div>
      </div>
    </div>
  );
}

/**
 * The empty video stage, with a face on it.
 *
 * When nobody has a camera on, the stage used to be a flat near-black rectangle
 * with a small card floating in it — indistinguishable, at a glance, from a
 * player that failed to load. This fills the surface with a soft brand gradient
 * and puts the Unytea mark on it, so an empty room reads as waiting rather than
 * broken.
 *
 * Only the empty branch uses it. When there is a track to show, the stage is
 * untouched — video still renders on black, which is what video wants.
 */
function BrandedEmptyStage({ title, description }: { title: string; description: string }) {
  return (
    <div className="relative flex h-full min-h-[420px] items-center justify-center overflow-hidden bg-gradient-to-br from-zinc-900 via-purple-950/40 to-zinc-900">
      {/* Soft halo behind the mark, so the surface reads as lit rather than off. */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-600/20 blur-3xl"
      />
      <div className="relative flex max-w-md flex-col items-center gap-5 px-8 text-center">
        {/* The same lockup the auth pages and the footer use. */}
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 to-pink-600 shadow-lg">
          <Sparkles className="h-8 w-8 text-white" />
        </div>
        <div>
          <p className="text-lg font-semibold text-white">{title}</p>
          <p className="mt-1 text-sm text-zinc-400">{description}</p>
        </div>
      </div>
    </div>
  );
}

function AudioStage({
  isMicrophoneEnabled,
  participantName,
  statusLabel,
}: {
  isMicrophoneEnabled: boolean;
  participantName: string;
  statusLabel: string;
}) {
  return (
    <div className="flex h-full min-h-[420px] items-center justify-center">
      <div className="flex max-w-md flex-col items-center gap-6 rounded-2xl border border-zinc-800 bg-zinc-900/80 px-10 py-12 text-center shadow-2xl">
        {/* Audio avatar / waveform visualization */}
        <div className="relative">
          <div
            className={cn(
              "flex h-24 w-24 items-center justify-center rounded-full transition-all duration-500",
              isMicrophoneEnabled ? "bg-blue-600 shadow-lg shadow-blue-500/30" : "bg-zinc-700"
            )}
          >
            <Headphones className="h-12 w-12 text-white" />
          </div>

          {/* Pulse animation when mic is on */}
          {isMicrophoneEnabled && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-24 w-24 animate-ping rounded-full bg-blue-500/20" />
            </div>
          )}
        </div>

        <div>
          <p className="text-xl font-semibold text-white">{participantName}</p>
          <p className="mt-2 text-sm text-zinc-400">{statusLabel}</p>
        </div>

        {/* Audio indicator bars */}
        {isMicrophoneEnabled && (
          <div className="flex h-8 items-end gap-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="w-1.5 animate-pulse rounded-full bg-blue-500"
                style={{
                  height: `${Math.random() * 24 + 8}px`,
                  animationDelay: `${i * 100}ms`,
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function MainStage({
  mode,
  sessionMode = "video",
  onModeChange,
  sessionId,
  className,
  isHost = false,
  whiteboard,
}: MainStageProps) {
  const t = useTranslations("liveSession.mainStage");
  const isAudioOnly = sessionMode === "audio";
  const { localParticipant } = useLocalParticipant();

  // Access track states from localParticipant
  const isCameraEnabled = localParticipant.isCameraEnabled;
  const isMicrophoneEnabled = localParticipant.isMicrophoneEnabled;
  const audioStatusLabel = isMicrophoneEnabled ? t("speaking") : t("micMuted");
  const cameraTrack = localParticipant.getTrackPublication(Track.Source.Camera)?.track as
    | LocalTrack
    | undefined;
  const cameraTracks = useTracks([Track.Source.Camera]);
  const screenTracks = useTracks([Track.Source.ScreenShare]);

  // local camera track first, otherwise first available camera track
  const mainCameraTrack = useMemo(() => {
    return (
      cameraTracks.find((t) => t.participant.identity === localParticipant.identity) ??
      cameraTracks[0]
    );
  }, [cameraTracks, localParticipant.identity]);

  // local screen share first, otherwise first available screen track
  const mainScreenTrack = useMemo(() => {
    return (
      screenTracks.find((t) => t.participant.identity === localParticipant.identity) ??
      screenTracks[0]
    );
  }, [screenTracks, localParticipant.identity]);

  /**
   * What the stage actually shows, as opposed to what this client asked for.
   *
   * `mode` used to be the whole story, and it is a purely local value: the room
   * passed `isScreenShareEnabled ? "screen" : stageMode`, where
   * `isScreenShareEnabled` is the *local* participant's publish flag. So when
   * the host shared their screen, only the host's own stage switched. Every
   * guest subscribed to the track — autoSubscribe is on and `useTracks` below
   * returns remote publications — and then rendered the camera branch instead,
   * which for a guest with no camera up is the "waiting for video" placeholder.
   * The screen arrived and was thrown away one line before it would have been
   * drawn.
   *
   * A published screen share is a fact about the room, not a preference of the
   * viewer, so the stage is derived from the track being there. The whiteboard
   * still wins: it is something a participant opened deliberately, and a screen
   * share should not yank them out of it.
   */
  const effectiveMode: SessionMode = useMemo(() => {
    if (mode === "whiteboard") return "whiteboard";
    if (mainScreenTrack) return "screen";
    return mode;
  }, [mode, mainScreenTrack]);

  const isShowingLocalMain = isCameraEnabled && !!cameraTrack;

  /**
   * Whose camera is on the main stage, or undefined when the main stage is not
   * showing a camera at all. While a screen share is up nobody's camera is on
   * the stage, so nobody should be filtered out of the strip below — the old
   * unconditional filter silently dropped one participant's tile in exactly the
   * case where you most want to see the faces.
   */
  const displayedMainIdentity =
    effectiveMode !== "video"
      ? undefined
      : isShowingLocalMain
        ? localParticipant.identity
        : mainCameraTrack?.participant.identity;

  const speakerStripTracks = useMemo(() => {
    return cameraTracks.filter((t) => t.participant.identity !== displayedMainIdentity).slice(0, 4);
  }, [cameraTracks, displayedMainIdentity]);

  // For audio-only sessions in "screen" mode, show audio stage
  if (isAudioOnly && effectiveMode !== "whiteboard" && effectiveMode !== "screen") {
    return (
      <AudioStage
        isMicrophoneEnabled={isMicrophoneEnabled}
        participantName={localParticipant.identity}
        statusLabel={audioStatusLabel}
      />
    );
  }

  return (
    <div className={cn("flex h-full flex-col overflow-hidden", className)}>
      {/* MAIN STAGE */}
      <div className="relative flex-1 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950">
        {effectiveMode === "whiteboard" ? (
          sessionId ? (
            <SessionWhiteboard
              embedded
              sessionId={sessionId}
              isHost={isHost}
              remoteElements={whiteboard?.elements}
              remoteRevision={whiteboard?.revision}
              onSceneChange={isHost ? whiteboard?.publishElements : undefined}
              onClose={() => onModeChange?.(isAudioOnly ? "screen" : "video")}
            />
          ) : (
            <EmptyStage
              icon={Pencil}
              title={t("whiteboardUnavailableTitle")}
              description={t("whiteboardUnavailableDesc")}
            />
          )
        ) : effectiveMode === "screen" ? (
          mainScreenTrack ? (
            <div className="h-full w-full bg-black">
              <VideoTrack className="h-full w-full object-contain" trackRef={mainScreenTrack} />
            </div>
          ) : isAudioOnly ? (
            // For audio-only sessions, show audio stage when screen is not shared
            <AudioStage
              isMicrophoneEnabled={isMicrophoneEnabled}
              participantName={localParticipant.identity}
              statusLabel={audioStatusLabel}
            />
          ) : (
            <EmptyStage icon={Monitor} title={t("noScreenTitle")} description={t("noScreenDesc")} />
          )
        ) : isCameraEnabled && cameraTrack ? (
          <LocalVideo
            className="h-full w-full object-cover"
            cameraTrack={cameraTrack}
            isCameraEnabled={isCameraEnabled}
          />
        ) : mainCameraTrack ? (
          <div className="h-full w-full bg-black">
            <VideoTrack className="h-full w-full object-cover" trackRef={mainCameraTrack} />
          </div>
        ) : (
          <BrandedEmptyStage
            title={t("noCameraTitle")}
            description={isCameraEnabled ? t("noCameraWaiting") : t("noCameraDesc")}
          />
        )}
      </div>

      {/* SPEAKER STRIP - solo para video mode */}
      {!isAudioOnly && effectiveMode !== "whiteboard" && speakerStripTracks.length > 0 && (
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {speakerStripTracks.map((trackRef) => (
            <div
              key={trackRef.publication.trackSid ?? `${trackRef.participant.identity}-cam`}
              className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900"
            >
              <ParticipantTile trackRef={trackRef} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
