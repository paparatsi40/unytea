"use client";

import { useEffect, useState } from "react";
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { VideoRoomContent } from "./VideoRoomContent";

interface VideoRoomProps {
  roomName: string;
  sessionId: string;
  userId: string;
  mentorId: string;
  onLeave?: () => void;
}

// Error Boundary to catch React hydration errors
class VideoRoomErrorBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    // Ignore hydration errors
    if (error.message.includes('Hydration') || 
        error.message.includes('removeChild') ||
        error.message.includes('418')) {
      console.warn('Hydration error caught and suppressed:', error);
      return { hasError: false }; // Don't show error UI for hydration issues
    }
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    // Log the error but don't crash the app
    console.error('VideoRoom error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError && !this.state.error?.message.includes('Hydration')) {
      return this.props.fallback || (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <p className="text-destructive">Something went wrong with the video room.</p>
            <button 
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded"
            >
              Reload
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export function VideoRoom({ roomName, sessionId, userId, mentorId, onLeave }: VideoRoomProps) {
  const [token, setToken] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();

  const isModerator = userId === mentorId;

  useEffect(() => {
    async function getToken() {
      try {
        setIsLoading(true);
        const response = await fetch(
          `/api/livekit/token?room=${encodeURIComponent(roomName)}`
        );

        if (!response.ok) {
          throw new Error("Failed to get token");
        }

        const data = await response.json();
        setToken(data.token);
      } catch (err) {
        console.error("Error getting token:", err);
        setError("Failed to join video room");
      } finally {
        setIsLoading(false);
      }
    }

    getToken();
  }, [roomName]);

  const handleDisconnect = () => {
    if (onLeave) {
      onLeave();
    } else {
      // Default behavior: go back to sessions
      router.push("/dashboard/sessions");
    }
  };

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
        <div className="text-center">
          <p className="mb-2 text-lg font-semibold text-destructive">
            Failed to connect
          </p>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (!token) {
    return null;
  }

  const serverUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

  if (!serverUrl) {
    return (
      <div className="flex h-[600px] items-center justify-center rounded-xl bg-card">
        <div className="text-center">
          <p className="text-destructive">LiveKit server URL not configured</p>
        </div>
      </div>
    );
  }

  return (
    <VideoRoomErrorBoundary>
      <div className="h-[600px] w-full overflow-hidden rounded-xl bg-card relative">
        <LiveKitRoom
          video={true}
          audio={true}
          token={token}
          serverUrl={serverUrl}
          connect={true}
          onDisconnected={handleDisconnect}
          className="h-full"
        >
          <VideoConference />
          <RoomAudioRenderer />
          
          {/* All interactive controls */}
          <VideoRoomContent sessionId={sessionId} isModerator={isModerator} />
        </LiveKitRoom>
      </div>
    </VideoRoomErrorBoundary>
  );
}