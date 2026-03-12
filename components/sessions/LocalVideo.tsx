"use client";

import { useEffect, useRef } from "react";
import { LocalTrack } from "livekit-client";

interface LocalVideoProps {
  className?: string;
  cameraTrack?: LocalTrack | null;
  isCameraEnabled: boolean;
}

export function LocalVideo({ className, cameraTrack, isCameraEnabled }: LocalVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const videoEl = videoRef.current;
    const track = cameraTrack;

    if (!videoEl || !track) {
      return;
    }

    try {
      track.attach(videoEl);
    } catch (err) {
      console.error("Error attaching track:", err);
    }

    return () => {
      try {
        track.detach(videoEl);
      } catch (err) {
        console.error("Error detaching track:", err);
      }
    };
  }, [cameraTrack, isCameraEnabled]);

  if (!isCameraEnabled || !cameraTrack) {
    return (
      <div className={`flex h-full w-full items-center justify-center bg-zinc-900 ${className}`}>
        <div className="flex flex-col items-center gap-4 text-zinc-500">
          <svg
            className="h-20 w-20"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
          <div className="text-center">
            <p className="text-lg font-medium text-zinc-300">Camera is off</p>
            <p className="mt-1 text-sm text-zinc-500">
              Turn on your camera to start the session
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full" key={cameraTrack?.trackSid || "no-track"}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={className}
        style={{ transform: "scaleX(-1)", background: "black" }}
      />
    </div>
  );
}
