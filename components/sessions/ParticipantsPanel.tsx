"use client";

import { useParticipants, useSpeakingParticipants } from "@livekit/components-react";
import { Video, Mic, MicOff, VideoOff, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function ParticipantsPanel() {
  const participants = useParticipants();
  const speakingParticipants = useSpeakingParticipants();

  const isSpeaking = (identity: string) => {
    return speakingParticipants.some((p) => p.identity === identity);
  };

  return (
    <div className="flex h-full flex-col bg-zinc-900">
      {/* List */}
      <div className="flex-1 overflow-y-auto p-3">
        {participants.map((participant) => {
          const speaking = isSpeaking(participant.identity);

          return (
            <div
              key={participant.sid}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200",
                speaking
                  ? "bg-zinc-800/80 ring-1 ring-green-500/30"
                  : "hover:bg-zinc-800/50"
              )}
            >
              {/* Avatar with speaking indicator */}
              <div
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-full text-sm font-medium text-white transition-all duration-200",
                  speaking
                    ? "bg-gradient-to-br from-green-500 to-green-600 ring-2 ring-green-400/50"
                    : "bg-gradient-to-br from-purple-500 to-pink-500"
                )}
              >
                {(participant.name || participant.identity).charAt(0).toUpperCase()}
              </div>

              {/* Info */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium text-zinc-100">
                    {participant.name || participant.identity}
                  </p>
                  {speaking && (
                    <span className="flex items-center gap-1 rounded-full bg-green-500/20 px-2 py-0.5 text-xs font-medium text-green-400">
                      <Volume2 className="h-3 w-3" />
                      speaking
                    </span>
                  )}
                </div>
              </div>

              {/* Status indicators */}
              <div className="flex items-center gap-1.5">
                {participant.isCameraEnabled ? (
                  <Video className="h-4 w-4 text-green-500" />
                ) : (
                  <VideoOff className="h-4 w-4 text-zinc-600" />
                )}

                {participant.isMicrophoneEnabled ? (
                  <Mic className="h-4 w-4 text-green-500" />
                ) : (
                  <MicOff className="h-4 w-4 text-zinc-600" />
                )}
              </div>
            </div>
          );
        })}

        {participants.length === 0 && (
          <div className="flex h-32 items-center justify-center text-center">
            <p className="text-sm text-zinc-500">No participants yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
