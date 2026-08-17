"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import { LiveKitRoom, RoomAudioRenderer } from "@livekit/components-react";
import type { MediaDeviceFailure } from "livekit-client";
import "@livekit/components-styles";
import { useTranslations } from "next-intl";
import { Loader2, AlertCircle } from "lucide-react";
import { VideoRoomUI } from "./VideoRoomUI";
import { joinSession } from "@/app/actions/livekit";
import { ROOM_OPTIONS } from "@/lib/livekit/room-options";

interface VideoRoomProps {
  /**
   * The room is resolved server-side from this id. It is deliberately not a
   * prop: accepting a client-supplied roomName is what let any account mint a
   * publish-capable token for an arbitrary room (SEC-03).
   */
  sessionId: string;
  sessionMode?: "video" | "audio";
  sessionTitle?: string;
  isHost?: boolean;
  isRecording?: boolean;
  isRecordingBusy?: boolean;
  onToggleRecording?: () => void;
  onLeave?: () => void;
  onEndSession?: () => void;
}

/**
 * AudioUnlocker - Resumes suspended AudioContexts on the first user interaction.
 */
function AudioUnlocker() {
  const hasUnlocked = useRef(false);

  useEffect(() => {
    const resumeAudio = async () => {
      if (hasUnlocked.current) return;
      hasUnlocked.current = true;

      try {
        // @ts-expect-error webkitAudioContext is not in types
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          if (ctx.state === "suspended") {
            await ctx.resume();
          }
        }
      } catch (e) {
        console.error("[LiveKit] Failed to resume AudioContext:", e);
      }
    };

    // Listen for ANY user interaction to unlock audio
    const events = ["click", "touchstart", "keydown"] as const;
    events.forEach((evt) => document.addEventListener(evt, resumeAudio, { once: true }));

    return () => {
      events.forEach((evt) => document.removeEventListener(evt, resumeAudio));
    };
  }, []);

  return null;
}

/**
 * What went wrong fetching the token, stored as a discriminant rather than as
 * an already-translated string.
 *
 * Holding the translated text here would mean calling `t()` inside the fetch
 * effect, which would put the translator in that effect's dependency array —
 * and that is what made the room reconnect forever. See the effect below.
 */
type TokenError = { type: "server"; message: string } | { type: "tokenError" | "unknownError" };

export function VideoRoom({
  sessionId,
  sessionMode = "video",
  sessionTitle,
  isHost = false,
  isRecording = false,
  isRecordingBusy = false,
  onToggleRecording,
  onLeave,
  onEndSession,
}: VideoRoomProps) {
  const t = useTranslations("liveSession.videoRoom");
  const [token, setToken] = useState<string | null>(null);
  const [wsUrl, setWsUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<TokenError | null>(null);

  /**
   * Mint the room token. Exactly once per session — the identity of this effect
   * decides whether the call below stays connected or is torn down and rebuilt.
   *
   * This used to depend on `[sessionId, t]`. `t` is memoised against the
   * next-intl context value, which is rebuilt from a freshly deserialised
   * `messages` object every time the RSC payload for the route is refreshed —
   * something a Server Action can trigger, and this effect calls one. So `t`
   * changed identity, the effect re-ran, `setLoading(true)` swapped the tree
   * below for the spinner, `<LiveKitRoom>` unmounted, `@livekit/components-react`
   * disconnected the room on unmount, and the whole thing remounted with a new
   * token and a new `Room` — which issued the Server Action again. That is the
   * reconnect loop: disconnect, unpublish, connect, publish, repeat.
   *
   * Nothing translated may enter this array. Errors are kept as discriminants
   * and translated at render time instead.
   */
  useEffect(() => {
    let cancelled = false;

    async function getToken() {
      try {
        setLoading(true);
        setError(null);
        const result = await joinSession(sessionId);

        if (cancelled) return;

        if (!result.success || !("access" in result) || !result.access) {
          const serverMessage = "error" in result ? result.error : undefined;
          setError(
            serverMessage ? { type: "server", message: serverMessage } : { type: "tokenError" }
          );
          return;
        }

        setToken(result.access.token);
        setWsUrl(result.access.wsUrl);
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof Error ? { type: "server", message: err.message } : { type: "unknownError" }
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    getToken();

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  /**
   * Stable identities for the three room callbacks.
   *
   * `useLiveKitRoom` lists `onError` in the dependency array of the effect that
   * calls `room.connect()`, and `onError`/`onDisconnected`/`onMediaDeviceFailure`
   * in the one that binds its RoomEvent listeners. Passing inline arrows re-ran
   * both on every single render — that is the `already connected to room …`
   * line repeating in the console, and a listener rebind for every render on
   * top of it.
   */
  const handleDisconnected = useCallback(() => {
    onLeave?.();
  }, [onLeave]);

  const handleError = useCallback((err: Error) => {
    console.error("[LiveKit] Error:", err);
  }, []);

  const handleMediaDeviceFailure = useCallback((failure?: MediaDeviceFailure) => {
    console.error("[LiveKit] Media device failure:", failure);
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (error || !token || !wsUrl) {
    const message =
      error === null ? t("missingConfig") : error.type === "server" ? error.message : t(error.type);

    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950 text-red-500">
        <AlertCircle className="mr-2 h-5 w-5" />
        {message}
      </div>
    );
  }

  return (
    <div className="h-screen">
      <LiveKitRoom
        token={token}
        serverUrl={wsUrl}
        connect={true}
        // adaptiveStream + dynacast. Without them this room ran on
        // livekit-client's defaults, which pull the 720p layer for every tile
        // regardless of its rendered size. See lib/livekit/room-options.ts.
        options={ROOM_OPTIONS}
        video={sessionMode === "video"}
        audio={true}
        onDisconnected={handleDisconnected}
        onError={handleError}
        onMediaDeviceFailure={handleMediaDeviceFailure}
        className="flex h-full flex-col"
      >
        <VideoRoomUI
          sessionId={sessionId}
          sessionMode={sessionMode}
          sessionTitle={sessionTitle}
          isHost={isHost}
          isRecording={isRecording}
          isRecordingBusy={isRecordingBusy}
          onToggleRecording={onToggleRecording}
          onLeave={onLeave}
          onEndSession={onEndSession}
        />
        <RoomAudioRenderer />
        <AudioUnlocker />
      </LiveKitRoom>
    </div>
  );
}
