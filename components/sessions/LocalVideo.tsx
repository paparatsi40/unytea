"use client";

import { useEffect, useRef, useState } from "react";
import { useLocalParticipant } from "@livekit/components-react";

interface LocalVideoProps {
  className?: string;
}

export function LocalVideo({ className }: LocalVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const localParticipantData = useLocalParticipant();
  const cameraTrack = localParticipantData.cameraTrack;
  const isCameraEnabled = localParticipantData.isCameraEnabled;
  const [debugInfo, setDebugInfo] = useState<string>("Initializing...");

  // Debug: log render values
  console.log('LocalVideo RENDER:', { 
    isCameraEnabled, 
    hasCameraTrack: !!cameraTrack,
    trackSid: cameraTrack?.trackSid 
  });

  useEffect(() => {
    const videoEl = videoRef.current;
    const track = cameraTrack?.track;

    console.log("LocalVideo effect:", { videoEl: !!videoEl, track: !!track, isCameraEnabled });
    setDebugInfo(`VideoEl: ${!!videoEl}, Track: ${!!track}, Enabled: ${isCameraEnabled}`);

    if (!videoEl || !track) {
      setDebugInfo(`Missing: ${!videoEl ? 'videoEl ' : ''}${!track ? 'track' : ''}`);
      return;
    }

    try {
      // Attach the track to the video element
      track.attach(videoEl);
      setDebugInfo("Track attached successfully");
      console.log("Track attached to video element");
    } catch (err) {
      setDebugInfo(`Error: ${err}`);
      console.error("Error attaching track:", err);
    }

    return () => {
      try {
        track.detach(videoEl);
        console.log("Track detached from video element");
      } catch (err) {
        console.error("Error detaching track:", err);
      }
    };
  }, [cameraTrack, isCameraEnabled]);

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
          <span className="text-xs text-zinc-600">{debugInfo}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full" key={cameraTrack?.trackSid || 'no-track'}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={className}
        style={{ transform: "scaleX(-1)", background: 'black' }}
      />
      <div className="absolute bottom-2 right-2 rounded bg-black/70 px-2 py-1 text-[10px] text-white">
        {debugInfo}
      </div>
      {/* Debug overlay - video ready state */}
      <div className="absolute top-2 right-2 rounded bg-green-600/80 px-2 py-1 text-[10px] text-white font-bold">
        VIDEO READY
      </div>
    </div>
  );
}
