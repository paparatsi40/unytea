"use client";

import { useParticipants } from "@livekit/components-react";
import { Video, Mic, MicOff, VideoOff } from "lucide-react";

export function ParticipantsPanel() {
  const participants = useParticipants();

  return (
    <div className="flex h-full flex-col rounded-xl border border-zinc-200 bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
        <span className="text-sm font-semibold text-zinc-900">Participants</span>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-2">
        {participants.map((participant) => (
          <div
            key={participant.sid}
            className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-zinc-50"
          >
            {/* Avatar */}
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-sm font-medium text-white">
              {(participant.name || participant.identity).charAt(0).toUpperCase()}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium text-zinc-900">
                {participant.name || participant.identity}
              </p>
            </div>

            {/* Status indicators */}
            <div className="flex items-center gap-1.5">
              {participant.isCameraEnabled ? (
                <Video className="h-4 w-4 text-green-500" />
              ) : (
                <VideoOff className="h-4 w-4 text-zinc-400" />
              )}
              
              {participant.isMicrophoneEnabled ? (
                <Mic className="h-4 w-4 text-green-500" />
              ) : (
                <MicOff className="h-4 w-4 text-zinc-400" />
              )}
            </div>
          </div>
        ))}

        {participants.length === 0 && (
          <div className="flex h-32 items-center justify-center text-center">
            <p className="text-sm text-zinc-500">No participants yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
