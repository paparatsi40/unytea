"use client";

import { useRoomContext } from "@livekit/components-react";

const REACTIONS = [
  { emoji: "👍", label: "thumbsup" },
  { emoji: "❤️", label: "heart" },
  { emoji: "🔥", label: "fire" },
  { emoji: "🎉", label: "party" },
  { emoji: "👏", label: "clap" },
];

export function ReactionsBar() {
  const room = useRoomContext();

  const sendReaction = async (emoji: string, label: string) => {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(
        JSON.stringify({
          type: "reaction",
          emoji,
          label,
          from: room.localParticipant.identity,
          timestamp: Date.now(),
        })
      );

      await room.localParticipant.publishData(data, { reliable: true });
    } catch (error) {
      console.error("Failed to send reaction:", error);
    }
  };

  return (
    <div className="flex items-center gap-1">
      {REACTIONS.map((reaction) => (
        <button
          key={reaction.label}
          onClick={() => sendReaction(reaction.emoji, reaction.label)}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 text-lg transition-all hover:bg-zinc-200 hover:scale-110"
          title={reaction.label}
        >
          <span className="sr-only">{reaction.label}</span>
          {reaction.emoji}
        </button>
      ))}
    </div>
  );
}
