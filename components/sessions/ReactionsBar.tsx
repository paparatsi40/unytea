"use client";

import { useTranslations } from "next-intl";

const REACTIONS = [
  { emoji: "👍", label: "thumbsup" },
  { emoji: "❤️", label: "heart" },
  { emoji: "🔥", label: "fire" },
  { emoji: "🎉", label: "party" },
  { emoji: "👏", label: "clap" },
];

interface ReactionsBarProps {
  /**
   * Send one. Owned by `useSessionDataChannel`, which is the room's single
   * door to the data channel.
   *
   * This component used to reach for `useRoomContext()` and publish on its own,
   * which put a second, slightly different publish path in the product — and it
   * was the one that quietly stopped working, because it had its own idea of
   * when the transport was usable. There is one path now.
   */
  onReact: (emoji: string, label: string) => void;
}

export function ReactionsBar({ onReact }: ReactionsBarProps) {
  const t = useTranslations("liveSession.reactionsBar");

  return (
    <div className="flex items-center gap-1">
      {REACTIONS.map((reaction) => (
        <button
          key={reaction.label}
          onClick={() => onReact(reaction.emoji, reaction.label)}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 text-lg transition-all hover:scale-110 hover:bg-zinc-200"
          title={t(reaction.label)}
        >
          <span className="sr-only">{t(reaction.label)}</span>
          {reaction.emoji}
        </button>
      ))}
    </div>
  );
}
