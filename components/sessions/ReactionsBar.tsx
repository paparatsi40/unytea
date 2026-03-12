"use client";

import { useRoomContext } from "@livekit/components-react";
import { Button } from "@/components/ui/button";

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
    <div className="flex items-center gap-1 rounded-lg border border-zinc-200 bg-white p-1 shadow-sm">
      {REACTIONS.map((reaction) => (
        <Button
          key={reaction.label}
          onClick={() => sendReaction(reaction.emoji, reaction.label)}
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-lg hover:bg-zinc-100"
          title={reaction.label}
        >
          <span className="sr-only">{reaction.label}</span>
          {reaction.emoji}
        </Button>
      ))}
    </div>
  );
}
