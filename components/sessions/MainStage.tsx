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
import { Monitor, Video, Pencil, Headphones } from "lucide-react";
import { SessionMode } from "./ModeSwitcher";
import { SessionWhiteboard } from "./SessionWhiteboard";
import { LocalVideo } from "./LocalVideo";
import { cn } from "@/lib/utils";

interface MainStageProps {
  mode: SessionMode;
  sessionMode?: "video" | "audio";
  onModeChange?: (mode: SessionMode) => void;
  sessionId?: string;
  className?: string;
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

  const isShowingLocalMain = isCameraEnabled && !!cameraTrack;

  const displayedMainIdentity = isShowingLocalMain
    ? localParticipant.identity
    : mainCameraTrack?.participant.identity;

  const speakerStripTracks = useMemo(() => {
    return cameraTracks.filter((t) => t.participant.identity !== displayedMainIdentity).slice(0, 4);
  }, [cameraTracks, displayedMainIdentity]);

  // For audio-only sessions in "screen" mode, show audio stage
  if (isAudioOnly && mode !== "whiteboard" && mode !== "screen") {
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
        {mode === "whiteboard" ? (
          sessionId ? (
            <SessionWhiteboard
              embedded
              sessionId={sessionId}
              onClose={() => onModeChange?.(isAudioOnly ? "screen" : "video")}
            />
          ) : (
            <EmptyStage
              icon={Pencil}
              title={t("whiteboardUnavailableTitle")}
              description={t("whiteboardUnavailableDesc")}
            />
          )
        ) : mode === "screen" ? (
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
          <EmptyStage
            icon={Video}
            title={t("noCameraTitle")}
            description={isCameraEnabled ? t("noCameraWaiting") : t("noCameraDesc")}
          />
        )}
      </div>

      {/* SPEAKER STRIP - solo para video mode */}
      {!isAudioOnly && mode !== "whiteboard" && speakerStripTracks.length > 0 && (
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
