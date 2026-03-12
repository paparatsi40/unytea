"use client";

import { useMemo } from "react";
import {
  ParticipantTile,
  VideoTrack,
  useLocalParticipant,
  useTracks,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import { Monitor, Video, Pencil } from "lucide-react";
import { SessionMode } from "./ModeSwitcher";
import { SessionWhiteboard } from "./SessionWhiteboard";
import { cn } from "@/lib/utils";

interface MainStageProps {
  mode: SessionMode;
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

export function MainStage({
  mode,
  sessionId,
  className,
}: MainStageProps) {
  const { localParticipant, isCameraEnabled, isScreenShareEnabled } =
    useLocalParticipant();

  const cameraTracks = useTracks([Track.Source.Camera]);
  const screenTracks = useTracks([Track.Source.ScreenShare]);

  // local camera track first, otherwise first available camera track
  const mainCameraTrack = useMemo(() => {
    return (
      cameraTracks.find(
        (t) => t.participant.identity === localParticipant.identity,
      ) ?? cameraTracks[0]
    );
  }, [cameraTracks, localParticipant.identity]);

  // local screen share first, otherwise first available screen track
  const mainScreenTrack = useMemo(() => {
    return (
      screenTracks.find(
        (t) => t.participant.identity === localParticipant.identity,
      ) ?? screenTracks[0]
    );
  }, [screenTracks, localParticipant.identity]);

  const speakerStripTracks = useMemo(() => {
    return cameraTracks
      .filter((t) => t.participant.identity !== mainCameraTrack?.participant.identity)
      .slice(0, 4);
  }, [cameraTracks, mainCameraTrack]);

  return (
    <div className={cn("flex h-full flex-col overflow-hidden", className)}>
      {/* MAIN STAGE */}
      <div className="relative flex-1 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950">
        {mode === "whiteboard" ? (
          sessionId ? (
            <SessionWhiteboard embedded sessionId={sessionId} onClose={() => setMode("video")} />
          ) : (
            <EmptyStage
              icon={Pencil}
              title="Whiteboard unavailable"
              description="This session does not have a whiteboard linked yet."
            />
          )
        ) : mode === "screen" ? (
          mainScreenTrack ? (
            <div className="h-full w-full bg-black">
              <VideoTrack
                className="h-full w-full object-contain"
                trackRef={mainScreenTrack}
              />
            </div>
          ) : (
            <EmptyStage
              icon={Monitor}
              title="No screen is being shared"
              description="Share your screen to present slides, demos, or walkthroughs."
            />
          )
        ) : mainCameraTrack ? (
          <div className="h-full w-full bg-black">
            <VideoTrack
              className="h-full w-full object-cover"
              trackRef={mainCameraTrack}
            />
          </div>
        ) : (
          <EmptyStage
            icon={Video}
            title={isCameraEnabled ? "Waiting for camera preview" : "Camera is off"}
            description={
              isCameraEnabled
                ? "Your camera is enabled, but the preview is not available yet."
                : "Turn on your camera to start the live session."
            }
          />
        )}

        {/* top-left badge */}
        <div className="absolute left-4 top-4 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-zinc-200">
          {mode === "screen"
            ? isScreenShareEnabled
              ? "Sharing screen"
              : "Screen mode"
            : mode === "whiteboard"
              ? "Whiteboard mode"
              : isCameraEnabled
                ? "Live video"
                : "Video mode"}
        </div>
      </div>

      {/* SPEAKER STRIP */}
      {mode !== "whiteboard" && speakerStripTracks.length > 0 && (
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
