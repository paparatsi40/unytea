"use client";

import { useEffect, useRef } from "react";
import { useLocalParticipant } from "@livekit/components-react";

interface LocalVideoProps {
  className?: string;
}

export function LocalVideo({ className }: LocalVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const localParticipantData = useLocalParticipant();
  const cameraTrack = localParticipantData.cameraTrack;
  const isCameraEnabled = localParticipantData.isCameraEnabled;

  useEffect(() => {
    const videoEl = videoRef.current;
    const track = cameraTrack?.track;

    if (!videoEl || !track) return;

    // Attach the track to the video element
    track.attach(videoEl);

    return () => {
      track.detach(videoEl);
    };
  }, [cameraTrack]);

  if (!isCameraEnabled || !cameraTrack) {
    return (
      <div className={`flex items-center justify-center bg-zinc-900 ${className}`}>
        <div className="flex flex-col items-center gap-3 text-zinc-500">
          <svg
            className="h-16 w-16"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
          <span className="text-sm">Camera is off</span>
        </div>
      </div>
    );
  }

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      className={className}
      style={{ transform: "scaleX(-1)" }} // Mirror the video
    />
  );
}
