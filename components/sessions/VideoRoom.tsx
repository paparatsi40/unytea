"use client";

import { useEffect, useState, useCallback, useRef, memo } from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useConnectionState,
  useTracks,
  ControlBar,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { Loader2, Presentation, AlertCircle, VideoOff, Camera, Mic, RefreshCw, Video } from "lucide-react";
import { SessionWhiteboard } from "./SessionWhiteboard";
import { Track } from "livekit-client";

// Manual camera toggle component
function ManualCameraToggle() {
  const cameraTracks = useTracks([Track.Source.Camera], { onlySubscribed: false });
  const [isCameraEnabled, setIsCameraEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Find local camera track (participant identity starts with the local participant)
  const localCameraTrack = cameraTracks.find((t: any) => t.participant.isLocal);
  
  useEffect(() => {
    if (localCameraTrack) {
      const pub = localCameraTrack.publication;
      setIsCameraEnabled(pub?.isSubscribed && !pub?.isMuted);
    }
  }, [localCameraTrack]);
  
  const toggleCamera = async () => {
    const localParticipant = localCameraTrack?.participant;
    if (!localParticipant) {
      console.error("No local participant found");
      return;
    }
    
    setIsLoading(true);
    try {
      if (isCameraEnabled) {
        await localParticipant.setCameraEnabled(false);
        setIsCameraEnabled(false);
      } else {
        await localParticipant.setCameraEnabled(true);
        setIsCameraEnabled(true);
      }
    } catch (err) {
      console.error("Error toggling camera:", err);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <button
      onClick={toggleCamera}
      disabled={isLoading}
      className={`flex items-center gap-2 rounded-full px-4 py-2 font-medium transition-all ${
        isCameraEnabled 
          ? "bg-green-600 text-white hover:bg-green-700" 
          : "bg-red-600 text-white hover:bg-red-700"
      } disabled:opacity-50`}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isCameraEnabled ? (
        <>
          <Video className="h-4 w-4" />
          Cámara ON
        </>
      ) : (
        <>
          <VideoOff className="h-4 w-4" />
          Cámara OFF - Click para activar
        </>
      )}
    </button>
  );
}
function ConnectionStatus({ isVideoEnabled, isAudioEnabled }: { isVideoEnabled: boolean; isAudioEnabled: boolean }) {
  const connectionState = useConnectionState();
  
  return (
    <div className="absolute bottom-4 left-4 flex flex-col items-start gap-2 max-w-xs" style={{ zIndex: 10 }}>
      <div className="rounded-full bg-black/70 px-3 py-1 text-xs text-white flex items-center gap-2">
        <span>Status: {connectionState}</span>
        {isVideoEnabled && <Camera className="h-3 w-3 text-green-400" />}
        {isAudioEnabled && <Mic className="h-3 w-3 text-green-400" />}
      </div>
    </div>
  );
}

// Video grid component using useTracks with manual video element rendering
function VideoGrid() {
  // Get all camera tracks from all participants
  const cameraTracks = useTracks([Track.Source.Camera], { onlySubscribed: false });
  const screenShareTracks = useTracks([Track.Source.ScreenShare], { onlySubscribed: false });
  
  const allTracks = [...cameraTracks, ...screenShareTracks];
  
  if (allTracks.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center">
        <div className="text-center">
          <VideoOff className="mx-auto mb-4 h-16 w-16 text-gray-500" />
          <p className="text-gray-400 mb-4">Esperando video...</p>
          <ManualCameraToggle />
          <p className="mt-4 text-xs text-gray-500">Activa tu cámara para comenzar</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="grid h-full w-full grid-cols-1 gap-2 p-2 md:grid-cols-2">
      {allTracks.map((trackRef) => (
        <VideoTile key={trackRef.publication.trackSid} trackRef={trackRef} />
      ))}
    </div>
  );
}

// Individual video tile component - memoized to prevent re-renders
const VideoTile = memo(function VideoTile({ trackRef }: { trackRef: any }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hasAttached = useRef(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [needsManualPlay, setNeedsManualPlay] = useState(false);
  
  // Get stable values that won't change on re-renders
  const trackSid = trackRef.publication?.trackSid;
  const participantIdentity = trackRef.participant?.identity || 'Unknown';
  
  useEffect(() => {
    const video = videoRef.current;
    const publication = trackRef.publication;
    const track = publication?.track;
    
    // Only attach once per trackSid
    if (hasAttached.current || !video || !track || !track.mediaStream) {
      return undefined;
    }
    
    console.log("✅ Attaching track:", participantIdentity, trackSid);
    hasAttached.current = true;
    
    // Always mute initially for autoplay to work
    video.muted = true;
    
    try {
      // Use LiveKit's attach method
      track.attach(video);
      
      // Set srcObject
      if (video.srcObject !== track.mediaStream) {
        video.srcObject = track.mediaStream;
      }
      
      // Play with better error handling
      const playVideo = async () => {
        try {
          await video.play();
          console.log("▶️ Video playing:", participantIdentity);
          setIsPlaying(true);
          setNeedsManualPlay(false);
        } catch (err: any) {
          console.warn("Auto-play blocked for:", participantIdentity, err?.message);
          setNeedsManualPlay(true);
        }
      };
      
      // Small delay to ensure stream is ready
      const timeoutId = setTimeout(playVideo, 100);
      
      // Listen for play/pause events
      const handlePlaying = () => setIsPlaying(true);
      const handlePause = () => setIsPlaying(false);
      video.addEventListener('playing', handlePlaying);
      video.addEventListener('pause', handlePause);
      
      return () => {
        clearTimeout(timeoutId);
        video.removeEventListener('playing', handlePlaying);
        video.removeEventListener('pause', handlePause);
        
        if (hasAttached.current) {
          console.log("🧹 Cleaning up video:", participantIdentity);
          track.detach(video);
          if (video) {
            video.srcObject = null;
            video.pause();
          }
          hasAttached.current = false;
        }
      };
    } catch (err) {
      console.error("Error attaching track:", participantIdentity, err);
      hasAttached.current = false;
      return undefined;
    }
  }, [trackSid, participantIdentity]);
  
  const track = trackRef.publication?.track;
  const isReady = track?.mediaStream;
  
  const handleManualPlay = () => {
    const video = videoRef.current;
    if (video) {
      video.muted = true;
      video.play().then(() => {
        setIsPlaying(true);
        setNeedsManualPlay(false);
      });
    }
  };
  
  return (
    <div 
      className="relative overflow-hidden rounded-lg bg-gray-900 flex items-center justify-center" 
      style={{ minHeight: '300px', minWidth: '400px', border: '2px solid green' }}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover"
        style={{ 
          display: 'block', 
          width: '100%', 
          height: '100%',
          minHeight: '300px',
          backgroundColor: '#111'
        }}
      />
      
      {/* Manual play button if autoplay blocked */}
      {needsManualPlay && (
        <button
          onClick={handleManualPlay}
          className="absolute inset-0 flex items-center justify-center bg-black/50 hover:bg-black/30 transition-colors"
        >
          <div className="bg-white/20 backdrop-blur rounded-full p-6">
            <Camera className="h-12 w-12 text-white" />
          </div>
          <span className="absolute bottom-20 text-white font-medium">Click to start video</span>
        </button>
      )}
      
      {/* Status indicator */}
      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
        <div className="rounded bg-black/70 px-2 py-1 text-xs text-white flex items-center gap-2">
          {participantIdentity}
          {!isReady && <span className="text-yellow-400">(connecting...)</span>}
          {isReady && !isPlaying && <span className="text-red-400">(paused)</span>}
          {isReady && isPlaying && <span className="text-green-400">● LIVE</span>}
        </div>
      </div>
    </div>
  );
});

interface VideoRoomProps {
  roomName: string;
  onLeave?: () => void;
  sessionId?: string;
}

export function VideoRoom({ roomName, onLeave, sessionId }: VideoRoomProps) {
  const [token, setToken] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [activationError, setActivationError] = useState("");

  useEffect(() => {
    async function getToken() {
      try {
        setIsLoading(true);
        const response = await fetch("/api/livekit/token", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            roomName: roomName,
            participantName: "Participant",
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Failed to get token: ${response.status}`);
        }

        const data = await response.json();
        if (!data.token) {
          throw new Error("No token received from server");
        }
        console.log("Got LiveKit token, wsUrl:", data.wsUrl);
        setToken(data.token);
      } catch (err) {
        console.error("Error getting token:", err);
        setError(err instanceof Error ? err.message : "Failed to join video room");
      } finally {
        setIsLoading(false);
      }
    }

    getToken();
  }, [roomName]);

  const activateCamera = useCallback(async () => {
    setIsActivating(true);
    setActivationError("");
    
    try {
      // Try to get camera access directly first
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      });
      
      // If successful, stop the stream (LiveKit will create its own)
      stream.getTracks().forEach(track => track.stop());
      
      // Now enable video in LiveKit
      setIsVideoEnabled(true);
      setIsAudioEnabled(true);
    } catch (err) {
      console.error("Error accessing camera:", err);
      setActivationError("No se pudo acceder a la cámara. Por favor verifica los permisos.");
    } finally {
      setIsActivating(false);
    }
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-[600px] items-center justify-center rounded-xl bg-card">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Connecting to video room...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[600px] items-center justify-center rounded-xl bg-card">
        <div className="text-center max-w-md px-4">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-destructive" />
          <p className="mb-2 text-lg font-semibold text-destructive">
            Video Connection Failed
          </p>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <div className="text-xs text-muted-foreground bg-muted p-3 rounded-lg">
            <p className="font-medium mb-1">Possible causes:</p>
            <ul className="text-left list-disc pl-4 space-y-1">
              <li>LiveKit server not configured</li>
              <li>Camera/microphone permissions denied</li>
              <li>Network connection issue</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="flex h-[600px] items-center justify-center rounded-xl bg-card">
        <div className="text-center">
          <AlertCircle className="mx-auto mb-4 h-8 w-8 text-destructive" />
          <p className="text-destructive">No authentication token available</p>
        </div>
      </div>
    );
  }

  const serverUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

  if (!serverUrl) {
    return (
      <div className="flex h-[600px] items-center justify-center rounded-xl bg-card">
        <div className="text-center max-w-md px-4">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-destructive" />
          <p className="mb-2 text-lg font-semibold text-destructive">
            LiveKit Not Configured
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            The video call service is not properly configured. Please contact support.
          </p>
          <div className="text-xs text-muted-foreground bg-muted p-3 rounded-lg text-left">
            <p className="font-medium">Missing environment variable:</p>
            <code className="block mt-1 text-destructive">NEXT_PUBLIC_LIVEKIT_URL</code>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-[600px] w-full overflow-hidden rounded-xl bg-card">
      <LiveKitRoom
        video={isVideoEnabled}
        audio={isAudioEnabled}
        token={token}
        serverUrl={serverUrl}
        connect={true}
        onDisconnected={onLeave}
        onError={(err) => {
          console.error("LiveKit connection error:", err);
        }}
        className="h-full"
        options={{
          adaptiveStream: true,
          dynacast: true,
        }}
      >
        <ConnectionStatus isVideoEnabled={isVideoEnabled} isAudioEnabled={isAudioEnabled} />
        <RoomAudioRenderer />
        
        {/* Show activation button if camera not enabled yet */}
        {!isVideoEnabled && !isAudioEnabled && (
          <div className="absolute inset-0 flex items-center justify-center" style={{ zIndex: 30, background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)' }}>
            <div className="text-center px-4">
              <VideoOff className="mx-auto mb-4 h-16 w-16 text-gray-400" />
              <p className="mb-6 text-lg text-gray-300">
                Cámara y micrófono están apagados
              </p>
              
              {activationError && (
                <div className="mb-4 rounded-lg bg-red-600/90 px-4 py-3 text-sm text-white max-w-sm">
                  {activationError}
                </div>
              )}
              
              <button
                onClick={activateCamera}
                disabled={isActivating}
                className="flex items-center justify-center gap-3 rounded-full bg-purple-600 px-6 py-3 text-lg font-medium text-white shadow-lg transition-all hover:scale-105 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isActivating ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Solicitando permisos...
                  </>
                ) : (
                  <>
                    <Camera className="h-6 w-6" />
                    Activar Cámara y Micrófono
                  </>
                )}
              </button>
              <p className="mt-4 text-sm text-gray-500">
                Se solicitarán permisos al navegador
              </p>
            </div>
          </div>
        )}
        
        {/* Custom video grid - shows actual video or placeholder */}
        {(isVideoEnabled || isAudioEnabled) && (
          <div className="flex h-full flex-col">
            <div className="flex-1 overflow-hidden">
              <VideoGrid />
            </div>
            <div className="shrink-0">
              <ControlBar />
            </div>
          </div>
        )}
      </LiveKitRoom>

      {/* Toggle button to restart camera if needed */}
      {(isVideoEnabled || isAudioEnabled) && (
        <button
          onClick={() => {
            setIsVideoEnabled(false);
            setIsAudioEnabled(false);
            setActivationError("");
          }}
          className="absolute top-4 right-4 flex items-center gap-2 rounded-full bg-gray-800/80 px-3 py-1.5 text-xs text-white hover:bg-gray-700"
          style={{ zIndex: 40 }}
        >
          <RefreshCw className="h-3 w-3" />
          Reiniciar Cámara
        </button>
      )}

      {/* Whiteboard Toggle Button */}
      <button
        onClick={() => setShowWhiteboard(!showWhiteboard)}
        className={`absolute bottom-20 right-4 flex items-center gap-2 rounded-full px-4 py-2 font-medium shadow-xl transition-all hover:scale-105 ${
          showWhiteboard
            ? "bg-purple-600 text-white hover:bg-purple-700"
            : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
        }`}
        style={{ zIndex: 40 }}
      >
        <Presentation className="h-5 w-5" />
        {showWhiteboard ? "Close Whiteboard" : "Open Whiteboard"}
      </button>

      {/* Whiteboard Overlay */}
      {sessionId && (
        <SessionWhiteboard
          isOpen={showWhiteboard}
          onClose={() => setShowWhiteboard(false)}
          sessionId={sessionId}
        />
      )}
    </div>
  );
}
